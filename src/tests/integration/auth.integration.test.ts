import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { StatusCodes } from "http-status-codes";
import { faker } from "@faker-js/faker";
import { request } from "./helpers/api.helper";
import {
  createUniqueTestUser,
  type TestUser,
  deleteTestUser,
} from "./helpers/user.helper";
import { createUniqueAuthorViaApi } from "./helpers/author.helper";
import type { Author } from "@prisma/client";
import { prisma } from "@/db/client";
import { ErrorMessages } from "@/constants";

describe("Favorite Author API Endpoints", () => {
  let testUser: TestUser;
  let anotherUser: TestUser;
  let authorToFavorite: Author;
  let anotherAuthorToList: Author;

  const userIdsToClean: string[] = [];
  const authorIdsToClean: string[] = [];

  beforeEach(async () => {
    testUser = await createUniqueTestUser({
      name: `FavoriteTestUser_${Date.now()}`,
    });
    anotherUser = await createUniqueTestUser({
      name: `AnotherFavoriteUser_${Date.now()}`,
    });
    userIdsToClean.push(testUser.id, anotherUser.id);

    authorToFavorite = await createUniqueAuthorViaApi(anotherUser.token, {
      name: `AuthorToBeFavorited_${Date.now()}`,
    });
    anotherAuthorToList = await createUniqueAuthorViaApi(anotherUser.token, {
      name: `AnotherGeneralAuthor_${Date.now()}`,
    });
    authorIdsToClean.push(authorToFavorite.id, anotherAuthorToList.id);
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
    for (const userId of userIdsToClean) {
      await deleteTestUser(userId);
    }
    userIdsToClean.length = 0;
  });

  describe("POST /api/v1/authors/:authorId/favorite", () => {
    it("should successfully add an author to favorites for authenticated user", async () => {
      const response = await request
        .post(`/api/v1/authors/${authorToFavorite.id}/favorite`)
        .set("Authorization", `Bearer ${testUser.token}`);

      expect(response.status).toBe(StatusCodes.OK);
      expect(response.body.message).toContain(
        "Author added to favorites successfully"
      );

      const userDb = await prisma.user.findUnique({
        where: { id: testUser.id },
        select: { favoriteAuthorIds: true },
      });
      expect(userDb?.favoriteAuthorIds).toContain(authorToFavorite.id);
    });

    it("should FAIL with 400 if author is already favorited", async () => {
      await request
        .post(`/api/v1/authors/${authorToFavorite.id}/favorite`)
        .set("Authorization", `Bearer ${testUser.token}`);
      const response = await request
        .post(`/api/v1/authors/${authorToFavorite.id}/favorite`)
        .set("Authorization", `Bearer ${testUser.token}`);

      expect(response.status).toBe(StatusCodes.BAD_REQUEST);
      expect(response.body.message).toBe(
        ErrorMessages.ITEM_ALREADY_IN_FAVORITES("Author")
      );
    });

    it("should FAIL with 404 if author to favorite does not exist", async () => {
      const nonExistentAuthorId = faker.database.mongodbObjectId();
      const response = await request
        .post(`/api/v1/authors/${nonExistentAuthorId}/favorite`)
        .set("Authorization", `Bearer ${testUser.token}`);
      expect(response.status).toBe(StatusCodes.NOT_FOUND);
      expect(response.body.message).toBe(ErrorMessages.AUTHOR_NOT_FOUND);
    });

    it("should FAIL if not authenticated", async () => {
      const response = await request.post(
        `/api/v1/authors/${authorToFavorite.id}/favorite`
      );
      expect(response.status).toBe(StatusCodes.UNAUTHORIZED);
    });
  });

  describe("DELETE /api/v1/authors/:authorId/favorite", () => {
    beforeEach(async () => {
      await request
        .post(`/api/v1/authors/${authorToFavorite.id}/favorite`)
        .set("Authorization", `Bearer ${testUser.token}`);
    });

    it("should successfully remove an author from favorites", async () => {
      const response = await request
        .delete(`/api/v1/authors/${authorToFavorite.id}/favorite`)
        .set("Authorization", `Bearer ${testUser.token}`);

      expect(response.status).toBe(StatusCodes.OK);
      expect(response.body.message).toContain(
        "Author removed from favorites successfully"
      );

      const userDb = await prisma.user.findUnique({
        where: { id: testUser.id },
        select: { favoriteAuthorIds: true },
      });
      expect(userDb?.favoriteAuthorIds).not.toContain(authorToFavorite.id);
    });

    it("should FAIL with 400 if trying to remove an author not in favorites", async () => {
      const response = await request
        .delete(`/api/v1/authors/${anotherAuthorToList.id}/favorite`)
        .set("Authorization", `Bearer ${testUser.token}`);

      expect(response.status).toBe(StatusCodes.BAD_REQUEST);
      expect(response.body.message).toBe(
        ErrorMessages.ITEM_NOT_IN_FAVORITES("Author")
      );
    });

    it("should FAIL with 404 if author to remove does not exist", async () => {
      const nonExistentAuthorId = faker.database.mongodbObjectId();
      const response = await request
        .delete(`/api/v1/authors/${nonExistentAuthorId}/favorite`)
        .set("Authorization", `Bearer ${testUser.token}`);
      expect(response.status).toBe(StatusCodes.NOT_FOUND);
    });

    it("should FAIL if not authenticated", async () => {
      const response = await request.delete(
        `/api/v1/authors/${authorToFavorite.id}/favorite`
      );
      expect(response.status).toBe(StatusCodes.UNAUTHORIZED);
    });
  });

  describe("GET /api/v1/favorites/authors", () => {
    let favoritedAuthor1: Author;
    let favoritedAuthor2: Author;

    beforeEach(async () => {
      favoritedAuthor1 = authorToFavorite;
      favoritedAuthor2 = anotherAuthorToList;

      await request
        .post(`/api/v1/authors/${favoritedAuthor1.id}/favorite`)
        .set("Authorization", `Bearer ${testUser.token}`);
      await request
        .post(`/api/v1/authors/${favoritedAuthor2.id}/favorite`)
        .set("Authorization", `Bearer ${testUser.token}`);
    });

    it("should retrieve a paginated list of the user's favorite authors", async () => {
      const response = await request
        .get("/api/v1/favorites/authors?page=1&limit=1")
        .set("Authorization", `Bearer ${testUser.token}`);

      expect(response.status).toBe(StatusCodes.OK);
      expect(response.body.status).toBe("success");
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBe(1);
      expect(response.body.meta.totalItems).toBe(2);
      expect(response.body.meta.currentPage).toBe(1);
      expect(response.body.meta.itemsPerPage).toBe(1);
      expect(response.body.meta.totalPages).toBe(2);
    });

    it("should return an empty list if user has no favorites", async () => {
      await request
        .delete(`/api/v1/authors/${favoritedAuthor1.id}/favorite`)
        .set("Authorization", `Bearer ${testUser.token}`);
      await request
        .delete(`/api/v1/authors/${favoritedAuthor2.id}/favorite`)
        .set("Authorization", `Bearer ${testUser.token}`);

      const response = await request
        .get("/api/v1/favorites/authors")
        .set("Authorization", `Bearer ${testUser.token}`);

      expect(response.status).toBe(StatusCodes.OK);
      expect(response.body.data).toEqual([]);
      expect(response.body.meta.totalItems).toBe(0);
    });

    it("should FAIL if not authenticated", async () => {
      const response = await request.get("/api/v1/favorites/authors");
      expect(response.status).toBe(StatusCodes.UNAUTHORIZED);
    });
  });

  describe("isFavorite flag in GET /api/v1/authors and GET /api/v1/authors/:id", () => {
    let authorCreatedByTestUser: Author;
    let authorCreatedByAnotherUserAndFavoritedByTestUser: Author;
    let authorCreatedByAnotherUserNotFavoritedByTestUser: Author;

    beforeEach(async () => {
      authorCreatedByTestUser = await createUniqueAuthorViaApi(testUser.token, {
        name: "MyOwnAuthorForFavCheck",
      });
      authorCreatedByAnotherUserAndFavoritedByTestUser =
        await createUniqueAuthorViaApi(anotherUser.token, {
          name: "AnotherUserAuthorFavorited",
        });
      authorCreatedByAnotherUserNotFavoritedByTestUser =
        await createUniqueAuthorViaApi(anotherUser.token, {
          name: "AnotherUserAuthorNotFavorited",
        });
      authorIdsToClean.push(
        authorCreatedByTestUser.id,
        authorCreatedByAnotherUserAndFavoritedByTestUser.id,
        authorCreatedByAnotherUserNotFavoritedByTestUser.id
      );

      await request
        .post(`/api/v1/authors/${authorCreatedByTestUser.id}/favorite`)
        .set("Authorization", `Bearer ${testUser.token}`);
      await request
        .post(
          `/api/v1/authors/${authorCreatedByAnotherUserAndFavoritedByTestUser.id}/favorite`
        )
        .set("Authorization", `Bearer ${testUser.token}`);
    });

    it("GET /api/v1/authors should show 'isFavorite' for authors created by the user", async () => {
      const response = await request
        .get("/api/v1/authors")
        .set("Authorization", `Bearer ${testUser.token}`);

      expect(response.status).toBe(StatusCodes.OK);
      const authors = response.body.data as (Author & {
        isFavorite?: boolean;
      })[];

      const myAuthor = authors.find((a) => a.id === authorCreatedByTestUser.id);
      expect(myAuthor).toBeDefined();
      expect(myAuthor?.isFavorite).toBe(true);

      expect(
        authors.find(
          (a) => a.id === authorCreatedByAnotherUserAndFavoritedByTestUser.id
        )
      ).toBeUndefined();
    });

    it("GET /api/v1/authors/:id should show 'isFavorite' for an author owned by the user", async () => {
      const response = await request
        .get(`/api/v1/authors/${authorCreatedByTestUser.id}`)
        .set("Authorization", `Bearer ${testUser.token}`);

      expect(response.status).toBe(StatusCodes.OK);
      expect(response.body.data.id).toBe(authorCreatedByTestUser.id);
      expect(response.body.data.isFavorite).toBe(true);
    });

    it("GET /api/v1/authors/:id should return 403 for non-owned author, even if favorited", async () => {
      const response = await request
        .get(
          `/api/v1/authors/${authorCreatedByAnotherUserAndFavoritedByTestUser.id}`
        )
        .set("Authorization", `Bearer ${testUser.token}`);

      expect(response.status).toBe(StatusCodes.FORBIDDEN);
      expect(response.body.message).toBe(ErrorMessages.UNAUTHORIZED_ACTION);
    });

    it("GET /api/v1/authors/:id for owned but unfavorited author should show isFavorite: false", async () => {
      const myUnfavoritedAuthor = await createUniqueAuthorViaApi(
        testUser.token,
        { name: "MyOwnUnfavorited" }
      );
      authorIdsToClean.push(myUnfavoritedAuthor.id);

      const response = await request
        .get(`/api/v1/authors/${myUnfavoritedAuthor.id}`)
        .set("Authorization", `Bearer ${testUser.token}`);

      expect(response.status).toBe(StatusCodes.OK);
      expect(response.body.data.id).toBe(myUnfavoritedAuthor.id);
      expect(response.body.data.isFavorite).toBe(false);
    });
  });
});
