import { ErrorMessages } from "@/constants";
import AuthorDao from "@/dao/author.dao";
import BookDao from "@/dao/book.dao";
import type { CreateBookDto, UpdateBookDto } from "@/dto/book.dto";
import type { PaginationQueryDto } from "@/dto/shared.dto";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "@/errors/error-types";
import BookService from "@/services/book.service";
import type { Author, Book, BookAuthor } from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/dao/book.dao");
vi.mock("@/dao/author.dao");

const mockBookId = "mockBookId123";
const mockAuthorId = "mockAuthorId456";
const mockUserId = "mockUserId789";
const anotherMockUserId = "anotherUserIdABC";

type SlimAuthor = { id: string; name: string };
type DaoBookAuthor = BookAuthor & { author: SlimAuthor };
type DaoBookOutput = Book & {
  authors: DaoBookAuthor[];
};
type ServiceBookOutput = DaoBookOutput & {
  isFavorite?: boolean;
};

const mockAuthorPrisma: Author = {
  id: mockAuthorId,
  name: "Test Author",
  bio: "A test author bio.",
  createdById: mockUserId,
  favoritedByIds: [],
  createdAt: new Date("2023-01-01T10:00:00.000Z"),
  updatedAt: new Date("2023-01-01T11:00:00.000Z"),
};

const mockBookFromDaoBase: ServiceBookOutput = {
  id: mockBookId,
  title: "Test Book",
  isbn: "1234567890",
  publishedDate: new Date("2023-01-01T00:00:00.000Z"),
  createdById: mockUserId,
  favoritedByIds: [],
  createdAt: new Date("2023-01-02T10:00:00.000Z"),
  updatedAt: new Date("2023-01-02T11:00:00.000Z"),
  authors: [
    {
      id: `ba-join-${mockBookId}-${mockAuthorId}`,
      bookId: mockBookId,
      authorId: mockAuthorId,
      assignedAt: new Date("2023-01-02T12:00:00.000Z"),
      author: { id: mockAuthorId, name: mockAuthorPrisma.name },
    },
  ],
  isFavorite: false,
};

