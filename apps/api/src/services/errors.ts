/**
 * Render an error for console logging, INCLUDING the drizzle/postgres-js
 * cause chain that `DrizzleQueryError` otherwise swallows.
 *
 * Background: drizzle-orm wraps postgres-js errors as `DrizzleQueryError`
 * whose own `.message` is just `Failed query: ... params: ...`. The real
 * Postgres diagnostics (SQLSTATE code, detail, hint, routine, schema/table)
 * live on `.cause`. Without unwrapping, every DB query failure logs as an
 * opaque query dump and the actual cause (e.g. `42702 ambiguous column`,
 * `23502 NOT NULL violation`, `ERR_INVALID_ARG_TYPE` Date-serialization) is
 * invisible — turning a 30-second diagnosis into a 30-minute grep.
 *
 * Safe on any error shape: non-Error values are stringified; errors with no
 * `.cause` fall back to `.message`.
 */
export function describeError(err: unknown): string {
  if (!(err instanceof Error)) return String(err);
  const cause = (err as { cause?: unknown }).cause;
  if (cause && typeof cause === "object") {
    const code = (cause as { code?: unknown }).code;
    const message = (cause as { message?: unknown }).message;
    if (code !== undefined || message !== undefined) {
      const tail = `${code ?? ""} ${String(message ?? "").trim()}`.trim();
      return tail ? `${err.message} [cause: ${tail}]` : err.message;
    }
  }
  return err.message;
}
