import { z } from "zod";
import {
  DEFAULT_PAGE_LIMIT,
  DEFAULT_PAGE_NUMBER,
  ErrorMessages,
  MAX_PAGE_LIMIT,
} from "@/constants";

export const objectIdRegex = /^[0-9a-fA-F]{24}$/;
export const ZodObjectId = z
  .string({
    required_error: "ID is required.",
    invalid_type_error: "ID must be a string.",
  })
  .regex(objectIdRegex, { message: ErrorMessages.INVALID_OBJECT_ID });

export const PaginationQuerySchema = z.object({
  page: z.coerce
    .number({ invalid_type_error: "Page must be a number." })
    .int({ message: "Page must be an integer." })
    .positive({ message: "Page must be a positive number." })
    .default(DEFAULT_PAGE_NUMBER),
  limit: z.coerce
    .number({ invalid_type_error: "Limit must be a number." })
    .int({ message: "Limit must be an integer." })
    .positive({ message: "Limit must be a positive number." })
    .max(MAX_PAGE_LIMIT, { message: `Limit cannot exceed ${MAX_PAGE_LIMIT}.` })
    .default(DEFAULT_PAGE_LIMIT),
  sortBy: z
    .string()
    .trim()
    .optional()
    .describe(
      'Sort by field and direction, e.g., "createdAt:desc" or "title:asc"'
    ),
  search: z
    .string()
    .trim()
    .optional()
    .describe("Search term for filtering results."),
});
export type PaginationQueryDto = z.infer<typeof PaginationQuerySchema>;

export const IdParamSchema = z.object({
  id: ZodObjectId.describe("The unique identifier (ObjectId) of the resource."),
});
export type IdParamDto = z.infer<typeof IdParamSchema>;
