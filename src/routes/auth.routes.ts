import { Router } from "express";
import AuthController from "@/controllers/auth.controller";
import { validate } from "@/middlewares/validation.middleware";
import { protect } from "@/middlewares/auth.middleware";
import {
  RegisterUserRequestSchema,
  LoginUserRequestSchema,
} from "@/dto/auth.dto";

const router = Router();

router.post(
  "/register",
  validate(RegisterUserRequestSchema),
  AuthController.register
);

router.post("/login", validate(LoginUserRequestSchema), AuthController.login);

router.get("/me", protect, AuthController.getMe);

export default router;
