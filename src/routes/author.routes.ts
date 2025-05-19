import AuthorController from "@/controllers/author.controller";
import FavoriteController from "@/controllers/favorite.controller";
import {
  CreateAuthorRequestSchema,
  UpdateAuthorRequestSchema,
} from "@/dto/author.dto";
import { IdParamSchema, PaginationQuerySchema } from "@/dto/shared.dto";
import { protect } from "@/middlewares/auth.middleware";
import { validate } from "@/middlewares/validation.middleware";
import { withPagination } from "@/utils/request";
import { Router } from "express";

const router = Router();

router.post(
  "/",
  protect,
  validate(CreateAuthorRequestSchema),
  AuthorController.createAuthor
);

router.get(
  "/",
  protect,
  validate(PaginationQuerySchema),
  withPagination(AuthorController.getAllAuthors)
);

router.get(
  "/:id",
  protect,
  validate(IdParamSchema),
  AuthorController.getAuthorById
);

router.patch(
  "/:id",
  protect,
  validate(IdParamSchema),
  validate(UpdateAuthorRequestSchema),
  AuthorController.updateAuthor
);

router.delete(
  "/:id",
  protect,
  validate(IdParamSchema),
  AuthorController.deleteAuthor
);

router.post(
  "/:id/favorite",
  protect,
  validate(IdParamSchema),
  FavoriteController.addAuthorToFavorites
);

router.delete(
  "/:id/favorite",
  protect,
  validate(IdParamSchema),
  FavoriteController.removeAuthorFromFavorites
);

export default router;
