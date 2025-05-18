import { config } from "@/config";
import type { User } from "@prisma/client";
import bcrypt from "bcryptjs";

export const hashPassword = async (password: string) => {
  // Defensive check
  if (!password) {
    throw new Error("Password cannot be empty for hashing.");
  }
  return bcrypt.hash(password, config.bcryptSaltRounds);
};

export const comparePassword = async (
  password: string,
  hashedPassword: string
) => {
  // Defensive check
  if (!password || !hashedPassword) {
    return false;
  }
  return bcrypt.compare(password, hashedPassword);
};

// We dont want to return the password in the response
export const omitPasswordFromResult = (user: User): Omit<User, "password"> => {
  const { password, ...userWithoutPassword } = user;
  return userWithoutPassword;
};
