import { all as getAllCountryRows, findOne as findCountryRow } from "country-codes-list";

/** dial e.g. "+380" -> sorted unique English country names */
function buildDialToCountryNames(): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const row of getAllCountryRows()) {
    const raw = row.countryCallingCode?.trim();
    if (!raw) continue;
    const dial = `+${raw}`;
    const name = row.countryNameEn?.trim();
    if (!name) continue;
    const list = map.get(dial) ?? [];
    list.push(name);
    map.set(dial, list);
  }
  for (const [dial, names] of map) {
    map.set(dial, [...new Set(names)].sort((a, b) => a.localeCompare(b)));
  }
  return map;
}

const DIAL_TO_COUNTRY_NAMES = buildDialToCountryNames();

const LABEL_COLLATOR = new Intl.Collator(undefined, { sensitivity: "accent" });

/** Primary international dial for an ISO 3166-1 alpha-2 code (e.g. UA -> +380). */
export function getDialCodeForCountryIso(iso: string): string {
  const normalized = iso.trim().toUpperCase();
  if (!normalized) return "";
  const row = findCountryRow("countryCode", normalized);
  const raw = row?.countryCallingCode?.trim();
  return raw ? `+${raw}` : "";
}

/** e.g. Ukraine (+380); Canada · United States (+1) for shared codes. */
export function labelForPhoneDialCode(dial: string): string {
  if (!dial) return "Code";
  const names = DIAL_TO_COUNTRY_NAMES.get(dial);
  if (!names?.length) return dial;
  if (names.length === 1) return `${names[0]} (${dial})`;
  return `${names.join(" · ")} (${dial})`;
}

export function comparePhoneDialLabels(a: string, b: string): number {
  return LABEL_COLLATOR.compare(a, b);
}
