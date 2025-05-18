import { describe, it, expect, vi, beforeEach } from "vitest";
import UserDao from "@/dao/user.dao";
import AuthService from "@/services/auth.service";
import * as passwordUtils from "@/utils/password";
import * as jwtUtils from "@/utils/jwt";
import { ErrorMessages } from "@/constants";
import {
  BadRequestError,
  UnauthorizedError,
  NotFoundError,
} from "@/errors/error-types";
import type { User } from "@prisma/client";

vi.mock("@/dao/user.dao");

describe("AuthService", () => {
  const mockUser: User = {
    id: "user-123",
    email: "test@example.com",
    password: "hashedPassword123",
    name: "Test User",
    createdAt: new Date(),
    updatedAt: new Date(),
    favoriteBookIds: [],
    favoriteAuthorIds: [],
  };

  const registerDto = {
    email: "test@example.com",
    password: "StrongP@ssw0rd",
    name: "Test User",
  };

  const loginDto = {
    email: "test@example.com",
    password: "StrongP@ssw0rd",
  };

  beforeEach(() => {
    vi.clearAllMocks();

    vi.spyOn(passwordUtils, "omitPasswordFromResult").mockImplementation(
      (user) => {
        const { password, ...rest } = user;
        return rest as Omit<User, "password">;
      }
    );

    vi.spyOn(passwordUtils, "hashPassword").mockResolvedValue(
      "hashedPassword123"
    );
    vi.spyOn(passwordUtils, "comparePassword");
    vi.spyOn(jwtUtils, "signToken").mockReturnValue("mock.jwt.token");
  });

  describe("registerUser", () => {
    it("should throw error if email already exists", async () => {
      vi.mocked(UserDao.findUserByEmail).mockResolvedValue(mockUser);

      await expect(AuthService.registerUser(registerDto)).rejects.toThrow(
        new BadRequestError(ErrorMessages.EMAIL_ALREADY_EXISTS)
      );
      expect(UserDao.findUserByEmail).toHaveBeenCalledWith(registerDto.email);
    });

    it("should register a new user successfully", async () => {
      vi.mocked(UserDao.findUserByEmail).mockResolvedValue(null);
      vi.mocked(UserDao.createUser).mockResolvedValue(mockUser);

      const result = await AuthService.registerUser(registerDto);

      expect(UserDao.findUserByEmail).toHaveBeenCalledWith(registerDto.email);
      expect(passwordUtils.hashPassword).toHaveBeenCalledWith(
        registerDto.password
      );
      expect(UserDao.createUser).toHaveBeenCalledWith(
        expect.objectContaining({
          email: registerDto.email,
          name: registerDto.name,
          passwordHash: "hashedPassword123",
        })
      );
      expect(jwtUtils.signToken).toHaveBeenCalledWith({
        userId: mockUser.id,
        email: mockUser.email,
      });
      expect(result.user).not.toHaveProperty("password");
      expect(result.token).toBe("mock.jwt.token");
    });
  });

  describe("loginUser", () => {
    it("should throw error if user doesn't exist", async () => {
      vi.mocked(UserDao.findUserByEmail).mockResolvedValue(null);

      await expect(AuthService.loginUser(loginDto)).rejects.toThrow(
        new UnauthorizedError(ErrorMessages.INVALID_CREDENTIALS)
      );
      expect(UserDao.findUserByEmail).toHaveBeenCalledWith(loginDto.email);
    });

    it("should throw error if password doesn't match", async () => {
      vi.mocked(UserDao.findUserByEmail).mockResolvedValue(mockUser);
      vi.mocked(passwordUtils.comparePassword).mockResolvedValue(false);

      await expect(AuthService.loginUser(loginDto)).rejects.toThrow(
        new UnauthorizedError(ErrorMessages.INVALID_CREDENTIALS)
      );
      expect(passwordUtils.comparePassword).toHaveBeenCalledWith(
        loginDto.password,
        mockUser.password
      );
    });

    it("should login user successfully with correct credentials", async () => {
      vi.mocked(UserDao.findUserByEmail).mockResolvedValue(mockUser);
      vi.mocked(passwordUtils.comparePassword).mockResolvedValue(true);

      const result = await AuthService.loginUser(loginDto);

      expect(UserDao.findUserByEmail).toHaveBeenCalledWith(loginDto.email);
      expect(passwordUtils.comparePassword).toHaveBeenCalledWith(
        loginDto.password,
        mockUser.password
      );
      expect(jwtUtils.signToken).toHaveBeenCalledWith({
        userId: mockUser.id,
        email: mockUser.email,
      });
      expect(result.user).not.toHaveProperty("password");
      expect(result.token).toBe("mock.jwt.token");
    });
  });

  describe("getMe", () => {
    it("should throw error if user doesn't exist", async () => {
      vi.mocked(UserDao.findUserById).mockResolvedValue(null);

      await expect(AuthService.getMe("nonexistent-id")).rejects.toThrow(
        new NotFoundError(ErrorMessages.USER_FOR_TOKEN_NOT_FOUND)
      );
      expect(UserDao.findUserById).toHaveBeenCalledWith("nonexistent-id");
    });

    it("should return user data without password", async () => {
      vi.mocked(UserDao.findUserById).mockResolvedValue(mockUser);

      const result = await AuthService.getMe(mockUser.id);

      expect(UserDao.findUserById).toHaveBeenCalledWith(mockUser.id);
      expect(passwordUtils.omitPasswordFromResult).toHaveBeenCalledWith(
        mockUser
      );
      expect(result).not.toHaveProperty("password");
    });
  });
});
