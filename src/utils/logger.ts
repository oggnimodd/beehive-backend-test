import pino from "pino";
import { transport } from "pino";
import { config } from "@/config";

const isProd = config.nodeEnv === "production";
const level = config.logLevel || (isProd ? "info" : "debug");

const prettyTransport = transport({
  target: "pino-pretty",
  options: {
    colorize: true,
    translateTime: "yyyy-mm-dd HH:MM:ss.l",
    ignore: "pid,hostname",
    singleLine: false,
  },
});

const logger = pino(
  {
    level,
    timestamp: pino.stdTimeFunctions.isoTime,
    base: undefined,
    formatters: {
      level(label) {
        return { level: label.toUpperCase() };
      },
    },
  },
  isProd ? process.stdout : prettyTransport
);

export default logger;
