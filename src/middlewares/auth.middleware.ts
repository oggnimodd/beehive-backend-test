import type { Request, Response, NextFunction } from "express";
import { verifyToken } from "@/utils/jwt";
import UserDao from "@/dao/user.dao";
import { UnauthorizedError } from "@/errors/error-types";
import { ErrorMessages } from "@/constants";
import type { User } from "@prisma/client";

// Expose user object on request object to meke it available in controllers
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export const protect = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token: string | undefined;
    const authHeader = req.headers.authorization;

    if (authHeader?.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    }

    if (!token) {
      throw new UnauthorizedError(ErrorMessages.UNAUTHENTICATED);
    }

    const decodedPayload = verifyToken(token);

    if (!decodedPayload) {
      throw new UnauthorizedError(ErrorMessages.TOKEN_INVALID);
    }

    const currentUser = await UserDao.findUserById(decodedPayload.userId);

    if (!currentUser) {
      throw new UnauthorizedError(ErrorMessages.USER_FOR_TOKEN_NOT_FOUND);
    }

    req.user = currentUser;

    next();
  } catch (error) {
    next(error);
  }
};
