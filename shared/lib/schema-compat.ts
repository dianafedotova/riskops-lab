export function shouldRetryWithLegacyShape(errorMessage: string | null | undefined): boolean {
  const message = (errorMessage ?? "").toLowerCase();
  if (!message) return false;

  return (
    message.includes("does not exist") ||
    message.includes("schema cache") ||
    message.includes("could not find the") ||
    (message.includes("record ") && message.includes("has no field"))
  );
}
