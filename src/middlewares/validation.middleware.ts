import { ErrorMessages } from "@/constants";
import { BadRequestError } from "@/errors/error-types";
import type { NextFunction, Request, Response } from "express";
import type { AnyZodObject } from "zod";
import { ZodError } from "zod";

export const validate =
  (schema: AnyZodObject) =>
  async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const dataToParse = {
        body: req.body,
        query: req.query,
        params: req.params,
      };
      const parsed = await schema.parseAsync(dataToParse);

      if (parsed.params !== undefined) {
        const newParams = parsed.params as Record<string, any>;
        for (const key in req.params) {
          if (!Object.prototype.hasOwnProperty.call(newParams, key)) {
            delete (req.params as any)[key];
          }
        }
        for (const key in newParams) {
          if (Object.prototype.hasOwnProperty.call(newParams, key)) {
            (req.params as any)[key] = newParams[key];
          }
        }
      }

      if (parsed.query !== undefined) {
        const newQuery = parsed.query as Record<string, any>;
        for (const key in req.query) {
          if (!Object.prototype.hasOwnProperty.call(newQuery, key)) {
            delete (req.query as any)[key];
          }
        }
        for (const key in newQuery) {
          if (Object.prototype.hasOwnProperty.call(newQuery, key)) {
            (req.query as any)[key] = newQuery[key];
          }
        }
      }

      if (parsed.body !== undefined) {
        req.body = parsed.body;
      }

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const validationErrors = error.errors.map((e) => ({
          field: e.path.join("."),
          message: e.message,
          code: e.code,
        }));
        return next(
          new BadRequestError(ErrorMessages.VALIDATION_ERROR, validationErrors)
        );
      }
      next(error);
    }
  };
