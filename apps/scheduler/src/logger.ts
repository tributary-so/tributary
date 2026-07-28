import { createLogger, format, transports } from "winston";
import { AnchorError, ProgramError, Idl } from "@coral-xyz/anchor";

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

const ANCHOR_ERROR_RE =
  /Program log: AnchorError (?:thrown in (.+):(\d+))?\. Error Code: (\w+)\. Error Number: (\d+)\. Error Message: (.+)\./;


export interface ParsedProgramError {
  kind: "anchor" | "program" | "unknown";
  code?: string;      // e.g. "InsufficientFunds"
  number?: number;     // e.g. 6000
  message?: string;    // e.g. "Not enough funds to complete transaction"
  file?: string;
  line?: number;
  raw: string[];       // original logs, for debugging
}

/**
 * Parses raw transaction logs and returns the most specific error found.
 * Priority: AnchorError (has code/message) > raw custom error code > unknown.
 */
export function parseErrorFromLogs(
  logs: string[],
): ParsedProgramError {
  // 1. Try full AnchorError line first — richest info
  for (const log of logs) {
    const m = log.match(ANCHOR_ERROR_RE);
    if (m) {
      const [, file, line, code, number, message] = m;
      return {
        kind: "anchor",
        code,
        number: Number(number),
        message,
        file,
        line: line ? Number(line) : undefined,
        raw: logs,
      };
    }
  }

  return { kind: "unknown", raw: logs };
}

/**
 * If you already have the thrown error/SendTransactionError, prefer this —
 * Anchor's own translateError handles most cases if you have the IDL.
 */
export function parseThrownError(err: unknown, idl: Idl): ParsedProgramError {
  const anchorErr = AnchorError.parse((err as any)?.logs ?? []);
  if (anchorErr) {
    return {
      kind: "anchor",
      code: anchorErr.error.errorCode.code,
      number: anchorErr.error.errorCode.number,
      message: anchorErr.error.errorMessage,
      raw: anchorErr.program.logs ?? [],
    };
  }

  const progErr = ProgramError.parse(err as Error, idl.errors ?? []);
  if (progErr) {
    return {
      kind: "program",
      message: progErr.msg,
      raw: (err as any)?.logs ?? [],
    };
  }

  return { kind: "unknown", raw: (err as any)?.logs ?? [] };
}

export const logger = createLogger({ level, transports: ts });
