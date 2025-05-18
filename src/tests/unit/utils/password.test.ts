import { describe, it, expect } from "vitest";
import bcrypt from "bcryptjs";
import {
  hashPassword,
  comparePassword,
  omitPasswordFromResult,
} from "@/utils/password";
import { config } from "@/config";
import type { User } from "@prisma/client";

describe("Password Utilities", () => {
  const plainPassword = "StrongPassword123!";

  describe("hashPassword", () => {
    it("should hash the password using bcrypt with configured salt rounds", async () => {
      const result = await hashPassword(plainPassword);

      const isValid = await bcrypt.compare(plainPassword, result);
      expect(isValid).toBe(true);
    });

    it("should throw an error if password is empty", async () => {
      await expect(hashPassword("")).rejects.toThrow(
        "Password cannot be empty for hashing."
      );
    });
  });

  describe("comparePassword", () => {
    it("should correctly compare a password with its hash", async () => {
      const hashedPassword = await bcrypt.hash(
        plainPassword,
        config.bcryptSaltRounds
      );

      const result = await comparePassword(plainPassword, hashedPassword);
      expect(result).toBe(true);

      const wrongResult = await comparePassword(
        "WrongPassword123!",
        hashedPassword
      );
      expect(wrongResult).toBe(false);
    });

    it("should return false if plain password is empty", async () => {
      const hashedPassword = await bcrypt.hash(
        plainPassword,
        config.bcryptSaltRounds
      );
      const result = await comparePassword("", hashedPassword);
      expect(result).toBe(false);
    });

    it("should return false if hashed password is empty", async () => {
      const result = await comparePassword(plainPassword, "");
      expect(result).toBe(false);
    });
  });

  describe("omitPasswordFromResult", () => {
    it("should remove the password field from a user object", () => {
      const userWithPassword = {
        id: "1",
        email: "test@example.com",
        password: "hashedpassword",
        name: "Test User",
        createdAt: new Date(),
        updatedAt: new Date(),
        favoriteBookIds: [],
        favoriteAuthorIds: [],
      } as User;

      const userWithoutPassword = omitPasswordFromResult(userWithPassword);
      expect(userWithoutPassword).not.toHaveProperty("password");
      expect(userWithoutPassword).toHaveProperty("id", "1");
      expect(userWithoutPassword).toHaveProperty("email", "test@example.com");
    });

    it("should return the same object if password field does not exist", () => {
      const userWithoutPasswordInput = {
        id: "1",
        email: "test@example.com",
        name: "Test User",
        createdAt: new Date(),
        updatedAt: new Date(),
        favoriteBookIds: [],
        favoriteAuthorIds: [],
      } as Omit<User, "password"> as User;

      const result = omitPasswordFromResult(userWithoutPasswordInput);
      expect(result).toEqual(userWithoutPasswordInput);
      expect(result).not.toHaveProperty("password");
    });
  });
});
