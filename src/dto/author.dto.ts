import "zod-openapi/extend";
import { ErrorMessages } from "@/constants";
import { z } from "zod";
import { ZodObjectId } from "./shared.dto";

const MIN_AUTHOR_NAME_LENGTH = 2;
const MAX_AUTHOR_NAME_LENGTH = 100;
const MAX_AUTHOR_BIO_LENGTH = 1000;

export const AuthorNameSchema = z
  .string({
    required_error: "Author name is required.",
    invalid_type_error: "Author name must be a string.",
  })
  .min(
    MIN_AUTHOR_NAME_LENGTH,
    `Author name must be at least ${MIN_AUTHOR_NAME_LENGTH} characters long.`
  )
  .max(
    MAX_AUTHOR_NAME_LENGTH,
    `Author name cannot exceed ${MAX_AUTHOR_NAME_LENGTH} characters.`
  )
  .trim()
  .openapi({
    description: "The name of the author.",
    example: "George Orwell",
  });

export const AuthorBioSchema = z
  .string({
    invalid_type_error: "Author bio must be a string.",
  })
  .max(
    MAX_AUTHOR_BIO_LENGTH,
    `Author bio cannot exceed ${MAX_AUTHOR_BIO_LENGTH} characters.`
  )
  .trim()
  .openapi({
    description: "A short biography of the author.",
    example: "Eric Arthur Blair, known by his pen name George Orwell...",
  });

export const CreateAuthorInputSchema = z
  .object({
    name: AuthorNameSchema,
    bio: AuthorBioSchema.optional(),
  })
  .openapi({
    ref: "CreateAuthorInput",
    description: "Data required to create a new author.",
  });

export const UpdateAuthorInputSchema = z
  .object({
    name: AuthorNameSchema.optional(),
    bio: AuthorBioSchema.optional(),
  })
  .refine((data) => data.name !== undefined || data.bio !== undefined, {
    message: ErrorMessages.NO_UPDATE_DATA,
    path: [],
  })
  .openapi({
    ref: "UpdateAuthorInput",
    description:
      "Data for updating an author. At least one field (name or bio) must be provided.",
  });

export const AuthorOutputSchema = z
  .object({
    id: ZodObjectId.openapi({
      description: "Unique identifier of the author.",
    }),
    name: AuthorNameSchema,
    bio: AuthorBioSchema.optional().nullable(),
    createdAt: z.date().openapi({
      description: "Timestamp of author creation.",
      type: "string",
      format: "date-time",
    }),
    updatedAt: z.date().openapi({
      description: "Timestamp of last author update.",
      type: "string",
      format: "date-time",
    }),
    isFavorite: z.boolean().optional().openapi({
      description:
        "Indicates if the author is favorited by the currently authenticated user. Only present when the context provides this information.",
      example: true,
    }),
  })
  .openapi({
    ref: "AuthorOutput",
    description:
      "Represents an author object as returned by the API. May include 'isFavorite' status.",
  });

export const CreateAuthorRequestSchema = z.object({
  body: CreateAuthorInputSchema,
});

export const UpdateAuthorRequestSchema = z.object({
  body: UpdateAuthorInputSchema,
});

export type CreateAuthorDto = z.infer<typeof CreateAuthorInputSchema>;
export type UpdateAuthorDto = z.infer<typeof UpdateAuthorInputSchema>;
export type AuthorOutput = z.infer<typeof AuthorOutputSchema>;
