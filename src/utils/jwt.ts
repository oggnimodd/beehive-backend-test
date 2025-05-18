import { config } from "@/config";
import logger from "@/utils/logger";
import jwt, { type SignOptions } from "jsonwebtoken";

export interface JwtPayload {
  userId: string;
  email: string;
}

const signOptions: SignOptions = {
  expiresIn: config.jwt.expiresIn as SignOptions["expiresIn"],
  algorithm: "HS256",
};

export const signToken = (payload: JwtPayload) => {
  // ensure secret is available
  if (!config.jwt.secret) {
    logger.fatal("JWT secret missing; cannot sign token");
    throw new Error("Token signing failed");
  }
  return jwt.sign(payload, config.jwt.secret, signOptions);
};

export const verifyToken = (token: string) => {
  // cannot verify without secret
  if (!config.jwt.secret) {
    logger.error("JWT secret missing; cannot verify token");
    return null;
  }

  try {
    // verify token and return payload
    return jwt.verify(token, config.jwt.secret) as JwtPayload;
  } catch (err: unknown) {
    // log expired tokens at info
    if (err instanceof jwt.TokenExpiredError) {
      logger.info(
        {
          message: (err as jwt.TokenExpiredError).message,
        },
        "Token expired"
      );
    } else if (err instanceof jwt.JsonWebTokenError) {
      // malformed or invalid signature
      logger.warn(
        {
          message: (err as jwt.JsonWebTokenError).message,
        },
        "Invalid token"
      );
    } else {
      // unexpected errors
      logger.error("Token verification error");
    }
    return null;
  }
};
