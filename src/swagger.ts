import "zod-openapi/extend";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { createDocument } from "zod-openapi";

import { config } from "@/config";

import {
  AuthResponseDataSchema,
  LoginUserInputSchema,
  UserOutputSchema,
  UserRegistrationInputSchema,
} from "@/dto/auth.dto";
import { ErrorResponseSchema } from "@/dto/shared.dto";

let apiBaseUrl = "";
let serverDescription = "API Server";

if (
  process.env.NETLIFY_DEV === "true" ||
  process.env.NETLIFY_LOCAL === "true"
) {
  const netlifyDevPort = process.env.PORT || 8888;
  apiBaseUrl = `http://localhost:${netlifyDevPort}`;
  serverDescription = "Netlify Dev Server";
} else if (config.nodeEnv === "development" && !process.env.NETLIFY) {
  apiBaseUrl = `http://localhost:${config.port}`;
  serverDescription = "Local Development Server (Direct)";
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
      url: `${apiBaseUrl}/api/v1`,
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
      },
    } as const,
  },
  tags: [
    {
      name: "Auth",
      description:
        "Endpoints for User Authentication (Registration, Login) and Profile Management",
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
        description:
          "Allows a new user to register by providing email, password, and an optional name. Returns the created user object (password excluded) and a JWT token for immediate login.",
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
            description:
              "User registered successfully. Includes user data and JWT.",
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
            description:
              "Bad Request (e.g., validation error, email already exists).",
            content: { "application/json": { schema: ErrorResponseSchema } },
          },
          "500": {
            description: "Internal Server Error.",
            content: { "application/json": { schema: ErrorResponseSchema } },
          },
        },
      },
    },
    "/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Log in an existing user",
        description:
          "Authenticates an existing user with their email and password. Returns the user object (password excluded) and a JWT token upon successful authentication.",
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: LoginUserInputSchema },
          },
        },
        responses: {
          "200": {
            description:
              "User logged in successfully. Includes user data and JWT.",
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
            description: "Bad Request (e.g., invalid input format).",
            content: { "application/json": { schema: ErrorResponseSchema } },
          },
          "401": {
            description: "Unauthorized (e.g., invalid credentials).",
            content: { "application/json": { schema: ErrorResponseSchema } },
          },
          "500": {
            description: "Internal Server Error.",
            content: { "application/json": { schema: ErrorResponseSchema } },
          },
        },
      },
    },
    "/auth/me": {
      get: {
        tags: ["Auth"],
        summary: "Get current authenticated user profile",
        description:
          "Retrieves the profile information (excluding password) for the currently authenticated user. Requires a valid JWT to be passed in the Authorization header (Bearer scheme).",
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
              "Unauthorized (Token missing, invalid, expired, or user not found).",
            content: { "application/json": { schema: ErrorResponseSchema } },
          },
          "500": {
            description: "Internal Server Error.",
            content: { "application/json": { schema: ErrorResponseSchema } },
          },
        },
      },
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
    console.log(
      `   Server URL configured in spec: ${document.servers?.[0]?.url}`
    );
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
