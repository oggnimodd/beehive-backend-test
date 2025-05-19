import FavoriteController from "@/controllers/favorite.controller";
import { PaginationQuerySchema } from "@/dto/shared.dto";
import { protect } from "@/middlewares/auth.middleware";
import { validate } from "@/middlewares/validation.middleware";
import { withPagination } from "@/utils/request";
import { Router } from "express";

const router = Router();

router.get(
  "/authors",
  protect,
  validate(PaginationQuerySchema),
  withPagination(FavoriteController.getMyFavoriteAuthors)
);

export default router;
