import type { LoginUserDto, RegisterUserDto } from "@/dto/auth.dto";
import AuthService from "@/services/auth.service";
import type { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";

class AuthController {
  async register(
    req: Request<object, object, RegisterUserDto>,
    res: Response,
    next: NextFunction
  ) {
    try {
      const authResponse = await AuthService.registerUser(req.body);
      res.status(StatusCodes.CREATED).json({
        status: "success",
        message: "User registered successfully. Please log in.",
        data: authResponse,
      });
    } catch (error) {
      next(error);
    }
  }

  async login(
    req: Request<object, object, LoginUserDto>,
    res: Response,
    next: NextFunction
  ) {
    try {
      const authResponse = await AuthService.loginUser(req.body);
      res.status(StatusCodes.OK).json({
        status: "success",
        message: "Login successful.",
        data: authResponse,
      });
    } catch (error) {
      next(error);
    }
  }

  async getMe(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return next(new Error("User ID not found on request."));
      }

      const userProfile = await AuthService.getMe(userId);
      res.status(StatusCodes.OK).json({
        status: "success",
        data: userProfile,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new AuthController();
