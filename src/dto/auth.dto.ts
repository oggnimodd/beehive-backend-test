import "zod-openapi/extend";
import { ErrorMessages } from "@/constants";
import { z } from "zod";
import { ZodObjectId } from "./shared.dto";

const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 128;
const MIN_EMAIL_LENGTH = 5;
const MAX_EMAIL_LENGTH = 254;
const MIN_NAME_LENGTH = 2;
const MAX_NAME_LENGTH = 50;

const hasUpperCase = (str: string): boolean => /[A-Z]/.test(str);
const hasLowerCase = (str: string): boolean => /[a-z]/.test(str);
const hasDigit = (str: string): boolean => /\d/.test(str);
const hasSpecialChar = (str: string): boolean => /[@$!%*?&]/.test(str);

export const EmailSchema = z
  .string({
    required_error: "Email is required.",
    invalid_type_error: "Email must be a string.",
  })
  .min(
    MIN_EMAIL_LENGTH,
    `Email must be at least ${MIN_EMAIL_LENGTH} characters long.`
  )
  .max(MAX_EMAIL_LENGTH, `Email cannot exceed ${MAX_EMAIL_LENGTH} characters.`)
  .email("Invalid email address format.")
  .trim()
  .toLowerCase()
  .openapi({
    description: "User's email address.",
    example: "test.user@example.com",
  });

export const PasswordInputSchema = z
  .string({
    required_error: "Password is required.",
    invalid_type_error: "Password must be a string.",
  })
  .min(
    MIN_PASSWORD_LENGTH,
    ErrorMessages.PASSWORD_TOO_SHORT(MIN_PASSWORD_LENGTH)
  )
  .max(
    MAX_PASSWORD_LENGTH,
    `Password cannot exceed ${MAX_PASSWORD_LENGTH} characters.`
  )
  .superRefine((password, ctx) => {
    if (!hasUpperCase(password)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Password must include at least one uppercase letter (A-Z).",
      });
    }
    if (!hasLowerCase(password)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Password must include at least one lowercase letter (a-z).",
      });
    }
    if (!hasDigit(password)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Password must include at least one digit (0-9).",
      });
    }
    if (!hasSpecialChar(password)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Password must include at least one special character (e.g., @, $, !, %, *, ?, &).",
      });
    }
  })
  .openapi({
    description:
      "User password for registration. Must meet complexity requirements.",
    example: "Str0ngP@ss!",
    format: "password",
  });

export const UserNameSchema = z
  .string({ invalid_type_error: "Name must be a string." })
  .min(MIN_NAME_LENGTH, ErrorMessages.NAME_TOO_SHORT(MIN_NAME_LENGTH))
  .max(MAX_NAME_LENGTH, `Name cannot exceed ${MAX_NAME_LENGTH} characters.`)
  .trim()
  .openapi({
    description: "Optional display name of the user.",
    example: "Test User",
  });

export const UserRegistrationInputSchema = z
  .object({
    email: EmailSchema,
    password: PasswordInputSchema,
    name: UserNameSchema.optional(),
  })
  .openapi({
    ref: "UserRegistrationInput",
    description: "Data required for new user registration.",
  });

export const LoginUserInputSchema = z
  .object({
    email: EmailSchema,
    password: z
      .string({ required_error: "Password is required." })
      .min(1, "Password cannot be empty.")
      .max(
        MAX_PASSWORD_LENGTH,
        `Password cannot exceed ${MAX_PASSWORD_LENGTH} characters.`
      )
      .openapi({
        description: "User password for login.",
        example: "password123",
        format: "password",
      }),
  })
  .openapi({
    ref: "UserLoginInput",
    description: "Credentials required for user login.",
  });

export const UserOutputSchema = z
  .object({
    id: ZodObjectId.openapi({ description: "Unique identifier of the user." }),
    email: EmailSchema.openapi({ description: "User's email address." }),
    name: UserNameSchema.optional().openapi({
      description: "User's display name (if provided).",
    }),
    createdAt: z.date().openapi({
      description: "Timestamp of user creation.",
      type: "string",
      format: "date-time",
    }),
    updatedAt: z.date().openapi({
      description: "Timestamp of last user update.",
      type: "string",
      format: "date-time",
    }),
  })
  .openapi({
    ref: "UserOutput",
    description:
      "Represents a user object as returned by the API (password excluded).",
  });

export const AuthResponseDataSchema = z
  .object({
    user: UserOutputSchema,
    token: z.string().openapi({
      description: "JWT authentication token for subsequent requests.",
      example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2...",
    }),
  })
  .openapi({
    ref: "AuthResponseData",
    description: "Contains the authenticated user details and JWT token.",
  });

export const RegisterUserRequestSchema = z.object({
  body: UserRegistrationInputSchema,
});

export const LoginUserRequestSchema = z.object({
  body: LoginUserInputSchema,
});

export type RegisterUserDto = z.infer<typeof UserRegistrationInputSchema>;
export type LoginUserDto = z.infer<typeof LoginUserInputSchema>;

export type UserOutput = z.infer<typeof UserOutputSchema>;
