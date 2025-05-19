import "zod-openapi/extend";
import { ErrorMessages } from "@/constants";
import { z } from "zod";
import { ZodObjectId } from "./shared.dto";

const MIN_BOOK_TITLE_LENGTH = 2;
const MAX_BOOK_TITLE_LENGTH = 200;
const ISBN_REGEX = /^(?:\d{10}|\d{13})$/;

export const BookTitleSchema = z
  .string({
    required_error: "Book title is required.",
    invalid_type_error: "Book title must be a string.",
  })
  .min(
    MIN_BOOK_TITLE_LENGTH,
    `Book title must be at least ${MIN_BOOK_TITLE_LENGTH} characters long.`
  )
  .max(
    MAX_BOOK_TITLE_LENGTH,
    `Book title cannot exceed ${MAX_BOOK_TITLE_LENGTH} characters.`
  )
  .trim()
  .openapi({
    description: "The title of the book.",
    example: "1984",
  });

export const BookIsbnSchema = z
  .string({
    invalid_type_error: "ISBN must be a string.",
  })
  .regex(ISBN_REGEX, "ISBN must be 10 or 13 digits with no hyphens or spaces.")
  .optional()
  .openapi({
    description: "The ISBN of the book (10 or 13 digits, no hyphens).",
    example: "9780451524935",
  });

export const BookPublishedDateSchema = z
  .string()
  .datetime({ message: "Published date must be in ISO format." })
  .optional()
  .transform((val) => (val ? new Date(val) : undefined))
  .openapi({
    description: "The publication date of the book in ISO format.",
    example: "1949-06-08T00:00:00Z",
  });

export const BookAuthorIdsSchema = z
  .array(
    ZodObjectId.openapi({
      description: "ID of an author associated with this book.",
    })
  )
  .min(1, "At least one author ID must be provided.")
  .openapi({
    description: "List of author IDs associated with this book.",
    example: ["60d21b4667d0d8992e610c85"],
  });

export const CreateBookInputSchema = z
  .object({
    title: BookTitleSchema,
    isbn: BookIsbnSchema,
    publishedDate: BookPublishedDateSchema,
    authorIds: BookAuthorIdsSchema,
  })
  .openapi({
    ref: "CreateBookInput",
    description: "Data required to create a new book.",
  });

export const UpdateBookInputSchema = z
  .object({
    title: BookTitleSchema.optional(),
    isbn: BookIsbnSchema,
    publishedDate: BookPublishedDateSchema,
    authorIds: BookAuthorIdsSchema.optional(),
  })
  .refine(
    (data) => {
      return (
        data.title !== undefined ||
        data.isbn !== undefined ||
        data.publishedDate !== undefined ||
        data.authorIds !== undefined
      );
    },
    {
      message: ErrorMessages.NO_UPDATE_DATA,
      path: [],
    }
  )
  .openapi({
    ref: "UpdateBookInput",
    description:
      "Data for updating a book. At least one field must be provided.",
  });

export const BookAuthorSchema = z
  .object({
    id: ZodObjectId.openapi({
      description: "Unique identifier of the author.",
    }),
    name: z.string().openapi({
      description: "Name of the author.",
      example: "George Orwell",
    }),
  })
  .openapi({
    ref: "BookAuthor",
    description: "Basic author information included in book responses.",
  });

export const BookOutputSchema = z
  .object({
    id: ZodObjectId.openapi({
      description: "Unique identifier of the book.",
    }),
    title: BookTitleSchema,
    isbn: BookIsbnSchema.nullable(),
    publishedDate: z.date().nullable().openapi({
      description: "Publication date of the book.",
      type: "string",
      format: "date-time",
    }),
    createdAt: z.date().openapi({
      description: "Timestamp of book creation.",
      type: "string",
      format: "date-time",
    }),
    updatedAt: z.date().openapi({
      description: "Timestamp of last book update.",
      type: "string",
      format: "date-time",
    }),
    authors: z.array(BookAuthorSchema).openapi({
      description: "List of authors who wrote this book.",
    }),
    isFavorite: z.boolean().optional().openapi({
      description:
        "Indicates if the book is favorited by the currently authenticated user. Only present when the context provides this information.",
      example: true,
    }),
  })
  .openapi({
    ref: "BookOutput",
    description:
      "Represents a book object as returned by the API. May include 'isFavorite' status and author information.",
  });

export const CreateBookRequestSchema = z.object({
  body: CreateBookInputSchema,
});

export const UpdateBookRequestSchema = z.object({
  body: UpdateBookInputSchema,
});

export type CreateBookDto = z.infer<typeof CreateBookInputSchema>;
export type UpdateBookDto = z.infer<typeof UpdateBookInputSchema>;
export type BookOutput = z.infer<typeof BookOutputSchema>;
export type BookAuthorDto = z.infer<typeof BookAuthorSchema>;
