import { ErrorMessages } from "@/constants";
import { StatusCodes } from "http-status-codes";
import { ApiError } from "./api-error";

export class NotFoundError extends ApiError {
  constructor(message: string = ErrorMessages.RESOURCE_NOT_FOUND("Resource")) {
    super(StatusCodes.NOT_FOUND, message);
  }
}

export class BadRequestError extends ApiError {
  constructor(
    message: string = ErrorMessages.VALIDATION_ERROR,
    errors?: Record<string, any>[] | string[]
  ) {
    super(StatusCodes.BAD_REQUEST, message, true, errors);
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message: string = ErrorMessages.UNAUTHENTICATED) {
    super(StatusCodes.UNAUTHORIZED, message);
  }
}

export class ForbiddenError extends ApiError {
  constructor(message: string = ErrorMessages.UNAUTHORIZED_ACTION) {
    super(StatusCodes.FORBIDDEN, message);
  }
}

export class ConflictError extends ApiError {
  constructor(message: string = ErrorMessages.CONFLICT_ERROR) {
    super(StatusCodes.CONFLICT, message);
  }
}
