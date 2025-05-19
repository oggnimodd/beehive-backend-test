import { DEFAULT_PAGE_LIMIT, DEFAULT_PAGE_NUMBER } from "@/constants";
import type { IdParamDto, PaginationQueryDto } from "@/dto/shared.dto";
import FavoriteService from "@/services/favorite.service";
import type { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";

class FavoriteController {
  async addAuthorToFavorites(
    req: Request<IdParamDto, object, object>,
    res: Response,
    next: NextFunction
  ) {
    try {
      const userId = req.user!.id;
      const authorId = req.params.id;

      await FavoriteService.addAuthorToFavorites(userId, authorId);
      res.status(StatusCodes.OK).json({
        status: "success",
        message: "Author added to favorites successfully.",
      });
    } catch (error) {
      next(error);
    }
  }

  async removeAuthorFromFavorites(
    req: Request<IdParamDto, object, object>,
    res: Response,
    next: NextFunction
  ) {
    try {
      const userId = req.user!.id;
      const authorId = req.params.id;

      await FavoriteService.removeAuthorFromFavorites(userId, authorId);
      res.status(StatusCodes.OK).json({
        status: "success",
        message: "Author removed from favorites successfully.",
      });
    } catch (error) {
      next(error);
    }
  }

  async getMyFavoriteAuthors(
    req: Request<object, object, object, PaginationQueryDto>,
    res: Response,
    next: NextFunction
  ) {
    try {
      const userId = req.user!.id;

      const paginationData = (req as any).pagination;

      const page =
        paginationData?.page ?? Number(req.query.page ?? DEFAULT_PAGE_NUMBER);
      const limit =
        paginationData?.limit ?? Number(req.query.limit ?? DEFAULT_PAGE_LIMIT);

      const serviceQueryDto: PaginationQueryDto = {
        page: page,
        limit: limit,
        sortBy: req.query.sortBy,
        search: req.query.search,
      };

      const result = await FavoriteService.getFavoriteAuthors(
        userId,
        serviceQueryDto
      );
      res.status(StatusCodes.OK).json({
        status: "success",
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }

  async addBookToFavorites(
    req: Request<IdParamDto, object, object>,
    res: Response,
    next: NextFunction
  ) {
    try {
      const userId = req.user!.id;
      const bookId = req.params.id;

      await FavoriteService.addBookToFavorites(userId, bookId);
      res.status(StatusCodes.OK).json({
        status: "success",
        message: "Book added to favorites successfully.",
      });
    } catch (error) {
      next(error);
    }
  }

  async removeBookFromFavorites(
    req: Request<IdParamDto, object, object>,
    res: Response,
    next: NextFunction
  ) {
    try {
      const userId = req.user!.id;
      const bookId = req.params.id;

      await FavoriteService.removeBookFromFavorites(userId, bookId);
      res.status(StatusCodes.OK).json({
        status: "success",
        message: "Book removed from favorites successfully.",
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new FavoriteController();
