import { writeFile } from "node:fs/promises";
import path from "node:path";
import { config } from "@/config";
import {
  AuthResponseDataSchema,
  LoginUserInputSchema,
  UserOutputSchema,
  UserRegistrationInputSchema,
} from "@/dto/auth.dto";
import {
  AuthorOutputSchema,
  CreateAuthorInputSchema,
  UpdateAuthorInputSchema,
} from "@/dto/author.dto";
import {
  BookOutputSchema,
  CreateBookInputSchema,
  UpdateBookInputSchema,
} from "@/dto/book.dto";
import {
  ErrorResponseSchema,
  PaginationMetaSchema,
  ZodObjectId,
} from "@/dto/shared.dto";
import { z } from "zod";
import {
  type ZodOpenApiOperationObject,
  createDocument,
  extendZodWithOpenApi,
} from "zod-openapi";

extendZodWithOpenApi(z);

const IdPathParameter = ZodObjectId.openapi({
  description: "The unique identifier (ObjectId) of the resource.",
  example: "60c72b2f9b1e8a5a4c8f0b1a",
});

const PageQueryParameter = z.coerce
  .number()
  .optional()
  .default(1)
  .openapi({ description: "Page number for pagination.", example: 1 });

const LimitQueryParameter = z.coerce
  .number()
  .optional()
  .default(10)
  .openapi({ description: "Items per page (max 100).", example: 10 });

const SortByQueryParameter = z.string().optional().openapi({
  description: 'Field to sort by and direction, e.g., "createdAt:desc".',
  example: "createdAt:desc",
});

const SearchQueryParameter = z.string().optional().openapi({
  description: "Search term to filter results.",
  example: "Orwell",
});

const AuthorIdQueryParameter = ZodObjectId.optional().openapi({
  description: "Filter books by a specific author ID.",
  example: "60c72b2f9b1e8a5a4c8f0b1a",
});

let apiBaseUrl = "";
let serverDescription = "API Server";
if (
  process.env.NETLIFY_DEV === "true" ||
  process.env.NETLIFY_LOCAL === "true"
) {
  const netlifyDevPort = process.env.PORT || 8888;
  apiBaseUrl = `http://localhost:${netlifyDevPort}`;
  serverDescription = "Netlify Dev Server";
} else if (process.env.API_BASE_URL) {
  apiBaseUrl = process.env.API_BASE_URL;
  serverDescription = "Production Server";
} else if (config.nodeEnv === "development") {
  apiBaseUrl = `http://localhost:${config.port}`;
  serverDescription = "Local Development Server (Direct)";
} else {
  console.warn(
    "WARN: API_BASE_URL or specific development configuration not found for Swagger. API calls from docs might not be correctly targeted. Defaulting to relative /api/v1."
  );
  apiBaseUrl = "";
  serverDescription = "API Server (URL Undefined)";
}

const documentBase = {
  info: {
    version: "v1.0.0",
    title: "Beehive Backend API",
    description:
      "API for managing books and authors, with JWT authentication. Built with Bun, Express, Prisma, and MongoDB.",
    contact: {
      name: "Orenji The Developer",
    },
  },
  servers: [
    {
      url: apiBaseUrl ? `${apiBaseUrl}/api/v1` : "/api/v1",
      description: serverDescription,
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: 'Enter JWT Bearer token: "Bearer {token}"',
      } as const,
    },
    schemas: {
      UserRegistrationInput: UserRegistrationInputSchema,
      UserLoginInput: LoginUserInputSchema,
      AuthResponseData: AuthResponseDataSchema,
      UserOutput: UserOutputSchema,
      CreateAuthorInput: CreateAuthorInputSchema,
      UpdateAuthorInput: UpdateAuthorInputSchema,
      AuthorOutput: AuthorOutputSchema,
      CreateBookInput: CreateBookInputSchema,
      UpdateBookInput: UpdateBookInputSchema,
      BookOutput: BookOutputSchema,
      ErrorResponse: ErrorResponseSchema,
      PaginationMeta: PaginationMetaSchema,
    },
  },
  tags: [
    {
      name: "Auth",
      description:
        "Endpoints for User Authentication (Registration, Login) and Profile Management",
    },
    {
      name: "Authors",
      description:
        "Endpoints for managing Author resources. All operations are scoped to authors created by the authenticated user.",
    },
    {
      name: "Books",
      description:
        "Endpoints for managing Book resources. All operations are scoped to books created by the authenticated user.",
    },
    {
      name: "Favorites",
      description:
        "Endpoints for managing the authenticated user's favorite authors and books. Users can only favorite items they have created.",
    },
  ],
};

