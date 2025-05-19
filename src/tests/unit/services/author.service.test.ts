import { ErrorMessages } from "@/constants";
import AuthorDao from "@/dao/author.dao";
import type {
  AuthorOutput,
  CreateAuthorDto,
  UpdateAuthorDto,
} from "@/dto/author.dto";
import type { PaginationQueryDto } from "@/dto/shared.dto";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "@/errors/error-types";
import AuthorService from "@/services/author.service";
import type { Author } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/dao/author.dao");

const mockAuthorId = "mockAuthorId123";
const mockUserId = "mockUserId456";
const anotherMockUserId = "anotherUserId789";

const mockAuthorFromDaoBase: Author & { isFavorite?: boolean } = {
  id: mockAuthorId,
  name: "George Orwell",
  bio: "English novelist, essayist, journalist and critic.",
  createdById: mockUserId,
  favoritedByIds: [],
  createdAt: new Date(),
  updatedAt: new Date(),
  isFavorite: false,
};

describe("AuthorService", () => {
  beforeEach(() => {
    vi.mocked(AuthorDao.createAuthor).mockReset();
    vi.mocked(AuthorDao.findAuthorById).mockReset();
    vi.mocked(AuthorDao.findAllAuthors).mockReset();
    vi.mocked(AuthorDao.updateAuthor).mockReset();
    vi.mocked(AuthorDao.deleteAuthor).mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("createAuthor", () => {
    const createDto: CreateAuthorDto = {
      name: "Aldous Huxley",
      bio: "Author of Brave New World.",
    };
    it("should create and return an author", async () => {
      const plainAuthor: Author = {
        id: "newAuthorId",
        name: createDto.name,
        bio: createDto.bio!,
        createdById: mockUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
        favoritedByIds: [],
      };
      vi.mocked(AuthorDao.createAuthor).mockResolvedValue(plainAuthor);
      const result = await AuthorService.createAuthor(createDto, mockUserId);
      expect(AuthorDao.createAuthor).toHaveBeenCalledWith(
        createDto,
        mockUserId
      );
      expect(result).toEqual(plainAuthor);
    });
  });

  describe("getAuthorById", () => {
    it("should return an author with isFavorite status when requestingUserId is provided", async () => {
      const authorFavoritedByRequestingUser = {
        ...mockAuthorFromDaoBase,
        isFavorite: true,
      };
      vi.mocked(AuthorDao.findAuthorById).mockResolvedValue(
        authorFavoritedByRequestingUser
      );

      const result = await AuthorService.getAuthorById(
        mockAuthorId,
        mockUserId
      );

      expect(AuthorDao.findAuthorById).toHaveBeenCalledWith(
        mockAuthorId,
        mockUserId
      );
      expect(result).toEqual(authorFavoritedByRequestingUser);
      expect((result as AuthorOutput).isFavorite).toBe(true);
    });

    it("should return an author with isFavorite:false if not favorited by requestingUserId", async () => {
      const authorNotFavorited = {
        ...mockAuthorFromDaoBase,
        isFavorite: false,
      };
      vi.mocked(AuthorDao.findAuthorById).mockResolvedValue(authorNotFavorited);

      const result = await AuthorService.getAuthorById(
        mockAuthorId,
        mockUserId
      );

      expect(AuthorDao.findAuthorById).toHaveBeenCalledWith(
        mockAuthorId,
        mockUserId
      );
      expect(result).toEqual(authorNotFavorited);
      expect((result as AuthorOutput).isFavorite).toBe(false);
    });

    it("should throw NotFoundError if DAO returns null", async () => {
      vi.mocked(AuthorDao.findAuthorById).mockResolvedValue(null);
      await expect(
        AuthorService.getAuthorById("nonExistentId", mockUserId)
      ).rejects.toThrowError(new NotFoundError(ErrorMessages.AUTHOR_NOT_FOUND));
      expect(AuthorDao.findAuthorById).toHaveBeenCalledWith(
        "nonExistentId",
        mockUserId
      );
    });

    it("should return an author with isFavorite:undefined if no requestingUserId is provided", async () => {
      const authorWithoutFavoriteContext = {
        ...mockAuthorFromDaoBase,
        isFavorite: undefined,
      };
      vi.mocked(AuthorDao.findAuthorById).mockResolvedValue(
        authorWithoutFavoriteContext
      );

      const result = await AuthorService.getAuthorById(mockAuthorId);

      expect(AuthorDao.findAuthorById).toHaveBeenCalledWith(
        mockAuthorId,
        undefined
      );
      expect(result).toEqual(authorWithoutFavoriteContext);
      expect((result as AuthorOutput).isFavorite).toBeUndefined();
    });

    it("should return an author with correct isFavorite status even if createdById does not match requestingUserId", async () => {
      const authorCreatedByOther = {
        ...mockAuthorFromDaoBase,
        createdById: anotherMockUserId,
        isFavorite: true,
      };
      vi.mocked(AuthorDao.findAuthorById).mockResolvedValue(
        authorCreatedByOther
      );

      const result = await AuthorService.getAuthorById(
        mockAuthorId,
        mockUserId
      );

      expect(AuthorDao.findAuthorById).toHaveBeenCalledWith(
        mockAuthorId,
        mockUserId
      );
      expect(result).toEqual(authorCreatedByOther);
      expect((result as AuthorOutput).isFavorite).toBe(true);
    });
  });

  describe("getAllAuthors", () => {
    const mockAuthorsListFromDao: (Author & { isFavorite?: boolean })[] = [
      {
        ...mockAuthorFromDaoBase,
        id: "author1",
        createdById: mockUserId,
        isFavorite: true,
      },
      {
        ...mockAuthorFromDaoBase,
        id: "author2",
        createdById: mockUserId,
        isFavorite: false,
      },
    ];

    it("should call DAO.findAllAuthors with both filterByCreatedById and requestingUserIdForFavoriteStatus", async () => {
      vi.mocked(AuthorDao.findAllAuthors).mockResolvedValue({
        authors: mockAuthorsListFromDao,
        totalItems: 2,
      });
      const query: PaginationQueryDto = { page: 1, limit: 10 };
      await AuthorService.getAllAuthors(query, mockUserId);

      expect(AuthorDao.findAllAuthors).toHaveBeenCalledWith(
        1,
        10,
        undefined,
        undefined,
        mockUserId,
        mockUserId
      );
    });

    it("should handle undefined requestingUserId for public lists (no creator filter, no favorite status)", async () => {
      const publicList = mockAuthorsListFromDao.map((a) => ({
        ...a,
        isFavorite: undefined,
        createdById: a.id === "author1" ? mockUserId : anotherMockUserId,
      }));
      vi.mocked(AuthorDao.findAllAuthors).mockResolvedValue({
        authors: publicList,
        totalItems: publicList.length,
      });
      const query: PaginationQueryDto = { page: 1, limit: 10 };
      await AuthorService.getAllAuthors(query, undefined);

      expect(AuthorDao.findAllAuthors).toHaveBeenCalledWith(
        1,
        10,
        undefined,
        undefined,
        undefined,
        undefined
      );
    });

    it("should correctly map DAO results to service output structure", async () => {
      vi.mocked(AuthorDao.findAllAuthors).mockResolvedValue({
        authors: mockAuthorsListFromDao,
        totalItems: 20,
      });
      const query: PaginationQueryDto = { page: 1, limit: 5 };
      const result = await AuthorService.getAllAuthors(query, mockUserId);

      expect(result.data).toEqual(mockAuthorsListFromDao);
      expect(result.meta.totalItems).toBe(20);
      expect(result.meta.itemCount).toBe(mockAuthorsListFromDao.length);
      expect(result.meta.itemsPerPage).toBe(5);
      expect(result.meta.totalPages).toBe(4);
      expect(result.meta.currentPage).toBe(1);
    });
  });

  describe("updateAuthor", () => {
    const updateDto: UpdateAuthorDto = { name: "Updated Name" };
    const authorForUpdateOwnershipCheck = {
      ...mockAuthorFromDaoBase,
      createdById: mockUserId,
      isFavorite: undefined,
    };
    const updatedAuthorFromDao: Author = {
      ...authorForUpdateOwnershipCheck,
      name: updateDto.name!,
      updatedAt: new Date(),
    };

    it("should update author if user is owner", async () => {
      vi.mocked(AuthorDao.findAuthorById).mockResolvedValue(
        authorForUpdateOwnershipCheck
      );
      vi.mocked(AuthorDao.updateAuthor).mockResolvedValue(updatedAuthorFromDao);

      const result = await AuthorService.updateAuthor(
        mockAuthorId,
        updateDto,
        mockUserId
      );

      expect(AuthorDao.findAuthorById).toHaveBeenCalledWith(mockAuthorId);
      expect(AuthorDao.updateAuthor).toHaveBeenCalledWith(
        mockAuthorId,
        updateDto
      );
      expect(result.name).toBe(updateDto.name);
    });

    it("should throw ForbiddenError if user is not owner when updating", async () => {
      const authorOwnedByAnother = {
        ...authorForUpdateOwnershipCheck,
        createdById: anotherMockUserId,
      };
      vi.mocked(AuthorDao.findAuthorById).mockResolvedValue(
        authorOwnedByAnother
      );

      await expect(
        AuthorService.updateAuthor(mockAuthorId, updateDto, mockUserId)
      ).rejects.toThrowError(
        new ForbiddenError(ErrorMessages.UNAUTHORIZED_ACTION)
      );
      expect(AuthorDao.findAuthorById).toHaveBeenCalledWith(mockAuthorId);
      expect(AuthorDao.updateAuthor).not.toHaveBeenCalled();
    });

    it("should throw NotFoundError if author to update not found", async () => {
      vi.mocked(AuthorDao.findAuthorById).mockResolvedValue(null);
      await expect(
        AuthorService.updateAuthor("nonExistentId", updateDto, mockUserId)
      ).rejects.toThrowError(new NotFoundError(ErrorMessages.AUTHOR_NOT_FOUND));
    });
  });

  describe("deleteAuthor", () => {
    const authorForDeleteOwnershipCheck = {
      ...mockAuthorFromDaoBase,
      createdById: mockUserId,
      isFavorite: undefined,
    };
    const deletedAuthorFromDao: Author = { ...authorForDeleteOwnershipCheck };

    it("should delete author if user is owner", async () => {
      vi.mocked(AuthorDao.findAuthorById).mockResolvedValue(
        authorForDeleteOwnershipCheck
      );
      vi.mocked(AuthorDao.deleteAuthor).mockResolvedValue(deletedAuthorFromDao);

      await AuthorService.deleteAuthor(mockAuthorId, mockUserId);

      expect(AuthorDao.findAuthorById).toHaveBeenCalledWith(mockAuthorId);
      expect(AuthorDao.deleteAuthor).toHaveBeenCalledWith(mockAuthorId);
    });

    it("should throw ForbiddenError if user is not owner when deleting", async () => {
      const authorOwnedByAnother = {
        ...authorForDeleteOwnershipCheck,
        createdById: anotherMockUserId,
      };
      vi.mocked(AuthorDao.findAuthorById).mockResolvedValue(
        authorOwnedByAnother
      );

      await expect(
        AuthorService.deleteAuthor(mockAuthorId, mockUserId)
      ).rejects.toThrowError(
        new ForbiddenError(ErrorMessages.UNAUTHORIZED_ACTION)
      );
      expect(AuthorDao.findAuthorById).toHaveBeenCalledWith(mockAuthorId);
      expect(AuthorDao.deleteAuthor).not.toHaveBeenCalled();
    });

    it("should rethrow Prisma conflict error during delete for referential integrity", async () => {
      vi.mocked(AuthorDao.findAuthorById).mockResolvedValue(
        authorForDeleteOwnershipCheck
      );
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        "Foreign key constraint failed on the field: `some_field`",
        {
          clientVersion: "x.y.z",
          code: "P2003",
          meta: { field_name: "some_field" },
        }
      );
      vi.mocked(AuthorDao.deleteAuthor).mockRejectedValue(prismaError);

      await expect(
        AuthorService.deleteAuthor(mockAuthorId, mockUserId)
      ).rejects.toThrowError(
        new ConflictError(ErrorMessages.CANNOT_DELETE_AUTHOR_WITH_BOOKS)
      );
    });
  });
});
