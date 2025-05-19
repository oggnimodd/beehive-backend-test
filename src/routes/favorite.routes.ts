import { Router } from "express";
import FavoriteController from "@/controllers/favorite.controller";
import { protect } from "@/middlewares/auth.middleware";
import { validate } from "@/middlewares/validation.middleware";
import { PaginationQuerySchema } from "@/dto/shared.dto";
import { withPagination } from "@/utils/request";

const router = Router();

router.get(
  "/authors",
  protect,
  validate(PaginationQuerySchema),
  withPagination(FavoriteController.getMyFavoriteAuthors)
);

export default router;
