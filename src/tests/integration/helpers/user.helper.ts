import { prisma } from "@/db/client";
import { faker } from "@faker-js/faker";
import { StatusCodes } from "http-status-codes";
import { request } from "./api.helper";

export interface TestUser {
  id: string;
  email: string;
  name: string;
  token: string;
}

export async function createUniqueTestUser(userData?: {
  name?: string;
  email?: string;
  password?: string;
}): Promise<TestUser> {
  const randomSuffix = faker.string.alphanumeric(6);
  const name = userData?.name || faker.person.fullName();
  const email =
    userData?.email ||
    faker.internet.email({
      firstName: (name.split(" ")[0] || "").replace(/[^a-zA-Z0-9]/g, ""),
      lastName: `${randomSuffix}${Date.now()}`,
    });
  const password = userData?.password || "ValidPassword123!";

  const registerResponse = await request
    .post("/api/v1/auth/register")
    .send({ name, email, password });

  if (registerResponse.status !== StatusCodes.CREATED) {
    console.error(
      `Failed to register user ${email} in helper:`,
      registerResponse.body
    );
    throw new Error(
      `Helper: Failed to register user ${email}: ${
        registerResponse.status
      } ${JSON.stringify(registerResponse.body)}`
    );
  }

  const loginResponse = await request
    .post("/api/v1/auth/login")
    .send({ email, password });

  if (loginResponse.status !== StatusCodes.OK) {
    console.error(
      `Failed to login user ${email} in helper:`,
      loginResponse.body
    );
    throw new Error(
      `Helper: Failed to login user ${email}: ${
        loginResponse.status
      } ${JSON.stringify(loginResponse.body)}`
    );
  }

  const responseData = loginResponse.body.data;
  if (!responseData || !responseData.user || !responseData.token) {
    console.error(
      "User data or token missing from login response in helper:",
      loginResponse.body
    );
    throw new Error("Helper: User data or token missing from login response.");
  }

  return {
    id: responseData.user.id,
    email: responseData.user.email,
    name: responseData.user.name,
    token: responseData.token,
  };
}

export async function deleteTestUser(userId: string) {
  try {
    await prisma.user.delete({ where: { id: userId } });
  } catch (error) {}
}
