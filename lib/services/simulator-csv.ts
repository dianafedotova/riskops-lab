export type CsvParseResult =
  | { rows: string[][]; error: null }
  | { rows: []; error: string };

function normalizeCell(value: string): string {
  return value.replace(/\uFEFF/g, "");
}

export function parseCsvTable(text: string): CsvParseResult {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]!;

    if (inQuotes) {
      if (char === '"') {
        const next = text[index + 1];
        if (next === '"') {
          field += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }

    if (char === ",") {
      row.push(normalizeCell(field));
      field = "";
      continue;
    }

    if (char === "\r") {
      row.push(normalizeCell(field));
      rows.push(row);
      row = [];
      field = "";
      if (text[index + 1] === "\n") index += 1;
      continue;
    }

    if (char === "\n") {
      row.push(normalizeCell(field));
      rows.push(row);
      row = [];
      field = "";
      continue;
    }

    field += char;
  }

  if (inQuotes) {
    return { rows: [], error: "CSV contains an unterminated quoted field." };
  }

  row.push(normalizeCell(field));
  rows.push(row);

  const filtered = rows.filter((current, index) => {
    if (index === rows.length - 1 && current.length === 1 && current[0] === "") return false;
    return current.some((value) => value !== "");
  });

  return { rows: filtered, error: null };
}

export function normalizeCsvHeaders(headers: string[]): string[] {
  return headers.map((header) => normalizeCell(header).trim().toLowerCase());
}

export function buildCsvRecord<T extends Record<string, string | null | undefined>>(
  headers: string[],
  row: string[]
): T {
  const record: Record<string, string | null> = {};
  for (let index = 0; index < headers.length; index += 1) {
    const header = headers[index]!;
    const value = row[index] ?? "";
    const trimmed = value.trim();
    record[header] = trimmed === "" ? null : trimmed;
  }
  return record as T;
}

export function duplicateRowErrors<T>(
  rows: T[],
  keyForRow: (row: T) => string
): string[] {
  const seen = new Map<string, number>();
  const errors: string[] = [];

  rows.forEach((row, index) => {
    const key = keyForRow(row);
    if (!key) return;
    const firstSeenAt = seen.get(key);
    if (firstSeenAt !== undefined) {
      errors.push(`Row ${index + 2} duplicates row ${firstSeenAt + 2}.`);
      return;
    }
    seen.set(key, index);
  });

  return errors;
}
