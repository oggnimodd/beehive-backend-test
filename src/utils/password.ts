import bcrypt from "bcryptjs";
import { config } from "@/config";

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
