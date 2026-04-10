import type { PostgrestError } from "@supabase/supabase-js";

/** True when PostgREST rejects a `.select()` list because the requested columns do not exist in this schema. */
export function isPostgrestUnknownColumnError(error: PostgrestError): boolean {
  const message = (error.message ?? "").toLowerCase();
  return (
    error.code === "PGRST204" ||
    (message.includes("schema cache") && message.includes("could not find")) ||
    (message.includes("column") && (message.includes("could not find") || message.includes("does not exist")))
  );
}

export function formatPostgrestError(error: unknown): string {
  if (error && typeof error === "object" && "message" in error) {
    const postgrestError = error as PostgrestError;
    const base = [postgrestError.message, postgrestError.details, postgrestError.hint]
      .filter(Boolean)
      .join(" — ");
    if (base) return base;
  }

  if (error instanceof Error) {
    const cause = error.cause;
    const causeMessage = cause instanceof Error ? cause.message : typeof cause === "string" ? cause : "";
    return [error.message, causeMessage].filter(Boolean).join(" — ") || "Request failed";
  }

  return String(error);
}
