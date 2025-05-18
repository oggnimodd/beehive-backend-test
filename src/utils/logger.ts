import pino from "pino";
import { config } from "@/config";

const logger = pino({
  level: config.nodeEnv === "production" ? "info" : "debug",
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level: (label) => {
      return { level: label.toUpperCase() };
    },
  },
  transport:
    config.nodeEnv !== "production"
      ? {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:standard",
            ignore: "pid,hostname",
            messageFormat: "{req.id} - {msg}",
          },
        }
      : undefined,
});

export default logger;
