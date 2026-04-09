import { redirect } from "next/navigation";

type SearchParams = Record<string, string | string[] | undefined>;

function toQuerySuffix(sp: SearchParams): string {
  const q = new URLSearchParams();
  for (const [key, value] of Object.entries(sp)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const item of value) {
        q.append(key, item);
      }
    } else {
      q.set(key, value);
    }
  }
  const s = q.toString();
  return s ? `?${s}` : "";
}

/** Legacy URL; canonical route is `/my-cases`. */
export default async function WorkspaceLegacyRedirectPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  redirect(`/my-cases${toQuerySuffix(sp)}`);
}
