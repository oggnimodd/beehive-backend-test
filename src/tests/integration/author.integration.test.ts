import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { StatusCodes } from "http-status-codes";
import { faker } from "@faker-js/faker";
import { request } from "./helpers/api.helper";
import {
  createUniqueTestUser,
  type TestUser,
  deleteTestUser,
} from "./helpers/user.helper";
import {
  createUniqueAuthorViaApi,
  type CreateAuthorPayloadHelper,
} from "./helpers/author.helper";
import type { Author } from "@prisma/client";
import { prisma } from "@/db/client";
import { ErrorMessages } from "@/constants";

describe("Author API Endpoints (/api/v1/authors) (Strict Ownership for Favorites)", () => {
  let userA: TestUser;
  let userB: TestUser;

  let authorA1: Author;
  let authorA2: Author;

  let authorB1: Author;

  const userIdsToClean: string[] = [];
  let authorIdsToClean: string[] = [];

  beforeEach(async () => {
    authorIdsToClean = [];
    userIdsToClean.length = 0;

    userA = await createUniqueTestUser({ name: "UserA_AuthorsMain" });
    userB = await createUniqueTestUser({ name: "UserB_AuthorsMain" });
    userIdsToClean.push(userA.id, userB.id);

    authorA1 = await createUniqueAuthorViaApi(userA.token, {
      name: `AuthorA1_${faker.person.lastName()}_${Date.now()}`,
    });
    authorA2 = await createUniqueAuthorViaApi(userA.token, {
      name: `AuthorA2_${faker.person.lastName()}_${Date.now()}`,
    });
    authorB1 = await createUniqueAuthorViaApi(userB.token, {
      name: `AuthorB1_${faker.person.lastName()}_${Date.now()}`,
    });
    authorIdsToClean.push(authorA1.id, authorA2.id, authorB1.id);
  });

  afterEach(async () => {
    const uniqueAuthorIds = [...new Set(authorIdsToClean)];
    if (uniqueAuthorIds.length > 0) {
      try {
        await prisma.author.deleteMany({
          where: { id: { in: uniqueAuthorIds } },
        });
      } catch (e) {}
    }
    authorIdsToClean.length = 0;

    const uniqueUserIds = [...new Set(userIdsToClean)];
    for (const userId of uniqueUserIds) {
      try {
        await prisma.user.update({
          where: { id: userId },
          data: {
            favoriteAuthorIds: { set: [] },
            favoriteAuthors: { set: [] },
          },
        });
      } catch (e) {}
    }
    for (const userId of uniqueUserIds) {
      await deleteTestUser(userId);
    }
    userIdsToClean.length = 0;
  });

  describe("POST /api/v1/authors", () => {
    it("should allow User A to create a new author", async () => {
      const payload: CreateAuthorPayloadHelper = {
        name: `NewAuthorByA_${faker.person.lastName()}`,
        bio: faker.lorem.sentence(),
      };
      const response = await request
        .post("/api/v1/authors")
        .set("Authorization", `Bearer ${userA.token}`)
        .send(payload);

      expect(response.status).toBe(StatusCodes.CREATED);
      expect(response.body.status).toBe("success");
      expect(response.body.data.name).toBe(payload.name);
      expect(response.body.data.bio).toBe(payload.bio);
      expect(response.body.data.createdById).toBe(userA.id);
      authorIdsToClean.push(response.body.data.id);
    });

    it("should fail to create an author if not authenticated", async () => {
      const payload: CreateAuthorPayloadHelper = { name: "AuthFailAuthor" };
      const response = await request.post("/api/v1/authors").send(payload);
      expect(response.status).toBe(StatusCodes.UNAUTHORIZED);
    });

    it("should fail to create an author with invalid data (e.g., name too short)", async () => {
      const payload = { name: "A", bio: "Short bio" };
      const response = await request
        .post("/api/v1/authors")
        .set("Authorization", `Bearer ${userA.token}`)
        .send(payload);
      expect(response.status).toBe(StatusCodes.BAD_REQUEST);
      expect(response.body.message).toBe(ErrorMessages.VALIDATION_ERROR);
      expect(response.body.errors[0].field).toBe("body.name");
    });
  });

  describe("GET /api/v1/authors", () => {
    it("should return only User A's authors when User A requests", async () => {
      const response = await request
        .get("/api/v1/authors")
        .set("Authorization", `Bearer ${userA.token}`);

      expect(response.status).toBe(StatusCodes.OK);
      expect(response.body.status).toBe("success");
      expect(response.body.data.length).toBe(2);
      const returnedAuthorIds = response.body.data.map((a: Author) => a.id);
      expect(returnedAuthorIds).toContain(authorA1.id);
      expect(returnedAuthorIds).toContain(authorA2.id);
      expect(returnedAuthorIds).not.toContain(authorB1.id);
      response.body.data.forEach((author: any) => {
        expect(author.createdById).toBe(userA.id);
        expect(author.isFavorite).toBe(false);
      });
    });

    it("should return User A's authors with correct isFavorite status after User A favorites one", async () => {
      await request
        .post(`/api/v1/authors/${authorA1.id}/favorite`)
        .set("Authorization", `Bearer ${userA.token}`);

      const response = await request
        .get("/api/v1/authors")
        .set("Authorization", `Bearer ${userA.token}`);

      expect(response.status).toBe(StatusCodes.OK);
      const authors = response.body.data as (Author & {
        isFavorite: boolean;
      })[];

      const fetchedAuthorA1 = authors.find((a) => a.id === authorA1.id);
      expect(fetchedAuthorA1).toBeDefined();
      expect(fetchedAuthorA1?.isFavorite).toBe(true);

      const fetchedAuthorA2 = authors.find((a) => a.id === authorA2.id);
      expect(fetchedAuthorA2).toBeDefined();
      expect(fetchedAuthorA2?.isFavorite).toBe(false);
    });

    it("should support pagination for User A's authors", async () => {
      const response = await request
        .get("/api/v1/authors?page=1&limit=1")
        .set("Authorization", `Bearer ${userA.token}`);
      expect(response.status).toBe(StatusCodes.OK);
      expect(response.body.data.length).toBe(1);
      expect(response.body.meta.totalItems).toBe(2);
      expect(response.body.meta.currentPage).toBe(1);
      expect(response.body.meta.itemsPerPage).toBe(1);
    });

    it("should support search for User A's authors", async () => {
      const searchTerm = authorA1.name.substring(0, 10);
      const response = await request
        .get(`/api/v1/authors?search=${searchTerm}`)
        .set("Authorization", `Bearer ${userA.token}`);
      expect(response.status).toBe(StatusCodes.OK);
      expect(response.body.data.length).toBeGreaterThanOrEqual(1);
      expect(
        response.body.data.some(
          (a: Author) => a.id === authorA1.id && a.name.includes(searchTerm)
        )
      ).toBe(true);
      expect(
        response.body.data.every((a: Author) => a.createdById === userA.id)
      ).toBe(true);
    });

    it("should fail if not authenticated", async () => {
      const response = await request.get("/api/v1/authors");
      expect(response.status).toBe(StatusCodes.UNAUTHORIZED);
    });
  });

  describe("GET /api/v1/authors/:id", () => {
    it("should allow User A to get their own author (authorA1) and show isFavorite:false initially", async () => {
      const response = await request
        .get(`/api/v1/authors/${authorA1.id}`)
        .set("Authorization", `Bearer ${userA.token}`);
      expect(response.status).toBe(StatusCodes.OK);
      expect(response.body.data.id).toBe(authorA1.id);
      expect(response.body.data.createdById).toBe(userA.id);
      expect(response.body.data.isFavorite).toBe(false);
    });

    it("should show isFavorite:true for an owned author after User A favorites it", async () => {
      await request
        .post(`/api/v1/authors/${authorA1.id}/favorite`)
        .set("Authorization", `Bearer ${userA.token}`);

      const response = await request
        .get(`/api/v1/authors/${authorA1.id}`)
        .set("Authorization", `Bearer ${userA.token}`);
      expect(response.status).toBe(StatusCodes.OK);
      expect(response.body.data.isFavorite).toBe(true);
    });

    it("should forbid User A from getting User B's author (authorB1)", async () => {
      const response = await request
        .get(`/api/v1/authors/${authorB1.id}`)
        .set("Authorization", `Bearer ${userA.token}`);
      expect(response.status).toBe(StatusCodes.FORBIDDEN);
      expect(response.body.message).toBe(ErrorMessages.UNAUTHORIZED_ACTION);
    });

    it("should return 404 if author ID does not exist (when requested by owner)", async () => {
      const nonExistentId = faker.database.mongodbObjectId();
      const response = await request
        .get(`/api/v1/authors/${nonExistentId}`)
        .set("Authorization", `Bearer ${userA.token}`);
      expect(response.status).toBe(StatusCodes.NOT_FOUND);
    });

    it("should fail if not authenticated", async () => {
      const response = await request.get(`/api/v1/authors/${authorA1.id}`);
      expect(response.status).toBe(StatusCodes.UNAUTHORIZED);
    });
  });

  describe("PATCH /api/v1/authors/:id", () => {
    const updatePayload = { name: "Updated Author Name by User A" };

    it("should allow User A to update their own author (authorA1)", async () => {
      const response = await request
        .patch(`/api/v1/authors/${authorA1.id}`)
        .set("Authorization", `Bearer ${userA.token}`)
        .send(updatePayload);
      expect(response.status).toBe(StatusCodes.OK);
      expect(response.body.data.id).toBe(authorA1.id);
      expect(response.body.data.name).toBe(updatePayload.name);
      expect(response.body.data.createdById).toBe(userA.id);
    });

    it("should forbid User A from updating User B's author (authorB1)", async () => {
      const response = await request
        .patch(`/api/v1/authors/${authorB1.id}`)
        .set("Authorization", `Bearer ${userA.token}`)
        .send(updatePayload);
      expect(response.status).toBe(StatusCodes.FORBIDDEN);
      expect(response.body.message).toBe(ErrorMessages.UNAUTHORIZED_ACTION);
    });

    it("should return 404 if trying to update a non-existent author (by owner)", async () => {
      const nonExistentId = faker.database.mongodbObjectId();
      const response = await request
        .patch(`/api/v1/authors/${nonExistentId}`)
        .set("Authorization", `Bearer ${userA.token}`)
        .send(updatePayload);
      expect(response.status).toBe(StatusCodes.NOT_FOUND);
    });

    it("should fail if not authenticated", async () => {
      const response = await request
        .patch(`/api/v1/authors/${authorA1.id}`)
        .send(updatePayload);
      expect(response.status).toBe(StatusCodes.UNAUTHORIZED);
    });

    it("should fail with validation error for invalid update data (e.g. name too short)", async () => {
      const invalidUpdatePayload = { name: "X" };
      const response = await request
        .patch(`/api/v1/authors/${authorA1.id}`)
        .set("Authorization", `Bearer ${userA.token}`)
        .send(invalidUpdatePayload);
      expect(response.status).toBe(StatusCodes.BAD_REQUEST);
      expect(response.body.errors[0].field).toBe("body.name");
    });
  });

  describe("DELETE /api/v1/authors/:id", () => {
    it("should allow User A to delete their own author (authorA1)", async () => {
      const response = await request
        .delete(`/api/v1/authors/${authorA1.id}`)
        .set("Authorization", `Bearer ${userA.token}`);
      expect(response.status).toBe(StatusCodes.OK);
      expect(response.body.message).toContain("Author deleted successfully");

      const getResponse = await request
        .get(`/api/v1/authors/${authorA1.id}`)
        .set("Authorization", `Bearer ${userA.token}`);
      expect(getResponse.status).toBe(StatusCodes.NOT_FOUND);
      authorIdsToClean = authorIdsToClean.filter((id) => id !== authorA1.id);
    });

    it("should forbid User A from deleting User B's author (authorB1)", async () => {
      const response = await request
        .delete(`/api/v1/authors/${authorB1.id}`)
        .set("Authorization", `Bearer ${userA.token}`);
      expect(response.status).toBe(StatusCodes.FORBIDDEN);
      expect(response.body.message).toBe(ErrorMessages.UNAUTHORIZED_ACTION);
    });

    it("should return 404 if trying to delete a non-existent author (by owner)", async () => {
      const nonExistentId = faker.database.mongodbObjectId();
      const response = await request
        .delete(`/api/v1/authors/${nonExistentId}`)
        .set("Authorization", `Bearer ${userA.token}`);
      expect(response.status).toBe(StatusCodes.NOT_FOUND);
    });

    it("should fail if not authenticated", async () => {
      const response = await request.delete(`/api/v1/authors/${authorA2.id}`);
      expect(response.status).toBe(StatusCodes.UNAUTHORIZED);
    });
  });

  describe("POST /api/v1/authors/:id/favorite (Basic Check on Author Route)", () => {
    it("should allow User A to favorite their own author (authorA1)", async () => {
      const response = await request
        .post(`/api/v1/authors/${authorA1.id}/favorite`)
        .set("Authorization", `Bearer ${userA.token}`);
      expect(response.status).toBe(StatusCodes.OK);
    });

    it("should forbid User A from favoriting User B's author (authorB1)", async () => {
      const response = await request
        .post(`/api/v1/authors/${authorB1.id}/favorite`)
        .set("Authorization", `Bearer ${userA.token}`);
      expect(response.status).toBe(StatusCodes.FORBIDDEN);
    });
  });

  describe("DELETE /api/v1/authors/:id/favorite (Basic Check on Author Route)", () => {
    beforeEach(async () => {
      await request
        .post(`/api/v1/authors/${authorA1.id}/favorite`)
        .set("Authorization", `Bearer ${userA.token}`);
    });
    it("should allow User A to unfavorite their own author (authorA1)", async () => {
      const response = await request
        .delete(`/api/v1/authors/${authorA1.id}/favorite`)
        .set("Authorization", `Bearer ${userA.token}`);
      expect(response.status).toBe(StatusCodes.OK);
    });

    it("should forbid User A from unfavoriting User B's author (authorB1)", async () => {
      const response = await request
        .delete(`/api/v1/authors/${authorB1.id}/favorite`)
        .set("Authorization", `Bearer ${userA.token}`);
      expect(response.status).toBe(StatusCodes.FORBIDDEN);
    });
  });
});
