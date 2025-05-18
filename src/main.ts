import express from "express";
import type { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import { StatusCodes } from "http-status-codes";
import pinoHttp from "pino-http";
import pino from "pino";
import { randomUUID } from "node:crypto";
import { apiReference } from "@scalar/express-api-reference";
import { config } from "@/config";
import appLogger from "@/utils/logger";
import { errorHandler } from "@/middlewares/error.middleware";
import mainRouter from "@/routes";
import { prisma } from "@/db/client";
import { fileURLToPath } from "node:url";
import path from "node:path";

import swaggerOutput from "./swagger_output.json";

const app = express();

app.get("/favicon.ico", (_req, res) => {
  res.sendStatus(StatusCodes.NO_CONTENT);
});

app.use(
  pinoHttp({
    logger: appLogger,
    genReqId: (req, res) => {
      const existingId =
        req.id ??
        req.headers["x-request-id"] ??
        req.headers["x-correlation-id"];
      if (existingId) return existingId as string;
      const id = randomUUID();
      res.setHeader("X-Request-Id", id);
      return id;
    },

    serializers: {
      req: (req) => ({
        id: req.id,
        method: req.method,
        url: req.url,
        remoteAddress: req.socket?.remoteAddress,
      }),
      res: (res) => ({
        statusCode: res.statusCode,
      }),
      err: pino.stdSerializers.err,
    },

    customLogLevel: (req, res, err) => {
      if (err || res.statusCode >= 500) return "error";
      if (res.statusCode >= 400) return "warn";
      if (res.statusCode >= 300 && res.statusCode < 400) return "silent";

      if (req.originalUrl === "/health" && res.statusCode === 200) {
        return "debug";
      }
      return "info";
    },

    customSuccessMessage: (req, res) => {
      if (req.originalUrl === "/health" && res.statusCode === 200) {
        return `Health check success: ${req.method} ${req.originalUrl} -> ${res.statusCode}`;
      }
      return `${req.method} ${req.originalUrl} -> ${res.statusCode}`;
    },
    customErrorMessage: (req, res, err) => {
      return `Client/Server Error: ${req.method} ${req.originalUrl} -> ${res.statusCode} - ${err.message}`;
    },
  })
);

app.use(cors());

app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "'unsafe-eval'",
          "https://cdn.jsdelivr.net",
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://cdn.jsdelivr.net",
          "https://fonts.scalar.com",
          "https://fonts.googleapis.com",
        ],
        fontSrc: [
          "'self'",
          "https://fonts.scalar.com",
          "https://fonts.gstatic.com",
          "data:",
        ],
        imgSrc: ["'self'", "data:", "https://cdn.jsdelivr.net"],
        connectSrc: ["'self'", "https://cdn.jsdelivr.net"],
        workerSrc: ["'self'", "blob:"],
      },
    },
  })
);

app.use(express.json({ limit: "25kb" }));
app.use(express.urlencoded({ extended: true, limit: "25kb" }));

app.use("/swagger-output", (_req, res) => {
  res.send(swaggerOutput);
});

app.use(
  "/reference",
  apiReference({
    theme: "purple",
    url: "/swagger-output",
    layout: "modern",
    showSidebar: true,
    defaultHttpClient: {
      targetKey: "js",
      clientKey: "fetch",
    },
    authentication: {
      preferredSecurityScheme: "bearerAuth",
    },
    metaData: {
      title: "Beehive Backend Test",
      description: "Beehive Backend Test",
    },
  })
);

app.use(mainRouter);

app.get("/health", (_req: Request, res: Response) => {
  res.status(StatusCodes.OK).json({
    status: "UP",
    timestamp: new Date().toISOString(),
  });
});

app.all("/{*splat}", (req: Request, res: Response) => {
  const requestId = (req as any).id;

  req.log.warn(
    {
      originalUrl: req.originalUrl,
      method: req.method,
      splatValue: req.params.splat,
    },
    "Resource not found"
  );

  res.status(StatusCodes.NOT_FOUND).json({
    status: "fail",
    message: `Sorry, the resource '${req.originalUrl}' you are looking for does not exist on this server.`,
    reqId: requestId,
  });
});

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  errorHandler(err, req, res, next);
});

const startServer = async () => {
  try {
    appLogger.info("Attempting to connect to the database...");
    await prisma.$connect();
    appLogger.info("Database connection established successfully.");

    const server = app.listen(config.port, () => {
      appLogger.info(
        `🚀 Server launched and listening on port ${config.port} (Mode: ${config.nodeEnv})`
      );
    });

    const shutdown = async (signal: string) => {
      appLogger.info(
        `\n${signal} signal received. Initiating graceful shutdown...`
      );
      server.close(async () => {
        appLogger.info("HTTP server has been closed.");
        await prisma.$disconnect();
        appLogger.info("Database connection has been closed.");
        appLogger.info(
          "Graceful shutdown complete. Application exiting. Goodbye! 👋"
        );
        process.exit(0);
      });

      setTimeout(() => {
        appLogger.warn(
          "Graceful shutdown period timed out. Forcing application exit..."
        );
        process.exit(1);
      }, 10000);
    };

    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGQUIT", () => shutdown("SIGQUIT"));
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    appLogger.fatal(
      { err: error },
      `💥 Critical error during server startup: ${errorMessage}`
    );

    await prisma.$disconnect().catch((disconnectErr: unknown) => {
      const disconnMsg =
        disconnectErr instanceof Error
          ? disconnectErr.message
          : "Unknown disconnect error";
      appLogger.error(
        { err: disconnectErr },
        `Error during Prisma disconnect on startup failure: ${disconnMsg}`
      );
    });
    process.exit(1);
  }
};

const currentScriptPath = fileURLToPath(import.meta.url);
const mainScriptPath = process.argv[1];

if (
  mainScriptPath &&
  path.resolve(currentScriptPath) === path.resolve(mainScriptPath)
) {
  startServer();
}

export default app;
