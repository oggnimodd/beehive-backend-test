import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import supertest from "supertest";
import app from "@/main";
import { prisma } from "@/db/client";
import { clearDatabase, disconnectPrisma } from "./helpers/db.helpers";
import { StatusCodes } from "http-status-codes";
import { ErrorMessages } from "@/constants";
import { hashPassword } from "@/utils/password";
import { API_PREFIX } from "./helpers/constants.helper";

const request = supertest(app);

describe(`Auth API Endpoints - ${API_PREFIX}/auth`, () => {
  const testUserCredentials = {
    email: "test.user.integration@example.com",
    password: "PasswordForTest123!",
    name: "Integration Tester",
  };

  let authToken: string | null = null;
  let createdUserId: string | null = null;

  beforeAll(async () => {});

  afterAll(async () => {
    await clearDatabase();
    await disconnectPrisma();
  });

  beforeEach(async () => {
    await clearDatabase();
    authToken = null;
    createdUserId = null;
  });

  describe(`POST ${API_PREFIX}/auth/register`, () => {
    it("should register a new user successfully with valid data and return core user fields + token", async () => {
      const response = await request
        .post(`${API_PREFIX}/auth/register`)
        .send(testUserCredentials);

      expect(response.status).toBe(StatusCodes.CREATED);
      expect(response.body.status).toBe("success");
      expect(response.body.message).toBe(
        "User registered successfully. Please log in."
      );

      const userInResponse = response.body.data.user;
      expect(userInResponse.email).toBe(
        testUserCredentials.email.toLowerCase()
      );
      expect(userInResponse.name).toBe(testUserCredentials.name);
      expect(userInResponse).toHaveProperty("id");
      expect(userInResponse).toHaveProperty("createdAt");
      expect(userInResponse).toHaveProperty("updatedAt");
      expect(userInResponse).not.toHaveProperty("password");
      expect(userInResponse).not.toHaveProperty("favoriteBookIds");
      expect(userInResponse).not.toHaveProperty("favoriteAuthorIds");

      expect(response.body.data.token).toBeDefined();
      expect(typeof response.body.data.token).toBe("string");

      const dbUser = await prisma.user.findUnique({
        where: { email: testUserCredentials.email.toLowerCase() },
      });
      expect(dbUser).not.toBeNull();
      expect(dbUser?.name).toBe(testUserCredentials.name);
      expect(dbUser?.favoriteBookIds).toEqual([]);
      expect(dbUser?.favoriteAuthorIds).toEqual([]);
    });

    it("should fail to register if email already exists", async () => {
      await request
        .post(`${API_PREFIX}/auth/register`)
        .send(testUserCredentials);
      const response = await request.post(`${API_PREFIX}/auth/register`).send({
        ...testUserCredentials,
        name: "Another Name",
        password: "NewPassword123!",
      });

      expect(response.status).toBe(StatusCodes.BAD_REQUEST);
      expect(response.body.message).toBe(ErrorMessages.EMAIL_ALREADY_EXISTS);
    });

    it("should fail to register with invalid email format", async () => {
      const response = await request
        .post(`${API_PREFIX}/auth/register`)
        .send({ ...testUserCredentials, email: "not-an-email" });

      expect(response.status).toBe(StatusCodes.BAD_REQUEST);
      expect(response.body.errors).toBeInstanceOf(Array);
      const emailError = response.body.errors.find(
        (e: any) => e.field === "body.email"
      );
      expect(emailError?.message).toBe("Invalid email address format.");
    });

    it("should fail to register with a password that is too short", async () => {
      const response = await request
        .post(`${API_PREFIX}/auth/register`)
        .send({ ...testUserCredentials, password: "short" });

      expect(response.status).toBe(StatusCodes.BAD_REQUEST);
      expect(response.body.errors).toBeInstanceOf(Array);
      const passwordError = response.body.errors.find(
        (e: any) => e.field === "body.password"
      );
      expect(passwordError?.message).toBe(ErrorMessages.PASSWORD_TOO_SHORT(8));
    });

    it("should fail to register if required fields are missing (e.g., email)", async () => {
      const { email, ...missingEmailCredentials } = testUserCredentials;
      const response = await request
        .post(`${API_PREFIX}/auth/register`)
        .send(missingEmailCredentials);

      expect(response.status).toBe(StatusCodes.BAD_REQUEST);
      expect(response.body.errors).toBeInstanceOf(Array);
      const emailError = response.body.errors.find(
        (e: any) => e.field === "body.email"
      );
      expect(emailError?.message).toBe("Email is required.");
    });
  });

  describe(`POST ${API_PREFIX}/auth/login`, () => {
    beforeEach(async () => {
      const hashedPassword = await hashPassword(testUserCredentials.password);
      await prisma.user.create({
        data: {
          email: testUserCredentials.email.toLowerCase(),
          password: hashedPassword,
          name: testUserCredentials.name,
        },
      });
    });

    it("should login an existing user successfully and return core user fields + token", async () => {
      const response = await request.post(`${API_PREFIX}/auth/login`).send({
        email: testUserCredentials.email,
        password: testUserCredentials.password,
      });

      expect(response.status).toBe(StatusCodes.OK);
      expect(response.body.status).toBe("success");
      expect(response.body.message).toBe("Login successful.");

      const userInResponse = response.body.data.user;
      expect(userInResponse.email).toBe(
        testUserCredentials.email.toLowerCase()
      );
      expect(userInResponse).toHaveProperty("id");
      expect(userInResponse).toHaveProperty("createdAt");
      expect(userInResponse).toHaveProperty("updatedAt");
      expect(userInResponse).not.toHaveProperty("password");
      expect(userInResponse).not.toHaveProperty("favoriteBookIds");
      expect(userInResponse).not.toHaveProperty("favoriteAuthorIds");

      expect(response.body.data.token).toBeDefined();
      authToken = response.body.data.token;
      createdUserId = userInResponse.id;
    });

    it("should fail to login with an incorrect password", async () => {
      const response = await request.post(`${API_PREFIX}/auth/login`).send({
        email: testUserCredentials.email,
        password: "WrongPassword123!",
      });
      expect(response.status).toBe(StatusCodes.UNAUTHORIZED);
      expect(response.body.message).toBe(ErrorMessages.INVALID_CREDENTIALS);
    });

    it("should fail to login with a non-existent email", async () => {
      const response = await request.post(`${API_PREFIX}/auth/login`).send({
        email: "nosuchuser@integration.com",
        password: testUserCredentials.password,
      });
      expect(response.status).toBe(StatusCodes.UNAUTHORIZED);
      expect(response.body.message).toBe(ErrorMessages.INVALID_CREDENTIALS);
    });

    it("should fail to login if password is not provided", async () => {
      const response = await request
        .post(`${API_PREFIX}/auth/login`)
        .send({ email: testUserCredentials.email });

      expect(response.status).toBe(StatusCodes.BAD_REQUEST);
      expect(response.body.errors).toBeInstanceOf(Array);
      const passwordError = response.body.errors.find(
        (e: any) => e.field === "body.password"
      );
      expect(passwordError?.message).toBe("Password is required.");
    });
  });

  describe(`GET ${API_PREFIX}/auth/me`, () => {
    beforeEach(async () => {
      const registerResponse = await request
        .post(`${API_PREFIX}/auth/register`)
        .send(testUserCredentials);
      createdUserId = registerResponse.body.data.user.id;

      const loginResponse = await request
        .post(`${API_PREFIX}/auth/login`)
        .send({
          email: testUserCredentials.email,
          password: testUserCredentials.password,
        });
      authToken = loginResponse.body.data.token;
    });

    it("should retrieve current user details (including empty favorite arrays by default from DB) with a valid token", async () => {
      expect(authToken).not.toBeNull();
      const response = await request
        .get(`${API_PREFIX}/auth/me`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(StatusCodes.OK);
      expect(response.body.status).toBe("success");

      const userInResponse = response.body.data;
      expect(userInResponse.id).toBe(createdUserId);
      expect(userInResponse.email).toBe(
        testUserCredentials.email.toLowerCase()
      );
      expect(userInResponse.name).toBe(testUserCredentials.name);
      expect(userInResponse).toHaveProperty("createdAt");
      expect(userInResponse).toHaveProperty("updatedAt");
      expect(userInResponse).not.toHaveProperty("password");

      expect(userInResponse).toHaveProperty("favoriteBookIds");
      expect(userInResponse.favoriteBookIds).toEqual([]);

      expect(userInResponse).toHaveProperty("favoriteAuthorIds");
      expect(userInResponse.favoriteAuthorIds).toEqual([]);
    });

    it("should fail if no token is provided", async () => {
      const response = await request.get(`${API_PREFIX}/auth/me`);
      expect(response.status).toBe(StatusCodes.UNAUTHORIZED);
      expect(response.body.message).toBe(ErrorMessages.UNAUTHENTICATED);
    });

    it("should fail if token is invalid or malformed", async () => {
      const response = await request
        .get(`${API_PREFIX}/auth/me`)
        .set("Authorization", "Bearer aninvalidtoken123.nonsense.token");
      expect(response.status).toBe(StatusCodes.UNAUTHORIZED);
      expect(response.body.message).toBe(ErrorMessages.TOKEN_INVALID);
    });

    it("should fail if token is valid but the user has been deleted from DB", async () => {
      expect(authToken).not.toBeNull();
      expect(createdUserId).not.toBeNull();

      await prisma.user.delete({ where: { id: createdUserId! } });

      const response = await request
        .get(`${API_PREFIX}/auth/me`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(StatusCodes.UNAUTHORIZED);
      expect(response.body.message).toBe(
        ErrorMessages.USER_FOR_TOKEN_NOT_FOUND
      );
    });
  });
});
