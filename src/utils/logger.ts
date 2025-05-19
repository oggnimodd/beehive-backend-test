import util from "node:util";
import { config } from "@/config";
import chalk from "chalk";
import log from "loglevel";

type LevelName = "trace" | "debug" | "info" | "warn" | "error";

const envLevel = process.env.LOG_LEVEL?.toLowerCase() as LevelName | undefined;
const isDev =
  config.nodeEnv !== "production" &&
  !process.env.NETLIFY_DEV &&
  !process.env.NETLIFY_LOCAL;

const currentLogLevel: LevelName =
  envLevel && ["trace", "debug", "info", "warn", "error"].includes(envLevel)
    ? envLevel
    : isDev
      ? "debug"
      : "info";

log.setLevel(currentLogLevel);

const isTTY = process.stdout.isTTY;
const isOnNetlify =
  process.env.NETLIFY === "true" ||
  process.env.NETLIFY_DEV === "true" ||
  process.env.NETLIFY_LOCAL === "true";

const originalFactory = log.methodFactory;

log.methodFactory = (method, levelNum, loggerName) => {
  const raw = originalFactory(method, levelNum, loggerName);

  return (...args: unknown[]) => {
    const now = new Date();
    const isoTime = now.toISOString();
    const hhmmss = `${now.toTimeString().split(" ")[0]}.${now.getMilliseconds().toString().padStart(3, "0")}`;

    let message = "";
    let errorInfo: { name: string; message: string } | undefined;
    let details: Record<string, unknown> = {};

    const extractError = (val: unknown) =>
      val instanceof Error
        ? { name: val.name, message: val.message }
        : undefined;

    const first = args[0];
    if (first instanceof Error) {
      errorInfo = extractError(first);
      message = errorInfo?.message || "";
      if (typeof args[1] === "object" && args[1] != null) {
        details = { ...(args[1] as object) };
      }
    } else if (typeof first === "string") {
      message = first;
      if (args[1] instanceof Error) {
        errorInfo = extractError(args[1]);
      } else if (typeof args[1] === "object" && args[1] != null) {
        details = { ...(args[1] as object) };
      }
    } else if (typeof first === "object" && first != null) {
      details = { ...(first as object) };
      message =
        "message" in details
          ? String((details as any).message)
          : JSON.stringify(details);
      errorInfo =
        extractError((details as any).err) ??
        extractError((details as any).error);
      const { err, error, ...restDetails } = details as any;
      details = restDetails;
    } else {
      message = String(first);
    }

    if (!errorInfo) {
      for (const arg of args) {
        const extracted = extractError(arg);
        if (extracted) {
          errorInfo = extracted;
          break;
        }
      }
    }

    if (isTTY && !isOnNetlify) {
      const colors: Record<LevelName, any> = {
        trace: chalk.gray,
        debug: chalk.gray,
        info: chalk.blue,
        warn: chalk.yellow,
        error: chalk.red,
      };
      const lvColor = colors[method] || chalk.white;
      const { reqId, ...rest } = details as any;
      let line = `${chalk.dim(hhmmss)} ${lvColor(method.toUpperCase())}`;

      if (reqId) {
        line += ` ${chalk.cyan(`(${reqId})`)}`;
      }

      line += ` ${message}`;

      if (errorInfo) {
        const errMsg =
          errorInfo.name !== "Error"
            ? ` (${errorInfo.name}: ${errorInfo.message})`
            : ` (${errorInfo.message})`;
        line += chalk.red(errMsg);
      }

      if (Object.keys(rest).length) {
        line += chalk.dim(
          ` ${util.inspect(rest, { colors: true, depth: 1, compact: true })}`
        );
      }

      raw(line);
    } else {
      const entry: Record<string, unknown> = {
        timestamp: isoTime,
        level: method.toUpperCase(),
        message,
        ...details,
      };
      if (errorInfo) {
        entry.error = errorInfo;
      }
      raw(JSON.stringify(entry));
    }
  };
};

log.rebuild();

const appLogger = {
  trace: log.trace,
  debug: log.debug,
  info: log.info,
  warn: log.warn,
  error: log.error,
  fatal: (
    msg: string,
    err?: Error | unknown,
    extra?: Record<string, unknown>
  ) => {
    const base: Record<string, unknown> = { ...(extra || {}), fatal: true };
    let finalMsg = msg;
    if (err instanceof Error) {
      base.error = { name: err.name, message: err.message };
      finalMsg ||= err.message;
    } else if (err != null) {
      base.error = { message: String(err) };
      finalMsg ||= String(err);
    }
    log.error(finalMsg, base);
  },
  getLevel: log.getLevel,
  levels: log.levels,
};

export default appLogger;
