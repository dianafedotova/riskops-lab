export async function postJson<TResponse>(url: string, body: unknown): Promise<TResponse> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "same-origin",
    cache: "no-store",
    body: JSON.stringify(body),
  });

  const payload = (await response.json().catch(() => null)) as { error?: unknown } | null;

  if (!response.ok) {
    throw new Error(
      typeof payload?.error === "string" && payload.error.trim()
        ? payload.error
        : `Request failed with status ${response.status}.`
    );
  }

  return payload as TResponse;
}
