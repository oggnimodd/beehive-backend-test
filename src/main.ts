import { randomUUID } from "node:crypto";
import { config } from "@/config";
import { prisma } from "@/db/client";
import { errorHandler } from "@/middlewares/error.middleware";
import mainRouter from "@/routes";
import appLogger from "@/utils/logger";
import { apiReference } from "@scalar/express-api-reference";
import cors from "cors";
import express from "express";
import type { NextFunction, Request, Response } from "express";
import helmet from "helmet";
import { StatusCodes } from "http-status-codes";

import swaggerOutput from "./swagger_output.json";

const app = express();

const connectSources = ["'self'", "https://cdn.jsdelivr.net"];

if (
  process.env.NETLIFY_DEV === "true" ||
  process.env.NETLIFY_LOCAL === "true"
) {
  const netlifyDevPort = process.env.PORT || 8888;
  connectSources.push(`http://localhost:${netlifyDevPort}`);
} else if (process.env.API_BASE_URL) {
  connectSources.push(process.env.API_BASE_URL);
} else if (config.nodeEnv === "development") {
  connectSources.push(`http://localhost:${config.port}`);
}

app.get("/favicon.ico", (_req, res) => {
  res.sendStatus(StatusCodes.NO_CONTENT);
});

app.use((req: Request, res: Response, next: NextFunction) => {
  const reqIdHeader =
    req.headers["x-request-id"] || req.headers["x-correlation-id"];
  const reqId =
    (Array.isArray(reqIdHeader) ? reqIdHeader[0] : reqIdHeader) || randomUUID();
  (req as any).id = reqId;
  res.setHeader("X-Request-Id", reqId);

  const start = Date.now();
  appLogger.debug(`${reqId} --> ${req.method} ${req.originalUrl}`);

  res.on("finish", () => {
    const duration = Date.now() - start;
    const logMessage = `${reqId} <-- ${req.method} ${req.originalUrl} ${res.statusCode} (${duration}ms)`;

    if (res.statusCode >= 500) {
      appLogger.error(logMessage);
    } else if (res.statusCode >= 400) {
      appLogger.warn(logMessage);
    } else {
      appLogger.debug(logMessage);
    }
  });

  next();
});

app.use(cors());

app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "https://cdn.jsdelivr.net",
          "'unsafe-inline'",
          "'unsafe-eval'",
        ],
        scriptSrcElem: [
          "'self'",
          "https://cdn.jsdelivr.net",
          "'unsafe-inline'",
          "'unsafe-eval'",
        ],
        styleSrc: [
          "'self'",
          "https://cdn.jsdelivr.net",
          "https://fonts.scalar.com",
          "https://fonts.googleapis.com",
          "'unsafe-inline'",
        ],
        styleSrcElem: [
          "'self'",
          "https://cdn.jsdelivr.net",
          "https://fonts.scalar.com",
          "https://fonts.googleapis.com",
          "'unsafe-inline'",
        ],
        fontSrc: [
          "'self'",
          "https://fonts.scalar.com",
          "https://fonts.gstatic.com",
          "data:",
        ],
        imgSrc: ["'self'", "data:", "https://cdn.jsdelivr.net"],
        connectSrc: connectSources,
        workerSrc: ["'self'", "blob:"],
      },
    },
  })
);

if (
  process.env.NETLIFY_DEV === "true" ||
  process.env.NETLIFY_LOCAL === "true"
) {
  app.use((req, _res, next) => {
    if (
      req.headers["content-type"] === "application/json" &&
      Buffer.isBuffer(req.body)
    ) {
      try {
        req.body = JSON.parse(req.body.toString("utf8"));
      } catch (e) {
        console.error("Error parsing buffer body in Netlify dev/local", e);
      }
    }
    next();
  });
}

app.use(express.json({ limit: "25kb" }));
app.use(express.urlencoded({ extended: true, limit: "25kb" }));

app.get("/swagger-output", (req: Request, res: Response) => {
  appLogger.debug("Serving swagger_output.json", { reqId: (req as any).id });
  res.setHeader("Content-Type", "application/json");
  res.send(swaggerOutput);
});

app.use(
  "/reference",
  apiReference({
    theme: "purple",
    url: "/swagger-output",
    layout: "modern",
    showSidebar: true,
    defaultHttpClient: { targetKey: "js", clientKey: "fetch" },
    authentication: { preferredSecurityScheme: "bearerAuth" },
    metaData: {
      title: "Beehive Backend Test API",
      description: "API documentation for the Beehive Backend Test.",
    },
  })
);

app.get("/health", (req: Request, res: Response) => {
  appLogger.info("HIT: Root /health endpoint", { reqId: (req as any).id });
  res.status(StatusCodes.OK).json({
    status: "UP",
    path: "/health",
    timestamp: new Date().toISOString(),
  });
});

app.use(mainRouter);

app.all("/{*splat}", (req: Request, res: Response) => {
  if (res.headersSent) {
    appLogger.warn(
      "Headers already sent, cannot send 404 for unhandled route.",
      {
        reqId: (req as any).id,
        originalUrl: req.originalUrl,
      }
    );
    return;
  }
  const reqId = (req as any).id || randomUUID();
  appLogger.warn(`Resource not found: ${req.method} ${req.originalUrl}`, {
    reqId,
    originalUrl: req.originalUrl,
    path: req.path,
    method: req.method,
  });
  res.status(StatusCodes.NOT_FOUND).json({
    status: "fail",
    message: `Sorry, the resource '${req.originalUrl}' you are looking for does not exist on this server.`,
    reqId: reqId,
  });
});

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  const reqId = (req as any).id || randomUUID();
  appLogger.error("Global error handler caught an error", err, {
    reqId,
    path: req.path,
  });
  errorHandler(err, req, res, next);
});

export const startServer = async () => {
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
      appLogger.info(`\n${signal} signal received. Graceful shutdown...`);
      server.close(async () => {
        appLogger.info("HTTP server closed.");
        await prisma.$disconnect();
        appLogger.info("Database connection closed.");
        appLogger.info("Shutdown complete. Goodbye! 👋");
        process.exit(0);
      });
      setTimeout(() => {
        appLogger.warn("Shutdown timed out. Forcing exit...");
        process.exit(1);
      }, 10000);
    };
    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));
  } catch (error: unknown) {
    appLogger.fatal("💥 Server startup failed", error);
    try {
      await prisma.$disconnect();
    } catch (disconnectErr) {
      appLogger.error(
        "Error during Prisma disconnect on startup failure",
        disconnectErr
      );
    }
    process.exit(1);
  }
};

export default app;
