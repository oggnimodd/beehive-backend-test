import { config } from "@/config";
import { ErrorMessages } from "@/constants";
import UserDao from "@/dao/user.dao";
import type { LoginUserDto, RegisterUserDto } from "@/dto/auth.dto";
import {
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
} from "@/errors/error-types";
import AuthService from "@/services/auth.service";
import { hashPassword } from "@/utils/password";
import type { User } from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/dao/user.dao");

const testUserPassword = "Password123!";

const mockUserFromDb: User = {
  id: "user-id-for-testing",
  email: "test@example.com",
  password: "this will be replaced by actual hash or mocked hash",
  name: "Test User From DB",
  createdAt: new Date("2023-01-01T10:00:00.000Z"),
  updatedAt: new Date("2023-01-01T11:00:00.000Z"),
  favoriteBookIds: ["book-fav-1"],
  favoriteAuthorIds: ["author-fav-1"],
};

const mockRegisterDto: RegisterUserDto = {
  email: "new.register@example.com",
  password: testUserPassword,
  name: "New Registered User",
};

const mockLoginDto: LoginUserDto = {
  email: mockUserFromDb.email,
  password: testUserPassword,
};

const originalJwtSecret = config.jwt.secret;

describe("AuthService", () => {
  beforeEach(() => {
    vi.mocked(UserDao.createUser).mockReset();
    vi.mocked(UserDao.findUserByEmail).mockReset();
    vi.mocked(UserDao.findUserById).mockReset();

    if (
      !config.jwt.secret ||
      config.jwt.secret ===
        "your-super-strong-and-long-jwt-secret-key-at-least-32-chars"
    ) {
      (config.jwt as any).secret =
        "test-super-secret-key-for-unit-tests-min-32-chars";
    }
  });

  afterEach(() => {
    (config.jwt as any).secret = originalJwtSecret;
    vi.restoreAllMocks();
  });

  describe("registerUser", () => {
    it("should register a new user, hash password, create user, sign token, and return simplified user object", async () => {
      const actualHashedPassword = await hashPassword(mockRegisterDto.password);
      const dbUserToCreate = {
        id: "generated-user-id-register",
        email: mockRegisterDto.email,
        password: actualHashedPassword,
        name: mockRegisterDto.name || null,
        createdAt: new Date(),
        updatedAt: new Date(),
        favoriteAuthorIds: [],
        favoriteBookIds: [],
      };

      vi.mocked(UserDao.findUserByEmail).mockResolvedValue(null);
      vi.mocked(UserDao.createUser).mockResolvedValue(dbUserToCreate);

      const result = await AuthService.registerUser(mockRegisterDto);

      expect(UserDao.findUserByEmail).toHaveBeenCalledWith(
        mockRegisterDto.email
      );

      expect(UserDao.createUser).toHaveBeenCalledWith({
        email: mockRegisterDto.email,
        name: mockRegisterDto.name,
        password: mockRegisterDto.password,
        passwordHash: expect.any(String),
      });

      expect(result.user.email).toBe(mockRegisterDto.email);
      expect(result.user.name).toBe(mockRegisterDto.name);
      expect(result.user.id).toBe(dbUserToCreate.id);
      expect(result.user).not.toHaveProperty("password");
      expect(result.user).not.toHaveProperty("favoriteBookIds");
      expect(result.token).toEqual(expect.any(String));
    });

    it("should throw BadRequestError if email already exists", async () => {
      vi.mocked(UserDao.findUserByEmail).mockResolvedValue(mockUserFromDb);

      await expect(
        AuthService.registerUser(mockRegisterDto)
      ).rejects.toThrowError(
        new BadRequestError(ErrorMessages.EMAIL_ALREADY_EXISTS)
      );
      expect(UserDao.createUser).not.toHaveBeenCalled();
    });
  });

  describe("loginUser", () => {
    it("should log in an existing user with correct credentials and return simplified user object", async () => {
      const userForLoginTest = {
        ...mockUserFromDb,
        email: mockLoginDto.email,
        password: await hashPassword(testUserPassword),
      };
      vi.mocked(UserDao.findUserByEmail).mockResolvedValue(userForLoginTest);

      const result = await AuthService.loginUser(mockLoginDto);

      expect(UserDao.findUserByEmail).toHaveBeenCalledWith(mockLoginDto.email);
      expect(result.user.email).toBe(mockLoginDto.email);
      expect(result.user.id).toBe(userForLoginTest.id);
      expect(result.user).not.toHaveProperty("password");
      expect(result.user).not.toHaveProperty("favoriteAuthorIds");
      expect(result.token).toEqual(expect.any(String));
    });

    it("should throw UnauthorizedError if user not found", async () => {
      vi.mocked(UserDao.findUserByEmail).mockResolvedValue(null);

      await expect(AuthService.loginUser(mockLoginDto)).rejects.toThrowError(
        new UnauthorizedError(ErrorMessages.INVALID_CREDENTIALS)
      );
    });

    it("should throw UnauthorizedError if password does not match", async () => {
      const userWithDifferentPassword = {
        ...mockUserFromDb,
        email: mockLoginDto.email,
        password: await hashPassword("ADifferentPassword"),
      };
      vi.mocked(UserDao.findUserByEmail).mockResolvedValue(
        userWithDifferentPassword
      );

      await expect(AuthService.loginUser(mockLoginDto)).rejects.toThrowError(
        new UnauthorizedError(ErrorMessages.INVALID_CREDENTIALS)
      );
    });
  });

  describe("getMe", () => {
    it("should return omitPasswordFromResult for a valid user ID", async () => {
      const userWithFavorites = {
        ...mockUserFromDb,
        id: "getme-user-id",
        favoriteBookIds: ["book101", "book102"],
        favoriteAuthorIds: ["author201"],
      };
      vi.mocked(UserDao.findUserById).mockResolvedValue(userWithFavorites);

      const result = await AuthService.getMe(userWithFavorites.id);

      expect(UserDao.findUserById).toHaveBeenCalledWith(userWithFavorites.id);
      expect(result.id).toBe(userWithFavorites.id);
      expect(result.email).toBe(userWithFavorites.email);
      expect(result).not.toHaveProperty("password");
      expect(result).toHaveProperty(
        "favoriteBookIds",
        userWithFavorites.favoriteBookIds
      );
      expect(result).toHaveProperty(
        "favoriteAuthorIds",
        userWithFavorites.favoriteAuthorIds
      );
    });

    it("should throw NotFoundError if user not found for getMe", async () => {
      const nonExistentId = "non-id-for-getme";
      vi.mocked(UserDao.findUserById).mockResolvedValue(null);

      await expect(AuthService.getMe(nonExistentId)).rejects.toThrowError(
        new NotFoundError(ErrorMessages.USER_FOR_TOKEN_NOT_FOUND)
      );
    });
  });
});
