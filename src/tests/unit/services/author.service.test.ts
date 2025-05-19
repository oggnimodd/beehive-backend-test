import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import AuthorService from "@/services/author.service";
import AuthorDao from "@/dao/author.dao";
import {
  DEFAULT_PAGE_LIMIT,
  DEFAULT_PAGE_NUMBER,
  ErrorMessages,
} from "@/constants";
import { NotFoundError, ForbiddenError } from "@/errors/error-types";
import type { CreateAuthorDto, UpdateAuthorDto } from "@/dto/author.dto";
import type { Author } from "@prisma/client";
import type { PaginationQueryDto } from "@/dto/shared.dto";

vi.mock("@/dao/author.dao");

const mockAuthorId = "mockAuthorId123";
const mockUserId = "mockUserId456";
const anotherMockUserId = "anotherUserId789";

const mockAuthor: Author = {
  id: mockAuthorId,
  name: "George Orwell",
  bio: "English novelist, essayist, journalist and critic.",
  createdById: mockUserId,
  createdAt: new Date(),
  updatedAt: new Date(),
  favoritedByIds: [],
};

describe("AuthorService", () => {
  beforeEach(() => {
    vi.mocked(AuthorDao.createAuthor).mockReset();
    vi.mocked(AuthorDao.findAuthorById).mockReset();
    vi.mocked(AuthorDao.findAuthorsByName).mockReset();
    vi.mocked(AuthorDao.findAllAuthors).mockReset();
    vi.mocked(AuthorDao.updateAuthor).mockReset();
    vi.mocked(AuthorDao.deleteAuthor).mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("createAuthor", () => {
    const createDtoWithNameAndBio: CreateAuthorDto = {
      name: "Aldous Huxley",
      bio: "Author of Brave New World.",
    };
    const createDtoWithNameOnly: CreateAuthorDto = {
      name: "Samuel Beckett",
    };

    it("should create and return an author with name and bio", async () => {
      const expectedCreatedAuthor: Author = {
        id: "newAuthorId1",
        name: createDtoWithNameAndBio.name,
        bio: createDtoWithNameAndBio.bio!,
        createdById: mockUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
        favoritedByIds: [],
      };
      vi.mocked(AuthorDao.createAuthor).mockResolvedValue(
        expectedCreatedAuthor
      );

      const result = await AuthorService.createAuthor(
        createDtoWithNameAndBio,
        mockUserId
      );

      expect(AuthorDao.createAuthor).toHaveBeenCalledWith(
        createDtoWithNameAndBio,
        mockUserId
      );
      expect(result).toEqual(expectedCreatedAuthor);
    });

    it("should create and return an author with name only (bio as null in result)", async () => {
      const expectedCreatedAuthor: Author = {
        id: "newAuthorId2",
        name: createDtoWithNameOnly.name,
        bio: null,
        createdById: mockUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
        favoritedByIds: [],
      };
      vi.mocked(AuthorDao.createAuthor).mockResolvedValue(
        expectedCreatedAuthor
      );

      const result = await AuthorService.createAuthor(
        createDtoWithNameOnly,
        mockUserId
      );

      expect(AuthorDao.createAuthor).toHaveBeenCalledWith(
        createDtoWithNameOnly,
        mockUserId
      );
      expect(result.name).toEqual(expectedCreatedAuthor.name);
      expect(result.bio).toBeNull();
      expect(result.id).toEqual(expectedCreatedAuthor.id);
      expect(result.createdById).toEqual(expectedCreatedAuthor.createdById);
    });

    it("should allow creating multiple authors with the same name by the same user", async () => {
      const dto1: CreateAuthorDto = { name: "Repeat Name" };
      const dto2: CreateAuthorDto = { name: "Repeat Name" };
      const author1: Author = {
        ...mockAuthor,
        id: "id1",
        name: "Repeat Name",
        bio: null,
        createdById: mockUserId,
      };
      const author2: Author = {
        ...mockAuthor,
        id: "id2",
        name: "Repeat Name",
        bio: null,
        createdById: mockUserId,
      };

      vi.mocked(AuthorDao.createAuthor)
        .mockResolvedValueOnce(author1)
        .mockResolvedValueOnce(author2);

      const result1 = await AuthorService.createAuthor(dto1, mockUserId);
      const result2 = await AuthorService.createAuthor(dto2, mockUserId);

      expect(AuthorDao.createAuthor).toHaveBeenCalledTimes(2);
      expect(result1.name).toBe("Repeat Name");
      expect(result2.name).toBe("Repeat Name");
      expect(result1.id).not.toBe(result2.id);
    });
  });

  describe("getAuthorById", () => {
    it("should return an author if found and user is owner", async () => {
      vi.mocked(AuthorDao.findAuthorById).mockResolvedValue(mockAuthor);
      const result = await AuthorService.getAuthorById(
        mockAuthorId,
        mockUserId
      );
      expect(AuthorDao.findAuthorById).toHaveBeenCalledWith(mockAuthorId);
      expect(result).toEqual(mockAuthor);
    });

    it("should throw ForbiddenError if author found but user is not owner", async () => {
      vi.mocked(AuthorDao.findAuthorById).mockResolvedValue(mockAuthor);
      await expect(
        AuthorService.getAuthorById(mockAuthorId, anotherMockUserId)
      ).rejects.toThrowError(
        new ForbiddenError(ErrorMessages.UNAUTHORIZED_ACTION)
      );
      expect(AuthorDao.findAuthorById).toHaveBeenCalledWith(mockAuthorId);
    });

    it("should throw NotFoundError if author not found", async () => {
      vi.mocked(AuthorDao.findAuthorById).mockResolvedValue(null);
      await expect(
        AuthorService.getAuthorById("nonExistentId", mockUserId)
      ).rejects.toThrowError(new NotFoundError(ErrorMessages.AUTHOR_NOT_FOUND));
    });

    it("should return an author if found and no requestingUserId is provided (public access scenario)", async () => {
      vi.mocked(AuthorDao.findAuthorById).mockResolvedValue(mockAuthor);
      const result = await AuthorService.getAuthorById(mockAuthorId);
      expect(AuthorDao.findAuthorById).toHaveBeenCalledWith(mockAuthorId);
      expect(result).toEqual(mockAuthor);
    });
  });

  describe("getAllAuthors", () => {
    const authorsList: Author[] = [
      mockAuthor,
      {
        ...mockAuthor,
        id: "author2",
        name: "Jane Austen",
        favoritedByIds: [],
        createdById: mockUserId,
      },
    ];

    it("should return paginated authors filtered by requestingUserId if provided", async () => {
      vi.mocked(AuthorDao.findAllAuthors).mockResolvedValue({
        authors: authorsList,
        totalItems: 2,
      });
      const result = await AuthorService.getAllAuthors(
        {} as PaginationQueryDto,
        mockUserId
      );
      expect(AuthorDao.findAllAuthors).toHaveBeenCalledWith(
        DEFAULT_PAGE_NUMBER,
        DEFAULT_PAGE_LIMIT,
        undefined,
        undefined,
        mockUserId
      );
      expect(result.data).toEqual(authorsList);
      expect(result.meta.totalItems).toBe(2);
    });

    it("should return all paginated authors if no requestingUserId is provided (public/admin scenario)", async () => {
      const allAuthorsList = [
        ...authorsList,
        {
          ...mockAuthor,
          id: "author3",
          createdById: anotherMockUserId,
          favoritedByIds: [],
        },
      ];
      vi.mocked(AuthorDao.findAllAuthors).mockResolvedValue({
        authors: allAuthorsList,
        totalItems: 3,
      });
      const result = await AuthorService.getAllAuthors(
        {} as PaginationQueryDto
      );
      expect(AuthorDao.findAllAuthors).toHaveBeenCalledWith(
        DEFAULT_PAGE_NUMBER,
        DEFAULT_PAGE_LIMIT,
        undefined,
        undefined,
        undefined
      );
      expect(result.data).toEqual(allAuthorsList);
      expect(result.meta.totalItems).toBe(3);
    });

    it("should pass query params and requestingUserId to DAO", async () => {
      const specificQuery: PaginationQueryDto = {
        page: 2,
        limit: 5,
        sortBy: "name:asc",
        search: "Orwell",
      };
      vi.mocked(AuthorDao.findAllAuthors).mockResolvedValue({
        authors: [mockAuthor],
        totalItems: 1,
      });

      const result = await AuthorService.getAllAuthors(
        specificQuery,
        mockUserId
      );

      expect(AuthorDao.findAllAuthors).toHaveBeenCalledWith(
        specificQuery.page,
        specificQuery.limit,
        specificQuery.sortBy,
        specificQuery.search,
        mockUserId
      );
      expect(result.data).toEqual([mockAuthor]);
    });
  });

  describe("updateAuthor", () => {
    const updateDto: UpdateAuthorDto = {
      name: "George Orwell Updated",
      bio: "New Bio",
    };

    it("should update and return author if found and user is owner", async () => {
      const updatedAuthorData: Author = {
        ...mockAuthor,
        name: updateDto.name!,
        bio: updateDto.bio!,
      };
      vi.mocked(AuthorDao.findAuthorById).mockResolvedValue(mockAuthor);
      vi.mocked(AuthorDao.updateAuthor).mockResolvedValue(updatedAuthorData);

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
      expect(result.bio).toBe(updateDto.bio);
    });

    it("should update only bio if name is not provided", async () => {
      const updateDtoOnlyBio: UpdateAuthorDto = { bio: "Only Bio Updated" };
      const updatedAuthorData: Author = {
        ...mockAuthor,
        bio: updateDtoOnlyBio.bio!,
      };
      vi.mocked(AuthorDao.findAuthorById).mockResolvedValue(mockAuthor);
      vi.mocked(AuthorDao.updateAuthor).mockResolvedValue(updatedAuthorData);

      const result = await AuthorService.updateAuthor(
        mockAuthorId,
        updateDtoOnlyBio,
        mockUserId
      );
      expect(AuthorDao.updateAuthor).toHaveBeenCalledWith(
        mockAuthorId,
        updateDtoOnlyBio
      );
      expect(result.bio).toBe(updateDtoOnlyBio.bio);
      expect(result.name).toBe(mockAuthor.name);
    });

    it("should update only name if bio is not provided", async () => {
      const updateDtoOnlyName: UpdateAuthorDto = { name: "Only Name Updated" };
      const updatedAuthorData: Author = {
        ...mockAuthor,
        name: updateDtoOnlyName.name!,
      };
      vi.mocked(AuthorDao.findAuthorById).mockResolvedValue(mockAuthor);
      vi.mocked(AuthorDao.updateAuthor).mockResolvedValue(updatedAuthorData);

      const result = await AuthorService.updateAuthor(
        mockAuthorId,
        updateDtoOnlyName,
        mockUserId
      );
      expect(AuthorDao.updateAuthor).toHaveBeenCalledWith(
        mockAuthorId,
        updateDtoOnlyName
      );
      expect(result.name).toBe(updateDtoOnlyName.name);
      expect(result.bio).toBe(mockAuthor.bio);
    });

    it("should throw NotFoundError if author to update not found", async () => {
      vi.mocked(AuthorDao.findAuthorById).mockResolvedValue(null);
      await expect(
        AuthorService.updateAuthor("nonExistentId", updateDto, mockUserId)
      ).rejects.toThrowError(new NotFoundError(ErrorMessages.AUTHOR_NOT_FOUND));
    });

    it("should throw ForbiddenError if user is not owner", async () => {
      vi.mocked(AuthorDao.findAuthorById).mockResolvedValue(mockAuthor);
      await expect(
        AuthorService.updateAuthor(mockAuthorId, updateDto, anotherMockUserId)
      ).rejects.toThrowError(
        new ForbiddenError(ErrorMessages.UNAUTHORIZED_ACTION)
      );
      expect(AuthorDao.updateAuthor).not.toHaveBeenCalled();
    });
  });

  describe("deleteAuthor", () => {
    it("should delete author if found and user is owner", async () => {
      vi.mocked(AuthorDao.findAuthorById).mockResolvedValue(mockAuthor);
      vi.mocked(AuthorDao.deleteAuthor).mockResolvedValue(mockAuthor);

      await AuthorService.deleteAuthor(mockAuthorId, mockUserId);

      expect(AuthorDao.findAuthorById).toHaveBeenCalledWith(mockAuthorId);
      expect(AuthorDao.deleteAuthor).toHaveBeenCalledWith(mockAuthorId);
    });

    it("should throw NotFoundError if author to delete not found", async () => {
      vi.mocked(AuthorDao.findAuthorById).mockResolvedValue(null);
      await expect(
        AuthorService.deleteAuthor("nonExistentId", mockUserId)
      ).rejects.toThrowError(new NotFoundError(ErrorMessages.AUTHOR_NOT_FOUND));
    });

    it("should throw ForbiddenError if user is not owner", async () => {
      vi.mocked(AuthorDao.findAuthorById).mockResolvedValue(mockAuthor);
      await expect(
        AuthorService.deleteAuthor(mockAuthorId, anotherMockUserId)
      ).rejects.toThrowError(
        new ForbiddenError(ErrorMessages.UNAUTHORIZED_ACTION)
      );
      expect(AuthorDao.deleteAuthor).not.toHaveBeenCalled();
    });
  });
});
