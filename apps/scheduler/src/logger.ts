import { createLogger, format, transports } from "winston";

// ponytail: single shared logger instance. Env-driven so ops can tune output
// without code changes. JSON via LOG_FORMAT=json; file via LOG_FILE; rotation
// via LOG_ROTATE=true (built-in File transport with maxsize/maxFiles — no
// extra winston-daily-rotate-file dep until we actually need date-based files).
const level = process.env.LOG_LEVEL ?? "info";
const isJson = process.env.LOG_FORMAT === "json";
const logFile = process.env.LOG_FILE;
const rotate = process.env.LOG_ROTATE === "true";

const fmt = isJson
  ? format.combine(format.timestamp(), format.json())
  : format.combine(
      format.timestamp(),
      format.printf(
        (info) => `${info.timestamp} [${info.level}] ${info.message}`
      )
    );

const ts: transports.ConsoleInstance[] = [
  new transports.Console({
    level,
    // error/warn → stderr, info/debug → stdout. Fixes the issue where
    // capturing stderr alone missed the normal tick logs.
    stderrLevels: ["error", "warn"],
    format: fmt,
  }),
];

if (logFile) {
  ts.push(
    new transports.File({
      level,
      filename: logFile,
      format: fmt,
      ...(rotate ? { maxsize: 10_000_000, maxFiles: 5 } : {}),
    })
  );
}

export const logger = createLogger({ level, transports: ts });
