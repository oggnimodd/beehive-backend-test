import {
  DEFAULT_PAGE_LIMIT,
  DEFAULT_PAGE_NUMBER,
  ErrorMessages,
} from "@/constants";
import AuthorDao from "@/dao/author.dao";
import UserDao from "@/dao/user.dao";
import { prisma } from "@/db/client";
import type { PaginationQueryDto } from "@/dto/shared.dto";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from "@/errors/error-types";
import type { Author, Prisma as PrismaTypes, User } from "@prisma/client";

class FavoriteService {
  async addAuthorToFavorites(userId: string, authorId: string): Promise<User> {
    const userExists = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, favoriteAuthorIds: true },
    });

    if (!userExists) {
      throw new NotFoundError(ErrorMessages.USER_NOT_FOUND);
    }

    const author = await AuthorDao.findAuthorById(authorId);
    if (!author) {
      throw new NotFoundError(ErrorMessages.AUTHOR_NOT_FOUND);
    }

    if (author.createdById !== userId) {
      throw new ForbiddenError(ErrorMessages.UNAUTHORIZED_ACTION);
    }

    if (userExists.favoriteAuthorIds.includes(authorId)) {
      throw new BadRequestError(
        ErrorMessages.ITEM_ALREADY_IN_FAVORITES("Author")
      );
    }
    return UserDao.addAuthorToFavorites(userId, authorId);
  }

  async removeAuthorFromFavorites(
    userId: string,
    authorId: string
  ): Promise<User | null> {
    const userExists = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, favoriteAuthorIds: true },
    });

    if (!userExists) {
      throw new NotFoundError(ErrorMessages.USER_NOT_FOUND);
    }

    const author = await AuthorDao.findAuthorById(authorId);
    if (!author) {
      throw new NotFoundError(ErrorMessages.AUTHOR_NOT_FOUND);
    }

    if (author.createdById !== userId) {
      throw new ForbiddenError(ErrorMessages.UNAUTHORIZED_ACTION);
    }

    if (!userExists.favoriteAuthorIds.includes(authorId)) {
      throw new BadRequestError(ErrorMessages.ITEM_NOT_IN_FAVORITES("Author"));
    }
    return UserDao.removeAuthorFromFavorites(userId, authorId);
  }

  async getFavoriteAuthors(
    userId: string,
    query: PaginationQueryDto
  ): Promise<{ data: Author[]; meta: object }> {
    const userWithFavoriteIds = await prisma.user.findUnique({
      where: { id: userId },
      select: { favoriteAuthorIds: true },
    });

    if (!userWithFavoriteIds) {
      throw new NotFoundError(ErrorMessages.USER_NOT_FOUND);
    }

    const page = Number(query.page ?? DEFAULT_PAGE_NUMBER);
    const limit = Number(query.limit ?? DEFAULT_PAGE_LIMIT);
    const skip = (page - 1) * limit;

    if (
      !userWithFavoriteIds.favoriteAuthorIds ||
      userWithFavoriteIds.favoriteAuthorIds.length === 0
    ) {
      return {
        data: [],
        meta: {
          totalItems: 0,
          itemCount: 0,
          itemsPerPage: limit,
          totalPages: 0,
          currentPage: page,
        },
      };
    }

    const whereClause: PrismaTypes.AuthorWhereInput = {
      id: { in: userWithFavoriteIds.favoriteAuthorIds },
      createdById: userId,
    };

    const favoriteAuthors = await prisma.author.findMany({
      where: whereClause,
      skip: skip,
      take: limit,
    });

    const totalFavoriteAuthors = await prisma.author.count({
      where: whereClause,
    });

    const totalPages = Math.ceil(totalFavoriteAuthors / limit);
    const itemCount = favoriteAuthors.length;

    const resultData = favoriteAuthors.map((author) => ({
      ...author,
      isFavorite: true,
    }));

    return {
      data: resultData,
      meta: {
        totalItems: totalFavoriteAuthors,
        itemCount,
        itemsPerPage: limit,
        totalPages,
        currentPage: page,
      },
    };
  }
}

export default new FavoriteService();
