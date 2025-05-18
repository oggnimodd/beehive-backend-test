import type { Request, Response } from "express";
import { StatusCodes, ReasonPhrases } from "http-status-codes";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";

import { ApiError } from "@/errors/api-error";
import logger from "@/utils/logger";
import { config } from "@/config";
import { ErrorMessages } from "@/constants";

export type StatusType = "fail" | "error";

// Classify response as 'fail' (4xx) or 'error' (5xx)
const getResponseStatusType = (statusCode: number): StatusType =>
  statusCode >= 400 && statusCode < 500 ? "fail" : "error";

export const errorHandler = (err: Error, req: Request, res: Response) => {
  const requestId = (req as any).id || "unknown-request";

  // Log error details
  const logContext: Record<string, unknown> = {
    name: err.name,
    message: err.message,
    reqId: requestId,
    path: req.path,
    method: req.method,
  };
  if (config.nodeEnv === "development") {
    logContext.stack = err.stack;
    if (req.body?.constructor === Object && Object.keys(req.body).length) {
      logContext.body = req.body;
    }
  }
  logger.error(logContext, "Error caught by global handler");

  let statusCode = StatusCodes.INTERNAL_SERVER_ERROR;
  let message: string = ReasonPhrases.INTERNAL_SERVER_ERROR;
  let detailedErrors: unknown[] | undefined;

  if (err instanceof ApiError) {
    // Errors thrown by our own API

    statusCode = err.statusCode;
    message = err.message;
    detailedErrors = err.errors;
  } else if (err instanceof ZodError) {
    // Validation errors from Zod

    statusCode = StatusCodes.BAD_REQUEST;
    message = ErrorMessages.VALIDATION_ERROR;
    detailedErrors = err.errors.map((e) => ({
      field: e.path.join("."),
      message: e.message,
      code: e.code,
    }));
  } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // Prisma errors

    switch (err.code) {
      case "P2002": {
        statusCode = StatusCodes.CONFLICT;
        const target = err.meta?.target;
        const fields = Array.isArray(target)
          ? target.join(", ")
          : String(target || "field");
        message = `Record already exists: ${fields}.`;
        break;
      }
      case "P2003": {
        statusCode = StatusCodes.BAD_REQUEST;
        message = "Invalid reference: related record not found.";
        break;
      }
      case "P2014": {
        statusCode = StatusCodes.BAD_REQUEST;
        message = "Relation violation between models.";
        break;
      }
      case "P2025": {
        statusCode = StatusCodes.NOT_FOUND;
        message =
          (err.meta?.cause as string) ||
          ErrorMessages.RESOURCE_NOT_FOUND("Resource");
        break;
      }
      default: {
        logger.warn(
          { code: err.code, meta: err.meta, reqId: requestId },
          "Unhandled Prisma error"
        );
        message = ErrorMessages.DATABASE_ERROR;
      }
    }
  } else if (err instanceof Prisma.PrismaClientValidationError) {
    // Prisma validation errors

    statusCode = StatusCodes.BAD_REQUEST;
    message = ErrorMessages.VALIDATION_ERROR;
    if (config.nodeEnv === "development") {
      detailedErrors = [
        { prismaValidation: err.message.split("\n").pop()?.trim() ?? "" },
      ];
    }
  } else if (err.name === "SyntaxError" && (err as any).status === 400) {
    // JSON parsing errors

    statusCode = StatusCodes.BAD_REQUEST;
    message = "Malformed JSON in request body.";
  }

  if (
    config.nodeEnv === "production" &&
    statusCode >= 500 &&
    !(err instanceof ApiError)
  ) {
    message = ReasonPhrases.INTERNAL_SERVER_ERROR;
  }

  const responsePayload: Record<string, unknown> = {
    status: getResponseStatusType(statusCode),
    message,
    reqId: requestId,
  };

  if (detailedErrors?.length) {
    responsePayload.errors = detailedErrors;
  }

  if (config.nodeEnv === "development") {
    responsePayload.stack = err.stack;
  }

  if (!res.headersSent) {
    res.status(statusCode).json(responsePayload);
  } else {
    logger.fatal(
      { reqId: requestId, message: err.message },
      "Cannot send error response: headers already sent"
    );
  }
};
