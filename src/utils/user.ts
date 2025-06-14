import type { UserOutput } from "@/dto/auth.dto";
import type { User } from "@prisma/client";
import { omitPasswordFromResult } from "./password";

// Simple user object generator, to filter out other irrelevant fields when returning login and logout response
export const generateSimpleUserObject = (user: User): UserOutput => {
  const { id, email, name, createdAt, updatedAt } =
    omitPasswordFromResult(user);
  return { id, email, name: name ?? "", createdAt, updatedAt };
};
