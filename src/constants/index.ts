export const ErrorMessages = {
  INTERNAL_SERVER_ERROR: "An unexpected internal server error occurred.",
  DATABASE_ERROR: "A database error occurred.",
  VALIDATION_ERROR: "Input validation failed. Please check your data.",
  RESOURCE_NOT_FOUND: (resource = "Resource") => `${resource} not found.`,
  INVALID_OBJECT_ID:
    "Invalid Object ID format. Please provide a valid 24-character hex string.",
  CONFLICT_ERROR:
    "The request could not be completed due to a conflict with the current state of the resource",

  USER_NOT_FOUND: "User not found.",
  INVALID_CREDENTIALS: "Invalid email or password. Please try again.",
  EMAIL_ALREADY_EXISTS: "An account with this email address already exists.",
  UNAUTHENTICATED: "Not authenticated. Please log in to access this resource.",
  UNAUTHORIZED_ACTION: "You are not authorized to perform this action.",
  TOKEN_INVALID: "Authentication token is invalid, malformed, or has expired.",
  USER_FOR_TOKEN_NOT_FOUND:
    "The user associated with this token no longer exists.",
  PASSWORD_TOO_SHORT: (minLength: number) =>
    `Password must be at least ${minLength} characters long.`,
  NAME_TOO_SHORT: (minLength: number) =>
    `Name must be at least ${minLength} characters long.`,

  BOOK_NOT_FOUND: "Book not found.",
  AUTHOR_NOT_FOUND: "Author not found.",
  CANNOT_DELETE_AUTHOR_WITH_BOOKS:
    "Cannot delete author: This author is still associated with one or more books. Please remove book associations first.",
  ITEM_ALREADY_IN_FAVORITES: (item = "Item") =>
    `${item} is already in your favorites.`,
  ITEM_NOT_IN_FAVORITES: (item = "Item") =>
    `${item} is not in your favorites to remove.`,
  AUTHOR_IDS_REQUIRED:
    "At least one valid author ID is required to create or update a book.",
  AUTHOR_ID_INVALID: (id: string) =>
    `Author ID "${id}" is invalid or does not exist.`,
  BOOK_ISBN_EXISTS: (isbn: string) =>
    `A book with ISBN "${isbn}" already exists.`,
  NO_UPDATE_DATA:
    "No data provided for update. At least one field must be specified.",

  ISBN_ALREADY_EXISTS: "ISBN already exists.",
};

export const DEFAULT_PAGE_NUMBER = 1;
export const DEFAULT_PAGE_LIMIT = 10;
export const MAX_PAGE_LIMIT = 100;
