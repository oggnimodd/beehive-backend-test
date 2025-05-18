import { z } from "zod";
import { ErrorMessages } from "@/constants";

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

export const RegisterUserSchema = z.object({
  body: z
    .object({
      email: z
        .string({
          required_error: "Email is required.",
          invalid_type_error: "Email must be a string.",
        })
        .min(MIN_EMAIL_LENGTH, {
          message: `Email must be at least ${MIN_EMAIL_LENGTH} characters long.`,
        })
        .max(MAX_EMAIL_LENGTH, {
          message: `Email cannot exceed ${MAX_EMAIL_LENGTH} characters.`,
        })
        .email({ message: "Invalid email address format." })
        .trim()
        .toLowerCase()
        .describe("User registration email address."),

      password: z
        .string({
          required_error: "Password is required.",
          invalid_type_error: "Password must be a string.",
        })
        .min(MIN_PASSWORD_LENGTH, {
          message: ErrorMessages.PASSWORD_TOO_SHORT(MIN_PASSWORD_LENGTH),
        })
        .max(MAX_PASSWORD_LENGTH, {
          message: `Password cannot exceed ${MAX_PASSWORD_LENGTH} characters.`,
        })
        .superRefine((password, ctx) => {
          if (!hasUpperCase(password)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message:
                "Password must include at least one uppercase letter (A-Z).",
              fatal: false,
            });
          }
          if (!hasLowerCase(password)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message:
                "Password must include at least one lowercase letter (a-z).",
              fatal: false,
            });
          }
          if (!hasDigit(password)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "Password must include at least one digit (0-9).",
              fatal: false,
            });
          }
          if (!hasSpecialChar(password)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message:
                "Password must include at least one special character (e.g., @, $, !, %, *, ?, &).",
              fatal: false,
            });
          }
        })
        .describe(
          "User registration password. Must meet complexity requirements."
        ),

      name: z
        .string({
          invalid_type_error: "Name must be a string.",
        })
        .min(MIN_NAME_LENGTH, {
          message: ErrorMessages.NAME_TOO_SHORT(MIN_NAME_LENGTH),
        })
        .max(MAX_NAME_LENGTH, {
          message: `Name cannot exceed ${MAX_NAME_LENGTH} characters.`,
        })
        .trim()
        .optional()
        .describe("Optional user name."),
    })
    .strict("Unrecognized fields in request body are not allowed."),
});

export type RegisterUserDto = z.infer<typeof RegisterUserSchema>["body"];

export const LoginUserSchema = z.object({
  body: z
    .object({
      email: z
        .string({ required_error: "Email is required." })
        .email({ message: "Invalid email address format." })
        .trim()
        .toLowerCase()
        .describe("User login email address."),

      password: z
        .string({ required_error: "Password is required." })
        .min(1, { message: "Password cannot be empty." })
        .max(MAX_PASSWORD_LENGTH, {
          message: `Password cannot exceed ${MAX_PASSWORD_LENGTH} characters.`,
        })
        .describe("User login password."),
    })
    .strict("Unrecognized fields in request body are not allowed."),
});

export type LoginUserDto = z.infer<typeof LoginUserSchema>["body"];
