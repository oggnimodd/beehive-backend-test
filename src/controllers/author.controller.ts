import { ErrorMessages } from "@/constants";
import type {
  AuthorOutput,
  CreateAuthorDto,
  UpdateAuthorDto,
} from "@/dto/author.dto";
import type { IdParamDto, PaginationQueryDto } from "@/dto/shared.dto";
import { ForbiddenError } from "@/errors/error-types";
import AuthorService from "@/services/author.service";
import type { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";

class AuthorController {
  async createAuthor(
    req: Request<object, object, CreateAuthorDto>,
    res: Response,
    next: NextFunction
  ) {
    try {
      const userId = req.user!.id;
      const author = await AuthorService.createAuthor(req.body, userId);
      res.status(StatusCodes.CREATED).json({
        status: "success",
        message: "Author created successfully.",
        data: author,
      });
    } catch (error) {
      next(error);
    }
  }

  async getAuthorById(
    req: Request<IdParamDto, object, object>,
    res: Response,
    next: NextFunction
  ) {
    try {
      const requestingUserId = req.user!.id;
      const authorIdFromParams = req.params.id;

      const author = (await AuthorService.getAuthorById(
        authorIdFromParams,
        requestingUserId
      )) as AuthorOutput;

      if (!author.createdById || author.createdById !== requestingUserId) {
        throw new ForbiddenError(ErrorMessages.UNAUTHORIZED_ACTION);
      }

      res.status(StatusCodes.OK).json({
        status: "success",
        data: author,
      });
    } catch (error) {
      next(error);
    }
  }

  async getAllAuthors(
    req: Request<object, object, object, PaginationQueryDto> & {
      pagination?: { page: number; limit: number };
    },
    res: Response,
    next: NextFunction
  ) {
    try {
      const userId = req.user!.id;

      const paginationQueryDto: PaginationQueryDto = {
        page: req.pagination?.page ?? Number(req.query.page),
        limit: req.pagination?.limit ?? Number(req.query.limit),
        sortBy: req.query.sortBy,
        search: req.query.search,
      };

      const result = await AuthorService.getAllAuthors(
        paginationQueryDto,
        userId
      );
      res.status(StatusCodes.OK).json({
        status: "success",
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateAuthor(
    req: Request<IdParamDto, object, UpdateAuthorDto>,
    res: Response,
    next: NextFunction
  ) {
    try {
      const userId = req.user!.id;
      const authorIdFromParams = req.params.id;
      const author = await AuthorService.updateAuthor(
        authorIdFromParams,
        req.body,
        userId
      );
      res.status(StatusCodes.OK).json({
        status: "success",
        message: "Author updated successfully.",
        data: author,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteAuthor(
    req: Request<IdParamDto, object, object>,
    res: Response,
    next: NextFunction
  ) {
    try {
      const userId = req.user!.id;
      const authorIdFromParams = req.params.id;
      await AuthorService.deleteAuthor(authorIdFromParams, userId);
      res.status(StatusCodes.OK).json({
        status: "success",
        message: "Author deleted successfully.",
        data: null,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new AuthorController();
