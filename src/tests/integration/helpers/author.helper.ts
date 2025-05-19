import { faker } from "@faker-js/faker";
import { StatusCodes } from "http-status-codes";
import { request } from "./api.helper";
import type { Author } from "@prisma/client";

export interface CreateAuthorPayloadHelper {
  name: string;
  bio?: string;
}

export async function createUniqueAuthorViaApi(
  userToken: string,
  authorDataInput?: Partial<CreateAuthorPayloadHelper>
) {
  const name =
    authorDataInput?.name ||
    `${faker.person.fullName()} (AuthorHelper ${Date.now()}${faker.string.alphanumeric(
      3
    )})`;
  const bio = authorDataInput?.bio || faker.lorem.paragraph();

  const apiPayload: { name: string; bio?: string } = { name, bio };

  const response = await request
    .post("/api/v1/authors")
    .set("Authorization", `Bearer ${userToken}`)
    .send(apiPayload);

  if (response.status !== StatusCodes.CREATED) {
    console.error(
      `API Author creation for "${name}" failed with token ${userToken.substring(0, 10)}...:`,
      response.body
    );
    throw new Error(
      `Helper: API Author creation for "${name}" failed with status ${
        response.status
      }: ${JSON.stringify(response.body)}`
    );
  }
  if (!response.body.data) {
    throw new Error(
      `Helper: API Author creation for "${name}" succeeded but response.body.data is missing.`
    );
  }
  return response.body.data as Author;
}
