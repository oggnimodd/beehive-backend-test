import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { StatusCodes } from "http-status-codes";
import { faker } from "@faker-js/faker";
import { request } from "./helpers/api.helper";
import {
  createUniqueTestUser,
  type TestUser,
  deleteTestUser,
} from "./helpers/user.helper";
import { prisma } from "@/db/client";
import { ErrorMessages } from "@/constants";
import { createUniqueAuthorViaApi } from "./helpers/author.helper";
import type { Author } from "@prisma/client";

describe("Author API Endpoints - /api/v1/authors", () => {
  let testUser: TestUser;
  let anotherUser: TestUser;

  const userIdsToClean: string[] = [];
  const authorIdsToClean: string[] = [];

  beforeEach(async () => {
    testUser = await createUniqueTestUser({
      name: `TestUser_AuthorSuite_${Date.now()}`,
    });
    anotherUser = await createUniqueTestUser({
      name: `AnotherUser_AuthorSuite_${Date.now()}`,
    });
    userIdsToClean.push(testUser.id, anotherUser.id);
  });

  afterEach(async () => {
    if (authorIdsToClean.length > 0) {
      try {
        await prisma.author.deleteMany({
          where: { id: { in: authorIdsToClean } },
        });
      } catch (e) {}
      authorIdsToClean.length = 0;
    }
    for (const userId of userIdsToClean) {
      await deleteTestUser(userId);
    }
    userIdsToClean.length = 0;
  });

  describe("POST /api/v1/authors (Create Author)", () => {
    it("should CREATE an author successfully with valid data when authenticated", async () => {
      const authorData = {
        name: `New Author ${faker.person.fullName()}`,
        bio: faker.lorem.paragraph(),
      };
      const response = await request
        .post("/api/v1/authors")
        .set("Authorization", `Bearer ${testUser.token}`)
        .send(authorData);

      expect(response.status).toBe(StatusCodes.CREATED);
      expect(response.body.status).toBe("success");
      expect(response.body.data.name).toBe(authorData.name);
      expect(response.body.data.bio).toBe(authorData.bio);
      expect(response.body.data.createdById).toBe(testUser.id);
      authorIdsToClean.push(response.body.data.id);
    });

    it("should FAIL to create an author if not authenticated", async () => {
      const authorData = { name: "Unauth Author" };
      const response = await request.post("/api/v1/authors").send(authorData);
      expect(response.status).toBe(StatusCodes.UNAUTHORIZED);
      expect(response.body.message).toBe(ErrorMessages.UNAUTHENTICATED);
    });

    it("should FAIL to create an author with missing required 'name'", async () => {
      const authorData = { bio: "Some bio" };
      const response = await request
        .post("/api/v1/authors")
        .set("Authorization", `Bearer ${testUser.token}`)
        .send(authorData);
      expect(response.status).toBe(StatusCodes.BAD_REQUEST);
      expect(response.body.message).toBe(ErrorMessages.VALIDATION_ERROR);
      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: "body.name" }),
        ])
      );
    });
  });

  describe("GET /api/v1/authors (List Authors)", () => {
    it("should GET a list of ONLY the authenticated user's authors", async () => {
      const author1TestUser = await createUniqueAuthorViaApi(testUser.token, {
        name: "TU Author 1",
      });
      const author2TestUser = await createUniqueAuthorViaApi(testUser.token, {
        name: "TU Author 2",
      });
      authorIdsToClean.push(author1TestUser.id, author2TestUser.id);

      const authorAnotherUser = await createUniqueAuthorViaApi(
        anotherUser.token,
        { name: "AU Author 1" }
      );
      authorIdsToClean.push(authorAnotherUser.id);

      const response = await request
        .get("/api/v1/authors")
        .set("Authorization", `Bearer ${testUser.token}`);

      expect(response.status).toBe(StatusCodes.OK);
      expect(response.body.status).toBe("success");
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBe(2);
      response.body.data.forEach((author: Author) => {
        expect(author.createdById).toBe(testUser.id);
      });
      expect(response.body.meta.totalItems).toBe(2);
    });

    it("should GET an empty list if authenticated user has no authors", async () => {
      const response = await request
        .get("/api/v1/authors")
        .set("Authorization", `Bearer ${testUser.token}`);
      expect(response.status).toBe(StatusCodes.OK);
      expect(response.body.data).toEqual([]);
      expect(response.body.meta.totalItems).toBe(0);
    });

    it("should FAIL to get authors if not authenticated", async () => {
      const response = await request.get("/api/v1/authors");
      expect(response.status).toBe(StatusCodes.UNAUTHORIZED);
    });
  });

  describe("GET /api/v1/authors/:id (Get Specific Author)", () => {
    let ownedAuthor: Author;
    let unownedAuthor: Author;

    beforeEach(async () => {
      ownedAuthor = await createUniqueAuthorViaApi(testUser.token, {
        name: "Owned Author",
      });
      unownedAuthor = await createUniqueAuthorViaApi(anotherUser.token, {
        name: "Unowned Author",
      });
      authorIdsToClean.push(ownedAuthor.id, unownedAuthor.id);
    });

    it("should GET a specific author successfully if authenticated and owner", async () => {
      const response = await request
        .get(`/api/v1/authors/${ownedAuthor.id}`)
        .set("Authorization", `Bearer ${testUser.token}`);
      expect(response.status).toBe(StatusCodes.OK);
      expect(response.body.data.id).toBe(ownedAuthor.id);
      expect(response.body.data.name).toBe(ownedAuthor.name);
    });

    it("should FAIL to get a specific author if not authenticated", async () => {
      const response = await request.get(`/api/v1/authors/${ownedAuthor.id}`);
      expect(response.status).toBe(StatusCodes.UNAUTHORIZED);
    });

    it("should FAIL with 403 FORBIDDEN if trying to get an author not owned by authenticated user", async () => {
      const response = await request
        .get(`/api/v1/authors/${unownedAuthor.id}`)
        .set("Authorization", `Bearer ${testUser.token}`);
      expect(response.status).toBe(StatusCodes.FORBIDDEN);
      expect(response.body.message).toBe(ErrorMessages.UNAUTHORIZED_ACTION);
    });

    it("should FAIL with 404 NOT FOUND if author ID does not exist (authenticated)", async () => {
      const nonExistentId = faker.database.mongodbObjectId();
      const response = await request
        .get(`/api/v1/authors/${nonExistentId}`)
        .set("Authorization", `Bearer ${testUser.token}`);
      expect(response.status).toBe(StatusCodes.NOT_FOUND);
      expect(response.body.message).toBe(ErrorMessages.AUTHOR_NOT_FOUND);
    });

    it("should FAIL with 400 BAD REQUEST if author ID is invalid format (authenticated)", async () => {
      const invalidId = "invalid-mongo-id";
      const response = await request
        .get(`/api/v1/authors/${invalidId}`)
        .set("Authorization", `Bearer ${testUser.token}`);
      expect(response.status).toBe(StatusCodes.BAD_REQUEST);
      expect(response.body.message).toBe(ErrorMessages.VALIDATION_ERROR);
      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: "params.id",
            message: ErrorMessages.INVALID_OBJECT_ID,
          }),
        ])
      );
    });
  });

  describe("PATCH /api/v1/authors/:id (Update Author)", () => {
    let ownedAuthor: Author;
    let unownedAuthor: Author;

    beforeEach(async () => {
      ownedAuthor = await createUniqueAuthorViaApi(testUser.token, {
        name: "Author to Update",
      });
      unownedAuthor = await createUniqueAuthorViaApi(anotherUser.token, {
        name: "Another's Author",
      });
      authorIdsToClean.push(ownedAuthor.id, unownedAuthor.id);
    });

    it("should UPDATE an author successfully if authenticated and owner", async () => {
      const updateData = { name: "Updated Name", bio: "Updated Bio" };
      const response = await request
        .patch(`/api/v1/authors/${ownedAuthor.id}`)
        .set("Authorization", `Bearer ${testUser.token}`)
        .send(updateData);
      expect(response.status).toBe(StatusCodes.OK);
      expect(response.body.data.name).toBe(updateData.name);
      expect(response.body.data.bio).toBe(updateData.bio);
    });

    it("should FAIL to update if not authenticated", async () => {
      const response = await request
        .patch(`/api/v1/authors/${ownedAuthor.id}`)
        .send({ name: "Attempt Update Unauth" });
      expect(response.status).toBe(StatusCodes.UNAUTHORIZED);
    });

    it("should FAIL with 403 FORBIDDEN if trying to update an author not owned", async () => {
      const response = await request
        .patch(`/api/v1/authors/${unownedAuthor.id}`)
        .set("Authorization", `Bearer ${testUser.token}`)
        .send({ name: "Forbidden Update" });
      expect(response.status).toBe(StatusCodes.FORBIDDEN);
    });

    it("should FAIL with 404 NOT FOUND if author ID to update does not exist (authenticated)", async () => {
      const nonExistentId = faker.database.mongodbObjectId();
      const response = await request
        .patch(`/api/v1/authors/${nonExistentId}`)
        .set("Authorization", `Bearer ${testUser.token}`)
        .send({ name: "Update NonExistent" });
      expect(response.status).toBe(StatusCodes.NOT_FOUND);
    });

    it("should FAIL with 400 BAD REQUEST if no update data is provided", async () => {
      const response = await request
        .patch(`/api/v1/authors/${ownedAuthor.id}`)
        .set("Authorization", `Bearer ${testUser.token}`)
        .send({});
      expect(response.status).toBe(StatusCodes.BAD_REQUEST);
      expect(response.body.message).toBe(ErrorMessages.VALIDATION_ERROR);
      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: "body",
            message: ErrorMessages.NO_UPDATE_DATA,
          }),
        ])
      );
    });
  });

  describe("DELETE /api/v1/authors/:id (Delete Author)", () => {
    let ownedAuthorForDelete: Author;
    let unownedAuthorForDelete: Author;

    beforeEach(async () => {
      ownedAuthorForDelete = await createUniqueAuthorViaApi(testUser.token, {
        name: "Author For Deletion",
      });
      unownedAuthorForDelete = await createUniqueAuthorViaApi(
        anotherUser.token,
        { name: "Another's Author For Deletion" }
      );
      authorIdsToClean.push(ownedAuthorForDelete.id, unownedAuthorForDelete.id);
    });

    it("should DELETE an author successfully if authenticated and owner", async () => {
      const response = await request
        .delete(`/api/v1/authors/${ownedAuthorForDelete.id}`)
        .set("Authorization", `Bearer ${testUser.token}`);
      expect(response.status).toBe(StatusCodes.OK);
      expect(response.body.message).toContain("Author deleted successfully");

      const checkResponse = await request
        .get(`/api/v1/authors/${ownedAuthorForDelete.id}`)
        .set("Authorization", `Bearer ${testUser.token}`);
      expect(checkResponse.status).toBe(StatusCodes.NOT_FOUND);

      authorIdsToClean.splice(
        authorIdsToClean.indexOf(ownedAuthorForDelete.id),
        1
      );
    });

    it("should FAIL to delete if not authenticated", async () => {
      const response = await request.delete(
        `/api/v1/authors/${ownedAuthorForDelete.id}`
      );
      expect(response.status).toBe(StatusCodes.UNAUTHORIZED);
    });

    it("should FAIL with 403 FORBIDDEN if trying to delete an author not owned", async () => {
      const response = await request
        .delete(`/api/v1/authors/${unownedAuthorForDelete.id}`)
        .set("Authorization", `Bearer ${testUser.token}`);
      expect(response.status).toBe(StatusCodes.FORBIDDEN);
    });

    it("should FAIL with 404 NOT FOUND if author ID to delete does not exist (authenticated)", async () => {
      const nonExistentId = faker.database.mongodbObjectId();
      const response = await request
        .delete(`/api/v1/authors/${nonExistentId}`)
        .set("Authorization", `Bearer ${testUser.token}`);
      expect(response.status).toBe(StatusCodes.NOT_FOUND);
    });
  });
});