const document = createDocument({
  openapi: "3.0.3",
  ...documentBase,
  paths: {
    "/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Register a new user account",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: UserRegistrationInputSchema,
            },
          },
        },
        responses: {
          "201": {
            description: "User registered successfully.",
            content: {
              "application/json": {
                schema: z.object({
                  status: z.string().openapi({ example: "success" }),
                  message: z.string().openapi({
                    example: "User registered successfully. Please log in.",
                  }),
                  data: AuthResponseDataSchema,
                }),
              },
            },
          },
          "400": {
            description: "Bad Request (e.g., validation error, email exists)",
            content: {
              "application/json": { schema: ErrorResponseSchema },
            },
          },
          "500": {
            description: "Internal Server Error",
            content: {
              "application/json": { schema: ErrorResponseSchema },
            },
          },
        },
      } satisfies ZodOpenApiOperationObject,
    },
    "/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Log in an existing user",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: LoginUserInputSchema,
            },
          },
        },
        responses: {
          "200": {
            description: "User logged in successfully.",
            content: {
              "application/json": {
                schema: z.object({
                  status: z.string().openapi({ example: "success" }),
                  message: z.string().openapi({ example: "Login successful." }),
                  data: AuthResponseDataSchema,
                }),
              },
            },
          },
          "400": {
            description: "Bad Request (e.g., validation error)",
            content: {
              "application/json": { schema: ErrorResponseSchema },
            },
          },
          "401": {
            description: "Unauthorized (e.g., invalid credentials)",
            content: {
              "application/json": { schema: ErrorResponseSchema },
            },
          },
          "500": {
            description: "Internal Server Error",
            content: {
              "application/json": { schema: ErrorResponseSchema },
            },
          },
        },
      } satisfies ZodOpenApiOperationObject,
    },
    "/auth/me": {
      get: {
        tags: ["Auth"],
        summary: "Get current authenticated user profile",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "User profile retrieved successfully.",
            content: {
              "application/json": {
                schema: z.object({
                  status: z.string().openapi({ example: "success" }),
                  data: UserOutputSchema,
                }),
              },
            },
          },
          "401": {
            description:
              "Unauthorized (e.g., token missing, invalid, or user not found)",
            content: {
              "application/json": { schema: ErrorResponseSchema },
            },
          },
          "500": {
            description: "Internal Server Error",
            content: {
              "application/json": { schema: ErrorResponseSchema },
            },
          },
        },
      } satisfies ZodOpenApiOperationObject,
    },
    "/authors": {
      get: {
        tags: ["Authors"],
        summary: "Get all authors created by the current user",
        security: [{ bearerAuth: [] }],
        requestParams: {
          query: z.object({
            page: PageQueryParameter,
            limit: LimitQueryParameter,
            sortBy: SortByQueryParameter,
            search: SearchQueryParameter,
          }),
        },
        responses: {
          "200": {
            description: "A list of authors created by the current user.",
            content: {
              "application/json": {
                schema: z.object({
                  status: z.string().openapi({ example: "success" }),
                  data: z.array(AuthorOutputSchema),
                  meta: PaginationMetaSchema,
                }),
              },
            },
          },
          "400": {
            description: "Bad Request (e.g., validation error on query params)",
            content: {
              "application/json": { schema: ErrorResponseSchema },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": { schema: ErrorResponseSchema },
            },
          },
          "500": {
            description: "Internal Server Error",
            content: {
              "application/json": { schema: ErrorResponseSchema },
            },
          },
        },
      } satisfies ZodOpenApiOperationObject,
      post: {
        tags: ["Authors"],
        summary: "Create a new author",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: CreateAuthorInputSchema,
            },
          },
        },
        responses: {
          "201": {
            description: "Author created successfully.",
            content: {
              "application/json": {
                schema: z.object({
                  status: z.string().openapi({ example: "success" }),
                  message: z
                    .string()
                    .openapi({ example: "Author created successfully." }),
                  data: AuthorOutputSchema,
                }),
              },
            },
          },
          "400": {
            description: "Bad Request (e.g., validation error)",
            content: {
              "application/json": { schema: ErrorResponseSchema },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": { schema: ErrorResponseSchema },
            },
          },
          "500": {
            description: "Internal Server Error",
            content: {
              "application/json": { schema: ErrorResponseSchema },
            },
          },
        },
      } satisfies ZodOpenApiOperationObject,
    },
    "/authors/{id}": {
      get: {
        tags: ["Authors"],
        summary: "Get a specific author by ID",
        security: [{ bearerAuth: [] }],
        requestParams: {
          path: z.object({ id: IdPathParameter }),
        },
        responses: {
          "200": {
            description: "Details of the author.",
            content: {
              "application/json": {
                schema: z.object({
                  status: z.string().openapi({ example: "success" }),
                  data: AuthorOutputSchema,
                }),
              },
            },
          },
          "400": {
            description: "Bad Request (invalid ID format)",
            content: {
              "application/json": { schema: ErrorResponseSchema },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": { schema: ErrorResponseSchema },
            },
          },
          "403": {
            description: "Forbidden (user does not own this author)",
            content: {
              "application/json": { schema: ErrorResponseSchema },
            },
          },
          "404": {
            description: "Author not found",
            content: {
              "application/json": { schema: ErrorResponseSchema },
            },
          },
          "500": {
            description: "Internal Server Error",
            content: {
              "application/json": { schema: ErrorResponseSchema },
            },
          },
        },
      } satisfies ZodOpenApiOperationObject,
      patch: {
        tags: ["Authors"],
        summary: "Update an existing author",
        security: [{ bearerAuth: [] }],
        requestParams: {
          path: z.object({ id: IdPathParameter }),
        },
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: UpdateAuthorInputSchema,
            },
          },
        },
        responses: {
          "200": {
            description: "Author updated successfully.",
            content: {
              "application/json": {
                schema: z.object({
                  status: z.string().openapi({ example: "success" }),
                  message: z
                    .string()
                    .openapi({ example: "Author updated successfully." }),
                  data: AuthorOutputSchema,
                }),
              },
            },
          },
          "400": {
            description: "Bad Request (e.g., validation error, no update data)",
            content: {
              "application/json": { schema: ErrorResponseSchema },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": { schema: ErrorResponseSchema },
            },
          },
          "403": {
            description: "Forbidden (user does not own this author)",
            content: {
              "application/json": { schema: ErrorResponseSchema },
            },
          },
          "404": {
            description: "Author not found",
            content: {
              "application/json": { schema: ErrorResponseSchema },
            },
          },
          "500": {
            description: "Internal Server Error",
            content: {
              "application/json": { schema: ErrorResponseSchema },
            },
          },
        },
      } satisfies ZodOpenApiOperationObject,
      delete: {
        tags: ["Authors"],
        summary: "Delete an author by ID",
        security: [{ bearerAuth: [] }],
        requestParams: {
          path: z.object({ id: IdPathParameter }),
        },
        responses: {
          "200": {
            description: "Author deleted successfully.",
            content: {
              "application/json": {
                schema: z.object({
                  status: z.string().openapi({ example: "success" }),
                  message: z
                    .string()
                    .openapi({ example: "Author deleted successfully." }),
                  data: z.null().openapi({ example: null }),
                }),
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": { schema: ErrorResponseSchema },
            },
          },
          "403": {
            description: "Forbidden (user does not own this author)",
            content: {
              "application/json": { schema: ErrorResponseSchema },
            },
          },
          "404": {
            description: "Author not found",
            content: {
              "application/json": { schema: ErrorResponseSchema },
            },
          },
          "409": {
            description: "Conflict (e.g., author has associated books)",
            content: {
              "application/json": { schema: ErrorResponseSchema },
            },
          },
          "500": {
            description: "Internal Server Error",
            content: {
              "application/json": { schema: ErrorResponseSchema },
            },
          },
        },
      } satisfies ZodOpenApiOperationObject,
    },
    "/authors/{id}/favorite": {
      post: {
        tags: ["Favorites", "Authors"],
        summary: "Add an author to the current user's favorites",
        security: [{ bearerAuth: [] }],
        requestParams: {
          path: z.object({ id: IdPathParameter }),
        },
        responses: {
          "200": {
            description: "Author added to favorites successfully.",
            content: {
              "application/json": {
                schema: z.object({
                  status: z.string().openapi({ example: "success" }),
                  message: z.string().openapi({
                    example: "Author added to favorites successfully.",
                  }),
                }),
              },
            },
          },
          "400": {
            description:
              "Bad Request (e.g., author already in favorites, invalid ID)",
            content: {
              "application/json": { schema: ErrorResponseSchema },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": { schema: ErrorResponseSchema },
            },
          },
          "403": {
            description: "Forbidden (user does not own the author to favorite)",
            content: {
              "application/json": { schema: ErrorResponseSchema },
            },
          },
          "404": {
            description: "Author or User not found",
            content: {
              "application/json": { schema: ErrorResponseSchema },
            },
          },
          "500": {
            description: "Internal Server Error",
            content: {
              "application/json": { schema: ErrorResponseSchema },
            },
          },
        },
      } satisfies ZodOpenApiOperationObject,
      delete: {
        tags: ["Favorites", "Authors"],
        summary: "Remove an author from the current user's favorites",
        security: [{ bearerAuth: [] }],
        requestParams: {
          path: z.object({ id: IdPathParameter }),
        },
        responses: {
          "200": {
            description: "Author removed from favorites successfully.",
            content: {
              "application/json": {
                schema: z.object({
                  status: z.string().openapi({ example: "success" }),
                  message: z.string().openapi({
                    example: "Author removed from favorites successfully.",
                  }),
                }),
              },
            },
          },
          "400": {
            description:
              "Bad Request (e.g., author not in favorites, invalid ID)",
            content: {
              "application/json": { schema: ErrorResponseSchema },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": { schema: ErrorResponseSchema },
            },
          },
          "403": {
            description:
              "Forbidden (user does not own the author to unfavorite)",
            content: {
              "application/json": { schema: ErrorResponseSchema },
            },
          },
          "404": {
            description: "Author or User not found",
            content: {
              "application/json": { schema: ErrorResponseSchema },
            },
          },
          "500": {
            description: "Internal Server Error",
            content: {
              "application/json": { schema: ErrorResponseSchema },
            },
          },
        },
      } satisfies ZodOpenApiOperationObject,
    },
    "/favorites/authors": {
      get: {
        tags: ["Favorites"],
        summary: "Get the current user's favorite authors",
        description:
          "Retrieves a paginated list of authors that the authenticated user has marked as favorite. Note: Only authors originally created by this user can be favorited and will appear in this list. The 'sortBy' and 'search' query parameters are accepted by validation but currently not fully implemented for filtering/sorting this specific list by the backend service beyond basic ID matching.",
        security: [{ bearerAuth: [] }],
        requestParams: {
          query: z.object({
            page: PageQueryParameter,
            limit: LimitQueryParameter,
            sortBy: SortByQueryParameter,
            search: SearchQueryParameter,
          }),
        },
        responses: {
          "200": {
            description: "A list of the current user's favorite authors.",
            content: {
              "application/json": {
                schema: z.object({
                  status: z.string().openapi({ example: "success" }),
                  data: z.array(
                    AuthorOutputSchema.extend({
                      isFavorite: z.literal(true).openapi({
                        description: "Always true for authors in this list.",
                        example: true,
                      }),
                    })
                  ),
                  meta: PaginationMetaSchema,
                }),
              },
            },
          },
          "400": {
            description: "Bad Request (e.g., validation error on query params)",
            content: {
              "application/json": { schema: ErrorResponseSchema },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": { schema: ErrorResponseSchema },
            },
          },
          "404": {
            description: "User not found (should not happen if token is valid)",
            content: {
              "application/json": { schema: ErrorResponseSchema },
            },
          },
          "500": {
            description: "Internal Server Error",
            content: {
              "application/json": { schema: ErrorResponseSchema },
            },
          },
        },
      } satisfies ZodOpenApiOperationObject,
    },
    "/books": {
      get: {
        tags: ["Books"],
        summary: "Get all books created by the current user",
        security: [{ bearerAuth: [] }],
        requestParams: {
          query: z.object({
            page: PageQueryParameter,
            limit: LimitQueryParameter,
            sortBy: SortByQueryParameter,
            search: SearchQueryParameter,
            authorId: AuthorIdQueryParameter,
          }),
        },
        responses: {
          "200": {
            description: "A list of books created by the current user.",
            content: {
              "application/json": {
                schema: z.object({
                  status: z.string().openapi({ example: "success" }),
                  data: z.array(BookOutputSchema),
                  meta: PaginationMetaSchema,
                }),
              },
            },
          },
          "400": {
            description: "Bad Request (e.g., validation error on query params)",
            content: {
              "application/json": { schema: ErrorResponseSchema },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": { schema: ErrorResponseSchema },
            },
          },
          "500": {
            description: "Internal Server Error",
            content: {
              "application/json": { schema: ErrorResponseSchema },
            },
          },
        },
      } satisfies ZodOpenApiOperationObject,
      post: {
        tags: ["Books"],
        summary: "Create a new book",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: CreateBookInputSchema,
            },
          },
        },
        responses: {
          "201": {
            description: "Book created successfully.",
            content: {
              "application/json": {
                schema: z.object({
                  status: z.string().openapi({ example: "success" }),
                  message: z
                    .string()
                    .openapi({ example: "Book created successfully." }),
                  data: BookOutputSchema,
                }),
              },
            },
          },
          "400": {
            description:
              "Bad Request (e.g., validation error, author not found, ISBN exists)",
            content: {
              "application/json": { schema: ErrorResponseSchema },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": { schema: ErrorResponseSchema },
            },
          },
          "409": {
            description: "Conflict (e.g., ISBN already exists)",
            content: {
              "application/json": { schema: ErrorResponseSchema },
            },
          },
          "500": {
            description: "Internal Server Error",
            content: {
              "application/json": { schema: ErrorResponseSchema },
            },
          },
        },
      } satisfies ZodOpenApiOperationObject,
    },
    "/books/{id}": {
      get: {
        tags: ["Books"],
        summary: "Get a specific book by ID",
        security: [{ bearerAuth: [] }],
        requestParams: {
          path: z.object({ id: IdPathParameter }),
        },
        responses: {
          "200": {
            description: "Details of the book.",
            content: {
              "application/json": {
                schema: z.object({
                  status: z.string().openapi({ example: "success" }),
                  data: BookOutputSchema,
                }),
              },
            },
          },
          "400": {
            description: "Bad Request (invalid ID format)",
            content: {
              "application/json": { schema: ErrorResponseSchema },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": { schema: ErrorResponseSchema },
            },
          },
          "403": {
            description: "Forbidden (user does not own this book)",
            content: {
              "application/json": { schema: ErrorResponseSchema },
            },
          },
          "404": {
            description: "Book not found",
            content: {
              "application/json": { schema: ErrorResponseSchema },
            },
          },
          "500": {
            description: "Internal Server Error",
            content: {
              "application/json": { schema: ErrorResponseSchema },
            },
          },
        },
      } satisfies ZodOpenApiOperationObject,
      patch: {
        tags: ["Books"],
        summary: "Update an existing book",
        security: [{ bearerAuth: [] }],
        requestParams: {
          path: z.object({ id: IdPathParameter }),
        },
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: UpdateBookInputSchema,
            },
          },
        },
        responses: {
          "200": {
            description: "Book updated successfully.",
            content: {
              "application/json": {
                schema: z.object({
                  status: z.string().openapi({ example: "success" }),
                  message: z
                    .string()
                    .openapi({ example: "Book updated successfully." }),
                  data: BookOutputSchema,
                }),
              },
            },
          },
          "400": {
            description:
              "Bad Request (e.g., validation error, no update data, author not found, ISBN exists)",
            content: {
              "application/json": { schema: ErrorResponseSchema },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": { schema: ErrorResponseSchema },
            },
          },
          "403": {
            description: "Forbidden (user does not own this book)",
            content: {
              "application/json": { schema: ErrorResponseSchema },
            },
          },
          "404": {
            description: "Book not found",
            content: {
              "application/json": { schema: ErrorResponseSchema },
            },
          },
          "409": {
            description: "Conflict (e.g., ISBN already exists)",
            content: {
              "application/json": { schema: ErrorResponseSchema },
            },
          },
          "500": {
            description: "Internal Server Error",
            content: {
              "application/json": { schema: ErrorResponseSchema },
            },
          },
        },
      } satisfies ZodOpenApiOperationObject,
      delete: {
        tags: ["Books"],
        summary: "Delete a book by ID",
        security: [{ bearerAuth: [] }],
        requestParams: {
          path: z.object({ id: IdPathParameter }),
        },
        responses: {
          "200": {
            description: "Book deleted successfully.",
            content: {
              "application/json": {
                schema: z.object({
                  status: z.string().openapi({ example: "success" }),
                  message: z
                    .string()
                    .openapi({ example: "Book deleted successfully." }),
                  data: z.null().openapi({ example: null }),
                }),
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": { schema: ErrorResponseSchema },
            },
          },
          "403": {
            description: "Forbidden (user does not own this book)",
            content: {
              "application/json": { schema: ErrorResponseSchema },
            },
          },
          "404": {
            description: "Book not found",
            content: {
              "application/json": { schema: ErrorResponseSchema },
            },
          },
          "500": {
            description: "Internal Server Error",
            content: {
              "application/json": { schema: ErrorResponseSchema },
            },
          },
        },
      } satisfies ZodOpenApiOperationObject,
    },
    "/books/{id}/favorite": {
      post: {
        tags: ["Favorites", "Books"],
        summary: "Add a book to the current user's favorites",
        security: [{ bearerAuth: [] }],
        requestParams: {
          path: z.object({ id: IdPathParameter }),
        },
        responses: {
          "200": {
            description: "Book added to favorites successfully.",
            content: {
              "application/json": {
                schema: z.object({
                  status: z.string().openapi({ example: "success" }),
                  message: z.string().openapi({
                    example: "Book added to favorites successfully.",
                  }),
                }),
              },
            },
          },
          "400": {
            description:
              "Bad Request (e.g., book already in favorites, invalid ID)",
            content: {
              "application/json": { schema: ErrorResponseSchema },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": { schema: ErrorResponseSchema },
            },
          },
          "403": {
            description: "Forbidden (user does not own the book to favorite)",
            content: {
              "application/json": { schema: ErrorResponseSchema },
            },
          },
          "404": {
            description: "Book or User not found",
            content: {
              "application/json": { schema: ErrorResponseSchema },
            },
          },
          "500": {
            description: "Internal Server Error",
            content: {
              "application/json": { schema: ErrorResponseSchema },
            },
          },
        },
      } satisfies ZodOpenApiOperationObject,
      delete: {
        tags: ["Favorites", "Books"],
        summary: "Remove a book from the current user's favorites",
        security: [{ bearerAuth: [] }],
        requestParams: {
          path: z.object({ id: IdPathParameter }),
        },
        responses: {
          "200": {
            description: "Book removed from favorites successfully.",
            content: {
              "application/json": {
                schema: z.object({
                  status: z.string().openapi({ example: "success" }),
                  message: z.string().openapi({
                    example: "Book removed from favorites successfully.",
                  }),
                }),
              },
            },
          },
          "400": {
            description:
              "Bad Request (e.g., book not in favorites, invalid ID)",
            content: {
              "application/json": { schema: ErrorResponseSchema },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": { schema: ErrorResponseSchema },
            },
          },
          "403": {
            description: "Forbidden (user does not own the book to unfavorite)",
            content: {
              "application/json": { schema: ErrorResponseSchema },
            },
          },
          "404": {
            description: "Book or User not found",
            content: {
              "application/json": { schema: ErrorResponseSchema },
            },
          },
          "500": {
            description: "Internal Server Error",
            content: {
              "application/json": { schema: ErrorResponseSchema },
            },
          },
        },
      } satisfies ZodOpenApiOperationObject,
    },
  },
});

const outputFile = path.resolve(process.cwd(), "./src/swagger_output.json");

async function generateAndWriteSwaggerFile() {
  try {
    await writeFile(outputFile, JSON.stringify(document, null, 2), "utf-8");
    console.log(
      `✅ OpenAPI 3.0 specification generated successfully: ${outputFile}`
    );
    if (document.servers?.[0]) {
      console.log(` Server URL configured in spec: ${document.servers[0].url}`);
    }
    console.log(
      "Run your main application and navigate to /reference (or your configured Scalar path) to view the API docs."
    );
  } catch (error) {
    console.error(
      "❌ Error generating or writing OpenAPI specification:",
      error
    );
    process.exit(1);
  }
}

generateAndWriteSwaggerFile();
