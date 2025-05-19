import BookController from "@/controllers/book.controller";
import FavoriteController from "@/controllers/favorite.controller";
import {
  CreateBookRequestSchema,
  UpdateBookRequestSchema,
} from "@/dto/book.dto";
import { IdParamSchema, PaginationQuerySchema } from "@/dto/shared.dto";
import { protect } from "@/middlewares/auth.middleware";
import { validate } from "@/middlewares/validation.middleware";
import { withPagination } from "@/utils/request";
import { Router } from "express";

const router = Router();

router.post(
  "/",
  protect,
  validate(CreateBookRequestSchema),
  BookController.createBook
);

router.get(
  "/",
  protect,
  validate(PaginationQuerySchema),
  withPagination(BookController.getAllBooks)
);

router.get(
  "/:id",
  protect,
  validate(IdParamSchema),
  BookController.getBookById
);

router.patch(
  "/:id",
  protect,
  validate(IdParamSchema),
  validate(UpdateBookRequestSchema),
  BookController.updateBook
);

router.delete(
  "/:id",
  protect,
  validate(IdParamSchema),
  BookController.deleteBook
);

router.post(
  "/:id/favorite",
  protect,
  validate(IdParamSchema),
  FavoriteController.addBookToFavorites
);

router.delete(
  "/:id/favorite",
  protect,
  validate(IdParamSchema),
  FavoriteController.removeBookFromFavorites
);

export default router;
