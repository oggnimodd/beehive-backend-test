import AuthController from "@/controllers/auth.controller";
import {
  LoginUserRequestSchema,
  RegisterUserRequestSchema,
} from "@/dto/auth.dto";
import { protect } from "@/middlewares/auth.middleware";
import { validate } from "@/middlewares/validation.middleware";
import { Router } from "express";

const router = Router();

router.post(
  "/register",
  validate(RegisterUserRequestSchema),
  AuthController.register
);

router.post("/login", validate(LoginUserRequestSchema), AuthController.login);

router.get("/me", protect, AuthController.getMe);

export default router;
