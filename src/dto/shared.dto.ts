import "zod-openapi/extend";
import {
  DEFAULT_PAGE_LIMIT,
  DEFAULT_PAGE_NUMBER,
  ErrorMessages,
  MAX_PAGE_LIMIT,
} from "@/constants";
import { z } from "zod";

export const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const ZodObjectId = z
  .string({
    required_error: "ID is required.",
    invalid_type_error: "ID must be a string.",
  })
  .regex(objectIdRegex, { message: ErrorMessages.INVALID_OBJECT_ID })
  .openapi({
    description:
      "A MongoDB ObjectId, represented as a 24-character hexadecimal string.",
    example: "60c72b2f9b1e8a5a4c8f0b1a",
    type: "string",
    format: "objectid",
  });

export const IdParamSchema = z.object({
  id: ZodObjectId.openapi({
    description: "The unique identifier (ObjectId) of the resource.",
  }),
});

export const PaginationQuerySchema = z.object({
  page: z.coerce
    .number({ invalid_type_error: "Page must be a number." })
    .int({ message: "Page must be an integer." })
    .positive({ message: "Page must be a positive number." })
    .default(DEFAULT_PAGE_NUMBER)
    .openapi({
      description: "Page number for pagination.",
      example: 1,
    }),
  limit: z.coerce
    .number({ invalid_type_error: "Limit must be a number." })
    .int({ message: "Limit must be an integer." })
    .positive({ message: "Limit must be a positive number." })
    .max(MAX_PAGE_LIMIT, `Limit cannot exceed ${MAX_PAGE_LIMIT}.`)
    .default(DEFAULT_PAGE_LIMIT)
    .openapi({
      description: `Number of items per page (max ${MAX_PAGE_LIMIT}).`,
      example: 10,
    }),
  sortBy: z.string().trim().optional().openapi({
    description:
      'Field to sort by and direction, e.g., "createdAt:desc" or "title:asc".',
    example: "createdAt:desc",
  }),
  search: z.string().trim().optional().openapi({
    description: "Search term to filter results across relevant fields.",
    example: "Orwell",
  }),
});

export const PaginationMetaSchema = z
  .object({
    totalItems: z.number().int().openapi({
      example: 100,
      description: "Total number of items available.",
    }),
    itemCount: z.number().int().openapi({
      example: 10,
      description: "Number of items in the current response.",
    }),
    itemsPerPage: z.number().int().openapi({
      example: 10,
      description: "Number of items requested per page.",
    }),
    totalPages: z.number().int().openapi({
      example: 10,
      description: "Total number of pages available.",
    }),
    currentPage: z
      .number()
      .int()
      .openapi({ example: 1, description: "The current page number." }),
  })
  .openapi({
    ref: "PaginationMeta",
    description: "Metadata for paginated responses.",
  });

export const ErrorDetailSchema = z
  .object({
    field: z.string().optional().openapi({ example: "body.password" }),
    message: z.string().openapi({ example: "Password is too short." }),
    code: z.string().optional().openapi({ example: "too_small" }),
  })
  .openapi({
    description: "Details of a specific validation error.",
  });

export const ErrorResponseSchema = z
  .object({
    status: z.enum(["fail", "error"]).openapi({
      example: "fail",
      description:
        "'fail' for client errors (4xx), 'error' for server errors (5xx).",
    }),
    message: z.string().openapi({ example: "Resource not found." }),
    reqId: z.string().uuid().optional().openapi({
      description: "Unique request identifier for tracing.",
      example: "0b69f2f8-5fa3-4215-bb47-c7391760b91c",
    }),
    errors: z.array(ErrorDetailSchema).optional().openapi({
      description:
        "Array of specific validation error details (if applicable).",
    }),
  })
  .openapi({
    ref: "ErrorResponse",
    description: "Standardized error response structure.",
  });

export type IdParamDto = z.infer<typeof IdParamSchema>;
export type PaginationQueryDto = z.infer<typeof PaginationQuerySchema>;
