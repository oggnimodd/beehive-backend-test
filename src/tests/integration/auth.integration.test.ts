import { ErrorMessages } from "@/constants";
import { prisma } from "@/db/client";
import { faker } from "@faker-js/faker";
import { StatusCodes } from "http-status-codes";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { request } from "./helpers/api.helper";
import {
  type TestUser,
  createUniqueTestUser,
  deleteTestUser,
} from "./helpers/user.helper";

describe("Auth API Endpoints - /api/v1/auth", () => {
  const createdUserIds: string[] = [];

  beforeEach(async () => {});

  afterEach(async () => {
    for (const userId of createdUserIds) {
      await deleteTestUser(userId);
    }
    createdUserIds.length = 0;
  });

  describe("POST /api/v1/auth/register", () => {
    it("should register a new user successfully with valid data and return core user fields + token", async () => {
      const rawUniqueEmail = faker.internet.email({
        firstName: "Register",
        lastName: `Success${Date.now()}`,
      });
      const password = "Password123!";
      const name = "Register Success User";

      const response = await request
        .post("/api/v1/auth/register")
        .send({ name, email: rawUniqueEmail, password });

      expect(response.status).toBe(StatusCodes.CREATED);
      expect(response.body.status).toBe("success");
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.user.email).toBe(rawUniqueEmail.toLowerCase());
      expect(response.body.data.user.name).toBe(name);
      expect(response.body.data.user.password).toBeUndefined();

      if (response.body.data.user.id) {
        createdUserIds.push(response.body.data.user.id);
      }
    });

    it("should fail to register if email already exists", async () => {
      const existingUser = await createUniqueTestUser({
        name: "ExistingUserForRegisterTest",
      });
      createdUserIds.push(existingUser.id);

      const response = await request.post("/api/v1/auth/register").send({
        name: "Another User",
        email: existingUser.email,
        password: "Password123!",
      });

      expect(response.status).toBe(StatusCodes.BAD_REQUEST);
      expect(response.body.message).toBe(ErrorMessages.EMAIL_ALREADY_EXISTS);
    });

    it("should fail to register with invalid email format", async () => {
      const response = await request.post("/api/v1/auth/register").send({
        name: "Invalid Email User",
        email: "invalid-email",
        password: "Password123!",
      });

      expect(response.status).toBe(StatusCodes.BAD_REQUEST);
      expect(response.body.message).toBe(ErrorMessages.VALIDATION_ERROR);
      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: "body.email",
            message: "Invalid email address format.",
          }),
        ])
      );
    });

    it("should fail to register with a password that is too short", async () => {
      const uniqueEmail = faker.internet.email({
        firstName: "ShortPass",
        lastName: `User${Date.now()}`,
      });
      const response = await request
        .post("/api/v1/auth/register")
        .send({ name: "Short Pass", email: uniqueEmail, password: "123" });

      expect(response.status).toBe(StatusCodes.BAD_REQUEST);
      expect(response.body.message).toBe(ErrorMessages.VALIDATION_ERROR);
      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: "body.password",
            message: ErrorMessages.PASSWORD_TOO_SHORT(8),
          }),
        ])
      );
    });

    it("should fail to register if password does not meet complexity requirements (e.g., missing uppercase)", async () => {
      const uniqueEmail = faker.internet.email({
        firstName: "WeakPass",
        lastName: `User${Date.now()}`,
      });
      const response = await request.post("/api/v1/auth/register").send({
        name: "Weak Pass",
        email: uniqueEmail,
        password: "password123!",
      });

      expect(response.status).toBe(StatusCodes.BAD_REQUEST);
      expect(response.body.message).toBe(ErrorMessages.VALIDATION_ERROR);
      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: "body.password",
            message:
              "Password must include at least one uppercase letter (A-Z).",
          }),
        ])
      );
    });

    it("should fail to register if required fields are missing (e.g., email)", async () => {
      const response = await request
        .post("/api/v1/auth/register")
        .send({ name: "Missing Email", password: "Password123!" });

      expect(response.status).toBe(StatusCodes.BAD_REQUEST);
      expect(response.body.message).toBe(ErrorMessages.VALIDATION_ERROR);
      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: "body.email",
            message: "Email is required.",
          }),
        ])
      );
    });

    it("should fail to register if required fields are missing (e.g., password)", async () => {
      const uniqueEmail = faker.internet.email({
        firstName: "MissingPass",
        lastName: `User${Date.now()}`,
      });
      const response = await request
        .post("/api/v1/auth/register")
        .send({ name: "Missing Password", email: uniqueEmail });

      expect(response.status).toBe(StatusCodes.BAD_REQUEST);
      expect(response.body.message).toBe(ErrorMessages.VALIDATION_ERROR);
      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: "body.password",
            message: "Password is required.",
          }),
        ])
      );
    });
  });

  describe("POST /api/v1/auth/login", () => {
    let loginTestUser: TestUser;
    const loginTestPassword = "PasswordForLogin123!";

    beforeEach(async () => {
      loginTestUser = await createUniqueTestUser({
        name: `LoginTestUser_${Date.now()}`,
        password: loginTestPassword,
      });
      createdUserIds.push(loginTestUser.id);
    });

    it("should login an existing user successfully and return core user fields + token", async () => {
      const response = await request
        .post("/api/v1/auth/login")
        .send({ email: loginTestUser.email, password: loginTestPassword });

      expect(response.status).toBe(StatusCodes.OK);
      expect(response.body.status).toBe("success");
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.user.id).toBe(loginTestUser.id);
      expect(response.body.data.user.email).toBe(
        loginTestUser.email.toLowerCase()
      );
      expect(response.body.data.user.password).toBeUndefined();
    });

    it("should fail to login with an incorrect password", async () => {
      const response = await request
        .post("/api/v1/auth/login")
        .send({ email: loginTestUser.email, password: "WrongPassword!" });

      expect(response.status).toBe(StatusCodes.UNAUTHORIZED);
      expect(response.body.message).toBe(ErrorMessages.INVALID_CREDENTIALS);
    });

    it("should fail to login with a non-existent email", async () => {
      const nonExistentEmail = faker.internet.email({
        firstName: "NonExistentLogin",
        lastName: `User${Date.now()}`,
      });
      const response = await request
        .post("/api/v1/auth/login")
        .send({ email: nonExistentEmail, password: "Password123!" });

      expect(response.status).toBe(StatusCodes.UNAUTHORIZED);
      expect(response.body.message).toBe(ErrorMessages.INVALID_CREDENTIALS);
    });

    it("should fail to login if password is not provided", async () => {
      const response = await request
        .post("/api/v1/auth/login")
        .send({ email: loginTestUser.email });

      expect(response.status).toBe(StatusCodes.BAD_REQUEST);
      expect(response.body.message).toBe(ErrorMessages.VALIDATION_ERROR);
      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: "body.password",
            message: "Password is required.",
          }),
        ])
      );
    });

    it("should fail to login if email is not provided", async () => {
      const response = await request
        .post("/api/v1/auth/login")
        .send({ password: loginTestPassword });

      expect(response.status).toBe(StatusCodes.BAD_REQUEST);
      expect(response.body.message).toBe(ErrorMessages.VALIDATION_ERROR);
      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: "body.email",
            message: "Email is required.",
          }),
        ])
      );
    });
  });

  describe("GET /api/v1/auth/me", () => {
    let meTestUser: TestUser;

    beforeEach(async () => {
      meTestUser = await createUniqueTestUser({
        name: `MeTestUser_${Date.now()}`,
      });
      createdUserIds.push(meTestUser.id);
    });

    it("should retrieve current user details with a valid token", async () => {
      const response = await request
        .get("/api/v1/auth/me")
        .set("Authorization", `Bearer ${meTestUser.token}`);

      expect(response.status).toBe(StatusCodes.OK);
      expect(response.body.status).toBe("success");
      expect(response.body.data.id).toBe(meTestUser.id);
      expect(response.body.data.email).toBe(meTestUser.email.toLowerCase());
      expect(response.body.data.name).toBe(meTestUser.name);
      expect(response.body.data.password).toBeUndefined();
    });

    it("should fail if no token is provided", async () => {
      const response = await request.get("/api/v1/auth/me");

      expect(response.status).toBe(StatusCodes.UNAUTHORIZED);
      expect(response.body.message).toBe(ErrorMessages.UNAUTHENTICATED);
    });

    it("should fail if token is invalid or malformed (e.g., not a JWT)", async () => {
      const response = await request
        .get("/api/v1/auth/me")
        .set("Authorization", "Bearer an-invalid-or-malformed-token");

      expect(response.status).toBe(StatusCodes.UNAUTHORIZED);
      expect(response.body.message).toBe(ErrorMessages.TOKEN_INVALID);
    });

    it("should fail if token is correctly formatted JWT but signed with wrong secret or expired", async () => {
      const bogusJwt =
        "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";
      const response = await request
        .get("/api/v1/auth/me")
        .set("Authorization", bogusJwt);

      expect(response.status).toBe(StatusCodes.UNAUTHORIZED);
      expect(response.body.message).toBe(ErrorMessages.TOKEN_INVALID);
    });

    it("should fail if token is valid but the user has been deleted from DB", async () => {
      const validTokenFromDeletedUser = meTestUser.token;

      const userInDbBeforeDelete = await prisma.user.findUnique({
        where: { id: meTestUser.id },
      });
      expect(
        userInDbBeforeDelete,
        `User ${meTestUser.id} (email: ${meTestUser.email}) must exist before manual deletion`
      ).not.toBeNull();

      await prisma.user.delete({ where: { id: meTestUser.id } });
      const indexToRemove = createdUserIds.indexOf(meTestUser.id);
      if (indexToRemove > -1) {
        createdUserIds.splice(indexToRemove, 1);
      }

      const userInDbAfterDelete = await prisma.user.findUnique({
        where: { id: meTestUser.id },
      });
      expect(
        userInDbAfterDelete,
        `User ${meTestUser.id} must NOT exist after manual deletion`
      ).toBeNull();

      const response = await request
        .get("/api/v1/auth/me")
        .set("Authorization", `Bearer ${validTokenFromDeletedUser}`);

      expect(response.status).toBe(StatusCodes.UNAUTHORIZED);
      expect(response.body.message).toBe(
        ErrorMessages.USER_FOR_TOKEN_NOT_FOUND
      );
    });
  });
});
