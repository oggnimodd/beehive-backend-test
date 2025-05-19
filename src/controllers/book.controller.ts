import { ErrorMessages } from "@/constants";
import type { CreateBookDto, UpdateBookDto } from "@/dto/book.dto";
import type { IdParamDto, PaginationQueryDto } from "@/dto/shared.dto";
import { ForbiddenError } from "@/errors/error-types";
import BookService from "@/services/book.service";
import type { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";

class BookController {
  async createBook(
    req: Request<object, object, CreateBookDto>,
    res: Response,
    next: NextFunction
  ) {
    try {
      const userId = req.user!.id;
      const book = await BookService.createBook(req.body, userId);
      res.status(StatusCodes.CREATED).json({
        status: "success",
        message: "Book created successfully.",
        data: book,
      });
    } catch (error) {
      next(error);
    }
  }

  async getBookById(
    req: Request<IdParamDto, object, object>,
    res: Response,
    next: NextFunction
  ) {
    try {
      const requestingUserId = req.user!.id;
      const bookIdFromParams = req.params.id;
      const book = await BookService.getBookById(
        bookIdFromParams,
        requestingUserId
      );

      if (!book.createdById || book.createdById !== requestingUserId) {
        throw new ForbiddenError(ErrorMessages.UNAUTHORIZED_ACTION);
      }

      res.status(StatusCodes.OK).json({
        status: "success",
        data: book,
      });
    } catch (error) {
      next(error);
    }
  }

  async getAllBooks(
    req: Request<
      object,
      object,
      object,
      PaginationQueryDto & { authorId?: string }
    > & {
      pagination?: { page: number; limit: number };
    },
    res: Response,
    next: NextFunction
  ) {
    try {
      const userId = req.user!.id;
      const paginationQueryDto = {
        page: req.pagination?.page ?? Number(req.query.page),
        limit: req.pagination?.limit ?? Number(req.query.limit),
        sortBy: req.query.sortBy,
        search: req.query.search,
        authorId: req.query.authorId,
      };

      const result = await BookService.getAllBooks(paginationQueryDto, userId);

      res.status(StatusCodes.OK).json({
        status: "success",
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }
  async updateBook(
    req: Request<IdParamDto, object, UpdateBookDto>,
    res: Response,
    next: NextFunction
  ) {
    try {
      const userId = req.user!.id;
      const bookIdFromParams = req.params.id;
      const book = await BookService.updateBook(
        bookIdFromParams,
        req.body,
        userId
      );

      res.status(StatusCodes.OK).json({
        status: "success",
        message: "Book updated successfully.",
        data: book,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteBook(
    req: Request<IdParamDto, object, object>,
    res: Response,
    next: NextFunction
  ) {
    try {
      const userId = req.user!.id;
      const bookIdFromParams = req.params.id;
      await BookService.deleteBook(bookIdFromParams, userId);

      res.status(StatusCodes.OK).json({
        status: "success",
        message: "Book deleted successfully.",
        data: null,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new BookController();
