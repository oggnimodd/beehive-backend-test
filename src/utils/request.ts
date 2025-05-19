import type { Request, Response, NextFunction, RequestHandler } from "express";
import type { PaginationQueryDto } from "@/dto/shared.dto";

export type PaginatedRequestHandler<P = any, ResBody = any, ReqBody = any> = (
  req: Request<P, ResBody, ReqBody, PaginationQueryDto>,
  res: Response,
  next: NextFunction
) => Promise<void>;

export function withPagination<T extends PaginatedRequestHandler>(
  handler: T
): RequestHandler {
  return async (req, res, next) => {
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 10);
    (req as any).pagination = { page, limit };

    try {
      await handler(req as any, res, next);
    } catch (err) {
      next(err);
    }
  };
}