describe("BookService", () => {
  beforeEach(() => {
    vi.mocked(BookDao.createBook).mockReset();
    vi.mocked(BookDao.findBookById).mockReset();
    vi.mocked(BookDao.findBookByIsbn).mockReset();
    vi.mocked(BookDao.findAllBooks).mockReset();
    vi.mocked(BookDao.updateBook).mockReset();
    vi.mocked(BookDao.deleteBook).mockReset();
    vi.mocked(AuthorDao.findAuthorById).mockReset();

    vi.mocked(AuthorDao.findAuthorById).mockResolvedValue(mockAuthorPrisma);
    vi.mocked(BookDao.findBookByIsbn).mockResolvedValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("createBook", () => {
    const createDto: CreateBookDto = {
      title: "New Book Title",
      isbn: "0987654321",
      publishedDate: new Date("2024-01-01T00:00:00.000Z"),
      authorIds: [mockAuthorId],
    };

    it("should create and return a book successfully", async () => {
      const newBookId = "newBookIdGenerated";
      const newBookFromDaoMock: DaoBookOutput = {
        id: newBookId,
        title: createDto.title,
        isbn: createDto.isbn ?? null,
        publishedDate: createDto.publishedDate ?? null,
        createdById: mockUserId,
        favoritedByIds: [],
        createdAt: expect.any(Date) as Date,
        updatedAt: expect.any(Date) as Date,
        authors: createDto.authorIds.map((authId) => ({
          id: `ba-join-${newBookId}-${authId}`,
          bookId: newBookId,
          authorId: authId,
          assignedAt: expect.any(Date) as Date,
          author: {
            id: authId,
            name: mockAuthorPrisma.name,
          },
        })),
      };
      vi.mocked(BookDao.createBook).mockResolvedValue(newBookFromDaoMock);
      const result = await BookService.createBook(createDto, mockUserId);
      expect(AuthorDao.findAuthorById).toHaveBeenCalledWith(mockAuthorId);
      expect(BookDao.findBookByIsbn).toHaveBeenCalledWith(createDto.isbn);
      expect(BookDao.createBook).toHaveBeenCalledWith(createDto, mockUserId);
      expect(result).toEqual(newBookFromDaoMock);
    });

    it("should throw NotFoundError if an author ID does not exist", async () => {
      const invalidAuthorId = "nonExistentAuthorId";
      const dtoWithInvalidAuthor: CreateBookDto = {
        ...createDto,
        authorIds: [mockAuthorId, invalidAuthorId],
      };
      vi.mocked(AuthorDao.findAuthorById)
        .mockResolvedValueOnce(mockAuthorPrisma)
        .mockResolvedValueOnce(null);
      await expect(
        BookService.createBook(dtoWithInvalidAuthor, mockUserId)
      ).rejects.toThrowError(
        new NotFoundError(`Author with ID ${invalidAuthorId} not found.`)
      );
    });

    it("should throw ConflictError if ISBN already exists", async () => {
      const existingBook: Book = {
        id: "someOtherBookId",
        title: "Existing Title",
        isbn: createDto.isbn!,
        publishedDate: new Date(),
        createdById: anotherMockUserId,
        favoritedByIds: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      vi.mocked(BookDao.findBookByIsbn).mockResolvedValue(existingBook);
      await expect(
        BookService.createBook(createDto, mockUserId)
      ).rejects.toThrowError(
        new ConflictError(ErrorMessages.ISBN_ALREADY_EXISTS)
      );
    });

    it("should succeed if ISBN is not provided in DTO", async () => {
      const dtoWithoutIsbn: CreateBookDto = {
        ...createDto,
        isbn: undefined,
      };
      const newBookId = "newBookIdNoIsbn";
      const newBookFromDaoNoIsbnMock: DaoBookOutput = {
        id: newBookId,
        title: dtoWithoutIsbn.title,
        isbn: null,
        publishedDate: dtoWithoutIsbn.publishedDate ?? null,
        createdById: mockUserId,
        favoritedByIds: [],
        createdAt: expect.any(Date) as Date,
        updatedAt: expect.any(Date) as Date,
        authors: dtoWithoutIsbn.authorIds.map((authId) => ({
          id: `ba-join-${newBookId}-${authId}`,
          bookId: newBookId,
          authorId: authId,
          assignedAt: expect.any(Date) as Date,
          author: { id: authId, name: mockAuthorPrisma.name },
        })),
      };
      vi.mocked(BookDao.createBook).mockResolvedValue(newBookFromDaoNoIsbnMock);
      const result = await BookService.createBook(dtoWithoutIsbn, mockUserId);
      expect(BookDao.findBookByIsbn).not.toHaveBeenCalled();
      expect(BookDao.createBook).toHaveBeenCalledWith(
        dtoWithoutIsbn,
        mockUserId
      );
      expect(result).toEqual(newBookFromDaoNoIsbnMock);
    });
  });

  describe("getBookById", () => {
    it("should return a book with isFavorite status when requestingUserId is provided", async () => {
      const bookWithFavoriteStatus: ServiceBookOutput = {
        ...mockBookFromDaoBase,
        isFavorite: true,
      };
      vi.mocked(BookDao.findBookById).mockResolvedValue(bookWithFavoriteStatus);
      const result = await BookService.getBookById(mockBookId, mockUserId);
      expect(result.isFavorite).toBe(true);
    });

    it("should throw NotFoundError if DAO returns null", async () => {
      vi.mocked(BookDao.findBookById).mockResolvedValue(null);
      await expect(
        BookService.getBookById("nonExistentId", mockUserId)
      ).rejects.toThrowError(new NotFoundError(ErrorMessages.BOOK_NOT_FOUND));
    });

    it("should return a book with isFavorite:undefined if no requestingUserId is provided", async () => {
      const bookWithoutFavoriteContext: ServiceBookOutput = {
        ...mockBookFromDaoBase,
        isFavorite: undefined,
      };
      vi.mocked(BookDao.findBookById).mockResolvedValue(
        bookWithoutFavoriteContext
      );
      const result = await BookService.getBookById(mockBookId);
      expect(result.isFavorite).toBeUndefined();
    });
  });

  describe("getAllBooks", () => {
    const mockServiceOutputBooks: ServiceBookOutput[] = [
      { ...mockBookFromDaoBase, id: "book1", isFavorite: true },
      {
        ...mockBookFromDaoBase,
        id: "book2",
        isbn: "2222222222",
        isFavorite: false,
      },
    ];
    const paginatedDaoResult = {
      books: mockServiceOutputBooks,
      totalItems: 20,
    };

    it("should call DAO.findAllBooks with correct args and return mapped results", async () => {
      vi.mocked(BookDao.findAllBooks).mockResolvedValue(paginatedDaoResult);
      const query: PaginationQueryDto = { page: 1, limit: 10 };
      const result = await BookService.getAllBooks(query, mockUserId);
      expect(BookDao.findAllBooks).toHaveBeenCalledWith(
        1,
        10,
        undefined,
        undefined,
        mockUserId,
        undefined,
        mockUserId
      );
      expect(result.data).toEqual(mockServiceOutputBooks);
      expect(result.meta.totalItems).toBe(20);
    });
  });

  describe("updateBook", () => {
    const updateDto: UpdateBookDto = {
      title: "Updated Book Title",
      authorIds: [mockAuthorId],
      publishedDate: new Date("2024-01-01T00:00:00.000Z"),
    };

    const bookFromDbBeforeUpdate: ServiceBookOutput = {
      id: mockBookId,
      title: "Original Title",
      isbn: "1234567890",
      publishedDate: new Date("2023-01-01T00:00:00.000Z"),
      createdById: mockUserId,
      favoritedByIds: [],
      createdAt: new Date("2023-01-02T10:00:00.000Z"),
      updatedAt: new Date("2023-01-02T11:00:00.000Z"),
      authors: [
        {
          id: `ba-join-orig-${mockBookId}-${mockAuthorId}`,
          bookId: mockBookId,
          authorId: mockAuthorId,
          assignedAt: new Date("2023-01-02T12:00:00.000Z"),
          author: { id: mockAuthorId, name: "Original Author Name" },
        },
      ],
      isFavorite: undefined,
    };

    const updatedBookFromDaoMock: DaoBookOutput = {
      id: mockBookId,
      title: updateDto.title!,
      isbn: bookFromDbBeforeUpdate.isbn,
      publishedDate: updateDto.publishedDate ?? null,
      createdById: mockUserId,
      favoritedByIds: bookFromDbBeforeUpdate.favoritedByIds,
      createdAt: bookFromDbBeforeUpdate.createdAt,
      updatedAt: expect.any(Date) as Date,
      authors: updateDto.authorIds!.map((authId) => ({
        id: `ba-join-updated-${mockBookId}-${authId}`,
        bookId: mockBookId,
        authorId: authId,
        assignedAt: expect.any(Date) as Date,
        author: { id: authId, name: mockAuthorPrisma.name },
      })),
    };

    it("should update book if user is owner", async () => {
      vi.mocked(BookDao.findBookById).mockResolvedValue(bookFromDbBeforeUpdate);
      vi.mocked(AuthorDao.findAuthorById).mockResolvedValue(mockAuthorPrisma);
      vi.mocked(BookDao.updateBook).mockResolvedValue(updatedBookFromDaoMock);

      const result = await BookService.updateBook(
        mockBookId,
        updateDto,
        mockUserId
      );

      expect(result!.title).toBe(updateDto.title);
      expect(result!.isbn).toBe(bookFromDbBeforeUpdate.isbn);
      expect(result!.authors.length).toBe(updateDto.authorIds!.length);
    });

    it("should throw ForbiddenError if user is not owner", async () => {
      const bookOwnedByAnother: ServiceBookOutput = {
        ...bookFromDbBeforeUpdate,
        createdById: anotherMockUserId,
      };
      vi.mocked(BookDao.findBookById).mockResolvedValue(bookOwnedByAnother);
      await expect(
        BookService.updateBook(mockBookId, updateDto, mockUserId)
      ).rejects.toThrowError(
        new ForbiddenError(ErrorMessages.UNAUTHORIZED_ACTION)
      );
    });

    it("should throw NotFoundError if book to update not found", async () => {
      vi.mocked(BookDao.findBookById).mockResolvedValue(null);
      await expect(
        BookService.updateBook("nonExistentId", updateDto, mockUserId)
      ).rejects.toThrowError(new NotFoundError(ErrorMessages.BOOK_NOT_FOUND));
    });

    it("should throw NotFoundError if an author ID in updateDto does not exist", async () => {
      const invalidAuthorId = "nonExistentAuthorId";
      const dtoWithInvalidAuthor: UpdateBookDto = {
        ...updateDto,
        authorIds: [invalidAuthorId],
      };
      vi.mocked(BookDao.findBookById).mockResolvedValue(bookFromDbBeforeUpdate);
      vi.mocked(AuthorDao.findAuthorById).mockResolvedValueOnce(null);
      await expect(
        BookService.updateBook(mockBookId, dtoWithInvalidAuthor, mockUserId)
      ).rejects.toThrowError(
        new NotFoundError(`Author with ID ${invalidAuthorId} not found.`)
      );
    });

    it("should throw ConflictError if updated ISBN already exists for another book", async () => {
      const newIsbn = "9999999999";
      const dtoWithNewIsbn: UpdateBookDto = { ...updateDto, isbn: newIsbn };
      const existingBookWithIsbn: Book = {
        id: "anotherBookId",
        title: "Another Book",
        isbn: newIsbn,
        publishedDate: new Date(),
        createdById: anotherMockUserId,
        favoritedByIds: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      vi.mocked(BookDao.findBookById).mockResolvedValue(bookFromDbBeforeUpdate);
      vi.mocked(BookDao.findBookByIsbn).mockResolvedValue(existingBookWithIsbn);
      await expect(
        BookService.updateBook(mockBookId, dtoWithNewIsbn, mockUserId)
      ).rejects.toThrowError(
        new ConflictError(ErrorMessages.ISBN_ALREADY_EXISTS)
      );
    });

    it("should succeed if updated ISBN is the same as the current book's ISBN", async () => {
      const dtoWithSameIsbn: UpdateBookDto = {
        ...updateDto,
        isbn: bookFromDbBeforeUpdate.isbn!,
      };
      const specificUpdatedBookMock: DaoBookOutput = {
        ...updatedBookFromDaoMock,
        isbn: bookFromDbBeforeUpdate.isbn!,
      };
      vi.mocked(BookDao.findBookById).mockResolvedValue(bookFromDbBeforeUpdate);
      vi.mocked(BookDao.updateBook).mockResolvedValue(specificUpdatedBookMock);

      const result = await BookService.updateBook(
        mockBookId,
        dtoWithSameIsbn,
        mockUserId
      );
      expect(BookDao.findBookByIsbn).not.toHaveBeenCalledWith(
        dtoWithSameIsbn.isbn
      );
      expect(result!.isbn).toBe(dtoWithSameIsbn.isbn);
    });

    it("should succeed if authorIds in DTO is undefined (authors not changed)", async () => {
      const dtoWithoutAuthorIds: UpdateBookDto = { title: "Title Change Only" };
      const bookAfterUpdateNoAuthorChange: DaoBookOutput = {
        id: bookFromDbBeforeUpdate.id,
        title: dtoWithoutAuthorIds.title!,
        isbn: bookFromDbBeforeUpdate.isbn,
        publishedDate: bookFromDbBeforeUpdate.publishedDate,
        createdById: bookFromDbBeforeUpdate.createdById,
        favoritedByIds: bookFromDbBeforeUpdate.favoritedByIds,
        createdAt: bookFromDbBeforeUpdate.createdAt,
        updatedAt: expect.any(Date) as Date,
        authors: bookFromDbBeforeUpdate.authors,
      };
      vi.mocked(BookDao.findBookById).mockResolvedValue(bookFromDbBeforeUpdate);
      vi.mocked(BookDao.updateBook).mockResolvedValue(
        bookAfterUpdateNoAuthorChange
      );

      const result = await BookService.updateBook(
        mockBookId,
        dtoWithoutAuthorIds,
        mockUserId
      );

      expect(AuthorDao.findAuthorById).not.toHaveBeenCalled();
      expect(result!.authors).toEqual(bookFromDbBeforeUpdate.authors);
      expect(result!.title).toBe(dtoWithoutAuthorIds.title);
    });
  });

  describe("deleteBook", () => {
    const bookToDeleteDbState: ServiceBookOutput = {
      id: mockBookFromDaoBase.id,
      title: mockBookFromDaoBase.title,
      isbn: mockBookFromDaoBase.isbn,
      publishedDate: mockBookFromDaoBase.publishedDate,
      createdById: mockUserId,
      favoritedByIds: mockBookFromDaoBase.favoritedByIds,
      createdAt: mockBookFromDaoBase.createdAt,
      updatedAt: mockBookFromDaoBase.updatedAt,
      authors: mockBookFromDaoBase.authors,
      isFavorite: undefined,
    };

    const { isFavorite: _isFav, ...deletedBookDaoReturnFields } =
      bookToDeleteDbState;
    const deletedBookDaoResponseMock: DaoBookOutput =
      deletedBookDaoReturnFields;

    it("should delete book if user is owner", async () => {
      vi.mocked(BookDao.findBookById).mockResolvedValue(bookToDeleteDbState);
      vi.mocked(BookDao.deleteBook).mockResolvedValue(
        deletedBookDaoResponseMock
      );
      await BookService.deleteBook(mockBookId, mockUserId);
      expect(BookDao.deleteBook).toHaveBeenCalledWith(mockBookId);
    });

    it("should throw ForbiddenError if user is not owner", async () => {
      const bookOwnedByAnother: ServiceBookOutput = {
        ...bookToDeleteDbState,
        createdById: anotherMockUserId,
      };
      vi.mocked(BookDao.findBookById).mockResolvedValue(bookOwnedByAnother);
      await expect(
        BookService.deleteBook(mockBookId, mockUserId)
      ).rejects.toThrowError(
        new ForbiddenError(ErrorMessages.UNAUTHORIZED_ACTION)
      );
    });
  });
});
