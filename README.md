# beehive-backend-test

This project is a RESTful API backend application developed for beehive technical assessment. It implements user authentication and management for authors and books.

## Technologies Used

- Bun
- Express.js (web framework)
- Netlify Functions (deployment environment)
- TypeScript
- Prisma (ORM)
- MongoDB (database)
- JWT (authentication)
- Zod (validation)
- Vitest & Supertest (testing)
- Biome (linter and formatter)
- Scalar (API documentation)
- ESBuild (build tool)

## Deployed API & Documentation

A deployed version of this API is available. You can explore the interactive API documentation here:

➡️ **[https://beehive-backend-test.netlify.app/reference](https://beehive-backend-test.netlify.app/reference)**

This documentation allows you to see available endpoints, request/response schemas, and directly test API calls.

To see the OpenAPI specification of the API, you can visit the following URL:

https://beehive-backend-test.netlify.app/swagger-output

## Functionalities and Endpoints

The API provides the following features:

*   **User Authentication (`/api/v1/auth`)**
    *   `POST /register`: Create a new user account.
    *   `POST /login`: Authenticate a user and receive a JWT.
    *   `GET /me`: Get the profile of the authenticated user.
*   **Author Management (`/api/v1/authors`)**
    *   Manage authors.
    *   `POST /`: Create a new author.
    *   `GET /`: Retrieve a paginated list of authors created by the authenticated user. Supports pagination, search, and sorting.
    *   `GET /:id`: Get details for a specific author.
    *   `PATCH /:id`: Update a specific author.
    *   `DELETE /:id`: Delete a specific author. Fails if the author is associated with books.
*   **Book Management (`/api/v1/books`)**
    *   Manage books.
    *   Books can be associated with one or more authors.
    *   `POST /`: Create a new book (requires specifying author IDs).
    *   `GET /`: Retrieve a paginated list of books created by the authenticated user. Supports pagination, search, sorting, and filtering by author ID.
    *   `GET /:id`: Get details for a specific book.
    *   `PATCH /:id`: Update a specific book.
    *   `DELETE /:id`: Delete a specific book.
*   **Favorites (`/api/v1/favorites`)**
    *   Users can mark authors and books as favorites.
    *   `POST /authors/:id/favorite`: Add an author to favorites.
    *   `DELETE /authors/:id/favorite`: Remove an author from favorites.
    *   `POST /books/:id/favorite`: Add a book to favorites.
    *   `DELETE /books/:id/favorite`: Remove a book from favorites.

## Folder Structure

The project follows a layered architecture:

```
.
├── biome.json          # Biome linter/formatter config
├── index.ts            # Server entry point
├── netlify/            # Netlify serverless function handler
│   └── functions/
│       └── api.ts      # Entry point for serverless Express app
├── netlify.toml        # Netlify build and redirect config
├── package.json        # Dependencies and scripts
├── prisma/             # Prisma schema and migrations
│   └── schema.prisma
├── scripts/            # Custom build scripts
│   └── build.ts        # Esbuild script for production build
├── src/
│   ├── config/         # Environment variable handling
│   ├── constants/      # Application constants
│   ├── controllers/    # Request handlers, delegate to services
│   ├── dao/            # Data Access Objects (Prisma interactions)
│   ├── db/             # Database client setup
│   ├── dto/            # Data Transfer Objects (Zod schemas)
│   ├── errors/         # Custom error classes
│   ├── main.ts         # Express app setup, middleware, routing, server start
│   ├── middlewares/    # Express middleware (auth, validation, error handling)
│   ├── routes/         # API route definitions
│   ├── services/       # Business logic
│   ├── swagger_output.json # Auto-generated OpenAPI spec
│   ├── swagger.ts      # Script to generate OpenAPI spec
│   ├── tests/          # Unit and Integration tests
│   │   ├── integration/ # Integration tests (Auth, Author, Helpers)
│   │   └── unit/        # Unit tests (Middleware, Services, Utils)
│   ├── types/          # Custom TypeScript type definitions
│   └── utils/          # Helper functions (JWT, password, logging, etc.)
├── tsconfig.json       # TypeScript config
└── vitest.config.ts    # Vitest config
```

## Setup

Install dependencies using Bun:

```bash
bun install
```

**Environment Variables:** Copy the `.env.example` file to a new file named `.env` and fill in the required values for your MongoDB connection string (`DATABASE_URL`), JWT secret (`JWT_SECRET`), etc.

Then, generate the Prisma client based on your schema and environment variables:

```bash
bun run db:generate
```

To run the application locally for development:

```bash
bun run dev
```

To develop the application inside netlify environment locally:

```bash
bun run dev:netlify
```

To build the application for production:

```bash
bun run build
```

To start the production server:

```bash
bun run start
```

## Continuous Integration (CI)

This project includes a CI setup. The CI pipeline is configured to automatically build the project and run the test suite on each commit or pull request.

The results of the tests, including test coverage reports, can be viewed directly within the CI system's dashboard for the repository.

## Testing

Tests are configured with Vitest and Supertest.

Run all tests locally:

```bash
bun test
```

Run tests with coverage report locally:

```bash
bun test:coverage
```

## TODO

*   Write integration tests for Book endpoints (CRUD and Favoriting/Unfavoriting via Book ID).
*   Write integration tests for Favorites endpoints (`GET /favorites/authors`).
