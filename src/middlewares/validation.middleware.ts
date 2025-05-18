import type { Request, Response, NextFunction } from "express";
import type { AnyZodObject } from "zod";
import { ZodError } from "zod";
import { BadRequestError } from "@/errors/error-types";

export const validate =
  (schema: AnyZodObject) =>
  async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const parsed = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });

      if (parsed.body) req.body = parsed.body;
      if (parsed.query) req.query = parsed.query;
      if (parsed.params) req.params = parsed.params;

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const validationErrors = error.errors.map((e) => ({
          field: e.path.join("."),
          message: e.message,
          code: e.code,
        }));
        return next(
          new BadRequestError(
            "Validation failed. Please check your input.",
            validationErrors
          )
        );
      }
      next(error);
    }
  };
