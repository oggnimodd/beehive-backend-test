import { Prisma } from "@prisma/client";
import type { NextFunction, Request, Response } from "express";
import { ReasonPhrases, StatusCodes } from "http-status-codes";
import { ZodError } from "zod";

import { config } from "@/config";
import { ErrorMessages } from "@/constants";
import { ApiError } from "@/errors/api-error";
import appLogger from "@/utils/logger";

export type StatusType = "fail" | "error";

const getResponseStatusType = (statusCode: number): StatusType =>
  statusCode >= 400 && statusCode < 500 ? "fail" : "error";

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  const requestId = (req as any).id || "unknown-request-" + Date.now();

  const logDetails: Record<string, unknown> = {
    reqId: requestId,
    path: req.path,
    method: req.method,
  };

  if (config.nodeEnv === "development") {
    if (
      req.body &&
      typeof req.body === "object" &&
      Object.keys(req.body).length > 0
    ) {
      logDetails.requestBody = req.body;
    }
  }

  appLogger.error(
    `[ErrorHandler] Initial error caught for reqId: ${requestId}`,
    err
  );

  let statusCode = StatusCodes.INTERNAL_SERVER_ERROR;
  let responseMessage: string = ReasonPhrases.INTERNAL_SERVER_ERROR;
  let detailedErrors: unknown[] | undefined;

  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    responseMessage = err.message;
    detailedErrors = err.errors;
    appLogger.debug(
      `[ErrorHandler] ApiError instance. Set statusCode: ${statusCode}, message: "${responseMessage}". ReqId: ${requestId}`
    );
  } else if (err instanceof ZodError) {
    statusCode = StatusCodes.BAD_REQUEST;
    responseMessage = ErrorMessages.VALIDATION_ERROR;
    detailedErrors = err.errors.map((e) => ({
      field: e.path.join("."),
      message: e.message,
      code: e.code,
    }));
    appLogger.debug(
      `[ErrorHandler] ZodError instance. Set statusCode: ${statusCode}, message: "${responseMessage}". ReqId: ${requestId}`
    );
  } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    appLogger.debug(
      `[ErrorHandler] PrismaClientKnownRequestError instance. Code: "${err.code}". Original Prisma Message: "${err.message}". Meta: ${JSON.stringify(err.meta)}. ReqId: ${requestId}`
    );
    switch (err.code) {
      case "P2002": {
        statusCode = StatusCodes.CONFLICT;
        const target = err.meta?.target;
        const fields = Array.isArray(target)
          ? target.join(", ")
          : String(target || "field");
        responseMessage = `Record already exists: ${fields}.`;
        appLogger.debug(
          `[ErrorHandler] P2002 branch hit. Set responseMessage to: "${responseMessage}". ReqId: ${requestId}`
        );
        break;
      }
      case "P2003": {
        statusCode = StatusCodes.BAD_REQUEST;
        responseMessage = "Invalid reference: related record not found.";
        appLogger.debug(
          `[ErrorHandler] P2003 branch hit. Set responseMessage to: "${responseMessage}". ReqId: ${requestId}`
        );
        break;
      }
      case "P2014": {
        statusCode = StatusCodes.BAD_REQUEST;
        responseMessage = "Relation violation between models.";
        appLogger.debug(
          `[ErrorHandler] P2014 branch hit. Set responseMessage to: "${responseMessage}". ReqId: ${requestId}`
        );
        break;
      }
      case "P2025": {
        statusCode = StatusCodes.NOT_FOUND;
        responseMessage =
          (err.meta?.cause as string) ||
          ErrorMessages.RESOURCE_NOT_FOUND("Resource");
        appLogger.debug(
          `[ErrorHandler] P2025 branch hit. Set responseMessage to: "${responseMessage}". ReqId: ${requestId}`
        );
        break;
      }
      default: {
        appLogger.warn(
          `[ErrorHandler] Unhandled PrismaClientKnownRequestError code: ${err.code}. ReqId: ${requestId}`,
          { code: err.code, meta: err.meta }
        );
        responseMessage = ErrorMessages.DATABASE_ERROR;
        appLogger.debug(
          `[ErrorHandler] Prisma Default branch hit. Set responseMessage to: "${responseMessage}". ReqId: ${requestId}`
        );
      }
    }
  } else if (err instanceof Prisma.PrismaClientValidationError) {
    statusCode = StatusCodes.BAD_REQUEST;
    responseMessage = ErrorMessages.VALIDATION_ERROR;
    if (config.nodeEnv === "development") {
      detailedErrors = [
        { prismaValidation: err.message.split("\n").pop()?.trim() ?? "" },
      ];
    }
    appLogger.debug(
      `[ErrorHandler] PrismaClientValidationError instance. Set statusCode: ${statusCode}, message: "${responseMessage}". ReqId: ${requestId}`
    );
  } else if (
    err.name === "SyntaxError" &&
    (err as any).status === 400 &&
    "body" in err
  ) {
    statusCode = StatusCodes.BAD_REQUEST;
    responseMessage = "Malformed JSON in request body.";
    appLogger.debug(
      `[ErrorHandler] SyntaxError (Malformed JSON). Set statusCode: ${statusCode}, message: "${responseMessage}". ReqId: ${requestId}`
    );
  } else {
    appLogger.debug(
      `[ErrorHandler] Unhandled/Generic Error type: ${err.name}. Initial statusCode: ${statusCode}, responseMessage: "${responseMessage}". ReqId: ${requestId}`
    );
  }

  if (
    config.nodeEnv === "production" &&
    statusCode >= 500 &&
    !(err instanceof ApiError && err.isOperational)
  ) {
    responseMessage = ReasonPhrases.INTERNAL_SERVER_ERROR;
    detailedErrors = undefined;
    appLogger.debug(
      `[ErrorHandler] Production 5xx safety net. Overridden message to generic. ReqId: ${requestId}`
    );
  }

  const responsePayload: Record<string, unknown> = {
    status: getResponseStatusType(statusCode),
    message: responseMessage,
    reqId: requestId,
  };

  if (detailedErrors?.length) {
    responsePayload.errors = detailedErrors;
  }

  appLogger.debug(
    `[ErrorHandler] FINAL responsePayload for reqId ${requestId}: ${JSON.stringify(responsePayload)}`
  );

  if (!res.headersSent) {
    res.status(statusCode).json(responsePayload);
  } else {
    appLogger.fatal(
      `[ErrorHandler] Cannot send error response: headers already sent for reqId ${requestId}`,
      err,
      { originalResponseMessage: responseMessage }
    );
  }
};
