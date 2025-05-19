import {
  ErrorMessages,
  DEFAULT_PAGE_NUMBER,
  DEFAULT_PAGE_LIMIT,
} from "@/constants";
import UserDao from "@/dao/user.dao";
import AuthorDao from "@/dao/author.dao";
import { NotFoundError, BadRequestError } from "@/errors/error-types";
import type { User, Author } from "@prisma/client";
import type { PaginationQueryDto } from "@/dto/shared.dto";
import { prisma } from "@/db/client";

class FavoriteService {
  async addAuthorToFavorites(userId: string, authorId: string): Promise<User> {
    const userExists = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, favoriteAuthorIds: true },
    });
    if (!userExists) {
      throw new NotFoundError(ErrorMessages.USER_NOT_FOUND);
    }

    const authorExists = await prisma.author.findUnique({
      where: { id: authorId },
      select: { id: true },
    });
    if (!authorExists) {
      throw new NotFoundError(ErrorMessages.AUTHOR_NOT_FOUND);
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

    const authorExists = await prisma.author.findUnique({
      where: { id: authorId },
      select: { id: true },
    });
    if (!authorExists) {
      throw new NotFoundError(ErrorMessages.AUTHOR_NOT_FOUND);
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

    const favoriteAuthors = await prisma.author.findMany({
      where: {
        id: { in: userWithFavoriteIds.favoriteAuthorIds },
      },
      skip: skip,
      take: limit,
    });

    const totalFavoriteAuthors = await prisma.author.count({
      where: {
        id: { in: userWithFavoriteIds.favoriteAuthorIds },
      },
    });

    const totalPages = Math.ceil(totalFavoriteAuthors / limit);
    const itemCount = favoriteAuthors.length;

    return {
      data: favoriteAuthors,
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
