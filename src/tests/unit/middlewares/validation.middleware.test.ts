import { ErrorMessages } from "@/constants";
import { BadRequestError } from "@/errors/error-types";
import { validate } from "@/middlewares/validation.middleware";
import type { NextFunction, Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

const mockRequest = (
  query: any = {},
  params: any = {},
  body: any = {}
): Request => {
  const req = {
    query: { ...query },
    params: { ...params },
    body: typeof body === "object" && body !== null ? { ...body } : body,
  } as any;
  return req as Request;
};

const mockResponse = (): Response => ({}) as Response;

describe("Validation Middleware", () => {
  let req: Request;
  let res: Response;
  let next: NextFunction;

  beforeEach(() => {
    res = mockResponse();
    next = vi.fn();
  });

  describe("Query Parameter Validation and Coercion", () => {
    const paginationSchema = z.object({
      page: z.coerce.number().optional().default(1),
      limit: z.coerce.number().optional().default(10),
      search: z.string().optional(),
    });
    const requestSchemaWithQuery = z.object({
      query: paginationSchema,
      body: z.any().optional(),
      params: z.any().optional(),
    });

    it("should correctly parse and coerce valid query parameters", async () => {
      req = mockRequest({ page: "2", limit: "5", search: "test" });
      await validate(requestSchemaWithQuery)(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith();

      const validatedQuery = req.query as unknown as z.infer<
        typeof paginationSchema
      >;
      expect(validatedQuery.page).toBe(2);
      expect(typeof validatedQuery.page).toBe("number");
      expect(validatedQuery.limit).toBe(5);
      expect(typeof validatedQuery.limit).toBe("number");
      expect(validatedQuery.search).toBe("test");
    });

    it("should apply default values for optional coerced query parameters", async () => {
      req = mockRequest({});
      await validate(requestSchemaWithQuery)(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith();

      const validatedQuery = req.query as unknown as z.infer<
        typeof paginationSchema
      >;
      expect(validatedQuery.page).toBe(1);
      expect(typeof validatedQuery.page).toBe("number");
      expect(validatedQuery.limit).toBe(10);
      expect(typeof validatedQuery.limit).toBe("number");
    });

    it("should call next with BadRequestError for invalid query parameter types", async () => {
      req = mockRequest({ limit: "not-a-number" });
      await validate(requestSchemaWithQuery)(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);

      const errorArg = vi.mocked(next).mock.calls[0]![0];
      expect(errorArg).toBeInstanceOf(BadRequestError);

      const badRequestError = errorArg as unknown as BadRequestError;

      expect(badRequestError.message).toBe(ErrorMessages.VALIDATION_ERROR);
      expect(badRequestError.statusCode).toBe(400);
      expect(badRequestError.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: "query.limit",
            message: "Expected number, received nan",
          }),
        ])
      );
    });
  });

  describe("Params Parameter Validation and Coercion", () => {
    const idSchema = z.object({
      id: z.string().refine((val) => /^[0-9a-fA-F]{24}$/.test(val), {
        message: ErrorMessages.INVALID_OBJECT_ID,
      }),
      count: z.coerce.number().optional(),
    });
    const requestSchemaWithParams = z.object({
      params: idSchema,
      query: z.any().optional(),
      body: z.any().optional(),
    });

    it("should correctly parse valid path parameters and coerce if needed", async () => {
      const validMongoId = "60c72b2f9b1e8a5a4c8f0b1a";
      req = mockRequest({}, { id: validMongoId, count: "123" });
      await validate(requestSchemaWithParams)(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith();

      const validatedParams = req.params as unknown as z.infer<typeof idSchema>;
      expect(validatedParams.id).toBe(validMongoId);
      expect(validatedParams.count).toBe(123);
      expect(typeof validatedParams.count).toBe("number");
    });

    it("should call next with BadRequestError for invalid path parameter format", async () => {
      req = mockRequest({}, { id: "invalid-id" });
      await validate(requestSchemaWithParams)(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);

      const errorArg = vi.mocked(next).mock.calls[0]![0];
      expect(errorArg).toBeInstanceOf(BadRequestError);
      const badRequestError = errorArg as unknown as BadRequestError;

      expect(badRequestError.message).toBe(ErrorMessages.VALIDATION_ERROR);
      expect(badRequestError.statusCode).toBe(400);
      expect(badRequestError.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: "params.id",
            message: ErrorMessages.INVALID_OBJECT_ID,
          }),
        ])
      );
    });
  });

  describe("Body Validation", () => {
    const bodySchema = z.object({
      name: z.string().min(3, "Name too short"),
      age: z.coerce.number(),
    });
    const requestSchemaWithBody = z.object({
      body: bodySchema,
      query: z.any().optional(),
      params: z.any().optional(),
    });

    it("should correctly parse valid body and coerce types", async () => {
      req = mockRequest({}, {}, { name: "Test User", age: "30" });
      await validate(requestSchemaWithBody)(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith();

      const validatedBody = req.body as unknown as z.infer<typeof bodySchema>;
      expect(validatedBody.name).toBe("Test User");
      expect(validatedBody.age).toBe(30);
      expect(typeof validatedBody.age).toBe("number");
    });

    it("should call next with BadRequestError for invalid body data", async () => {
      req = mockRequest({}, {}, { name: "Te", age: "thirty" });
      await validate(requestSchemaWithBody)(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);

      const errorArg = vi.mocked(next).mock.calls[0]![0];
      expect(errorArg).toBeInstanceOf(BadRequestError);
      const badRequestError = errorArg as unknown as BadRequestError;

      expect(badRequestError.message).toBe(ErrorMessages.VALIDATION_ERROR);
      expect(badRequestError.statusCode).toBe(400);
      expect(badRequestError.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: "body.name",
            message: "Name too short",
          }),
          expect.objectContaining({
            field: "body.age",
            message: "Expected number, received nan",
          }),
        ])
      );
    });
  });
});
