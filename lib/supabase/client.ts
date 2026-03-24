import { createClient as createBrowserClient } from "./browser";

export function createClient() {
  return createBrowserClient();
}
