import {
  DEFAULT_PAGE_LIMIT,
  DEFAULT_PAGE_NUMBER,
  ErrorMessages,
} from "@/constants";
import AuthorDao from "@/dao/author.dao";
import type {
  CreateAuthorDto,
  UpdateAuthorDto,
  AuthorOutput,
} from "@/dto/author.dto";
import {
  ForbiddenError,
  NotFoundError,
  ConflictError,
} from "@/errors/error-types";
import type { PaginationQueryDto } from "@/dto/shared.dto";
import { Prisma } from "@prisma/client";

class AuthorService {
  async createAuthor(authorData: CreateAuthorDto, userId: string) {
    return AuthorDao.createAuthor(authorData, userId);
  }

  async getAuthorById(
    authorId: string,
    requestingUserId?: string
  ): Promise<AuthorOutput> {
    const author = await AuthorDao.findAuthorById(authorId, requestingUserId);

    if (!author) {
      throw new NotFoundError(ErrorMessages.AUTHOR_NOT_FOUND);
    }

    return author as AuthorOutput;
  }

  async getAllAuthors(
    query: PaginationQueryDto,
    requestingUserId?: string
  ): Promise<{ data: AuthorOutput[]; meta: any }> {
    const page = Number(query.page ?? DEFAULT_PAGE_NUMBER);
    const limit = Number(query.limit ?? DEFAULT_PAGE_LIMIT);
    const sortBy = query.sortBy;
    const search = query.search;

    const { authors, totalItems } = await AuthorDao.findAllAuthors(
      page,
      limit,
      sortBy,
      search,
      requestingUserId,
      requestingUserId
    );

    const totalPages = limit > 0 ? Math.ceil(totalItems / limit) : 0;
    const itemCount = authors.length;
    return {
      data: authors as AuthorOutput[],
      meta: {
        totalItems,
        itemCount,
        itemsPerPage: limit,
        totalPages,
        currentPage: page,
      },
    };
  }

  async updateAuthor(
    authorId: string,
    authorData: UpdateAuthorDto,
    requestingUserId: string
  ) {
    const author = await AuthorDao.findAuthorById(authorId);

    if (!author) {
      throw new NotFoundError(ErrorMessages.AUTHOR_NOT_FOUND);
    }

    if (author.createdById !== requestingUserId) {
      throw new ForbiddenError(ErrorMessages.UNAUTHORIZED_ACTION);
    }
    return AuthorDao.updateAuthor(authorId, authorData);
  }

  async deleteAuthor(authorId: string, requestingUserId: string) {
    const author = await AuthorDao.findAuthorById(authorId);

    if (!author) {
      throw new NotFoundError(ErrorMessages.AUTHOR_NOT_FOUND);
    }

    if (author.createdById !== requestingUserId) {
      throw new ForbiddenError(ErrorMessages.UNAUTHORIZED_ACTION);
    }
    try {
      await AuthorDao.deleteAuthor(authorId);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2003" || error.code === "P2014") {
          throw new ConflictError(
            ErrorMessages.CANNOT_DELETE_AUTHOR_WITH_BOOKS
          );
        }
      }
      throw error;
    }
  }
}

export default new AuthorService();
