import {
  DEFAULT_PAGE_LIMIT,
  DEFAULT_PAGE_NUMBER,
  ErrorMessages,
} from "@/constants";
import BookDao from "@/dao/book.dao";
import type { BookOutput, CreateBookDto, UpdateBookDto } from "@/dto/book.dto";
import type { PaginationQueryDto } from "@/dto/shared.dto";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "@/errors/error-types";
import AuthorDao from "@/dao/author.dao";

class BookService {
  async createBook(bookData: CreateBookDto, userId: string) {
    for (const authorId of bookData.authorIds) {
      const author = await AuthorDao.findAuthorById(authorId);
      if (!author) {
        throw new NotFoundError(`Author with ID ${authorId} not found.`);
      }
    }

    if (bookData.isbn) {
      const existingBook = await BookDao.findBookByIsbn(bookData.isbn);
      if (existingBook) {
        throw new ConflictError(ErrorMessages.ISBN_ALREADY_EXISTS);
      }
    }

    return BookDao.createBook(bookData, userId);
  }

  async getBookById(bookId: string, requestingUserId?: string) {
    const book = await BookDao.findBookById(bookId, requestingUserId);
    if (!book) {
      throw new NotFoundError(ErrorMessages.BOOK_NOT_FOUND);
    }
    return book;
  }

  async getAllBooks(
    query: PaginationQueryDto & { authorId?: string },
    requestingUserId?: string
  ) {
    const page = Number(query.page ?? DEFAULT_PAGE_NUMBER);
    const limit = Number(query.limit ?? DEFAULT_PAGE_LIMIT);
    const sortBy = query.sortBy;
    const search = query.search;
    const authorId = query.authorId;

    const { books, totalItems } = await BookDao.findAllBooks(
      page,
      limit,
      sortBy,
      search,
      requestingUserId,
      authorId,
      requestingUserId
    );

    const totalPages = limit > 0 ? Math.ceil(totalItems / limit) : 0;
    const itemCount = books.length;

    return {
      data: books as BookOutput[],
      meta: {
        totalItems,
        itemCount,
        itemsPerPage: limit,
        totalPages,
        currentPage: page,
      },
    };
  }

  async updateBook(
    bookId: string,
    bookData: UpdateBookDto,
    requestingUserId: string
  ) {
    const book = await BookDao.findBookById(bookId);
    if (!book) {
      throw new NotFoundError(ErrorMessages.BOOK_NOT_FOUND);
    }

    if (book.createdById !== requestingUserId) {
      throw new ForbiddenError(ErrorMessages.UNAUTHORIZED_ACTION);
    }

    if (bookData.authorIds) {
      for (const authorId of bookData.authorIds) {
        const author = await AuthorDao.findAuthorById(authorId);
        if (!author) {
          throw new NotFoundError(`Author with ID ${authorId} not found.`);
        }
      }
    }

    if (bookData.isbn && bookData.isbn !== book.isbn) {
      const existingBook = await BookDao.findBookByIsbn(bookData.isbn);
      if (existingBook && existingBook.id !== bookId) {
        throw new ConflictError(ErrorMessages.ISBN_ALREADY_EXISTS);
      }
    }

    return BookDao.updateBook(bookId, bookData);
  }

  async deleteBook(bookId: string, requestingUserId: string) {
    const book = await BookDao.findBookById(bookId);
    if (!book) {
      throw new NotFoundError(ErrorMessages.BOOK_NOT_FOUND);
    }

    if (book.createdById !== requestingUserId) {
      throw new ForbiddenError(ErrorMessages.UNAUTHORIZED_ACTION);
    }

    return BookDao.deleteBook(bookId);
  }
}

export default new BookService();
