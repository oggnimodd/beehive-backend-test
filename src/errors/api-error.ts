import type { StatusCodes } from "http-status-codes";

export class ApiError extends Error {
  public readonly statusCode: StatusCodes;
  public readonly isOperational: boolean;
  public readonly errors?: Record<string, any>[] | string[];

  constructor(
    statusCode: StatusCodes,
    message: string,
    isOperational = true,
    errors?: Record<string, any>[] | string[]
  ) {
    super(message);

    Object.setPrototypeOf(this, new.target.prototype);

    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.errors = errors;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}
