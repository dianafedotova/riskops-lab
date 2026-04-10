export function ageFromIsoDate(dob: string | null): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const diff = Date.now() - d.getTime();
  return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
}

export function formatMoneyUsd(n: number | null): string {
  if (n == null || Number.isNaN(n)) return "—";
  const normalized = Object.is(n, -0) || Math.abs(n) < 0.5 ? 0 : n;
  return `${normalized.toLocaleString("en-US", { maximumFractionDigits: 0 })} USD`;
}

export function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (x: number) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (x: number) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Alert workflow status for compact lists (`open` → `Open`, `false_positive` → `False positive`). */
export function formatAlertStatusForList(status: string | null | undefined): string {
  const raw = (status ?? "").trim();
  if (!raw) return "—";
  return raw
    .split(/[\s_]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

export function formatShortDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function formatShortDateTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const date = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const time = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
  return `${date}, ${time}`;
}

export function formatEventType(value: string | null): string {
  if (!value) return "—";
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/Poa\b/gi, "POA")
    .replace(/Poi\b/gi, "POI");
}

export function maskIp(ip: string | null): string {
  if (!ip) return "—";
  const parts = ip.trim().split(".");
  if (parts.length !== 4) return ip;
  return `${parts[0]}.***.***.${parts[3]}`;
}

/** Declined / failed / cancelled — do not style amounts like settled inbound or outbound credits. */
export function isUnsuccessfulTransactionStatus(status: string | null | undefined): boolean {
  const s = (status ?? "").trim().toLowerCase().replace(/\s+/g, "");
  if (!s) return false;
  return (
    s.includes("reject") ||
    s === "failed" ||
    s.includes("declin") ||
    s === "cancelled" ||
    s === "canceled" ||
    s.includes("revers")
  );
}

export function formatTransactionAmount(
  amount: number | null,
  currency: string | null,
  direction: string | null,
  _status?: string | null
): string {
  void _status;
  if (amount == null || Number.isNaN(amount)) return "—";
  const cc = currency ?? "USD";
  const value = Math.abs(amount).toLocaleString("en-US", { maximumFractionDigits: 2 });
  const d = direction?.toLowerCase();
  const sign = d === "outbound" ? "−" : d === "inbound" ? "+" : "";
  return `${sign}${value} ${cc}`;
}

export function formatTransactionAmountUsd(
  amountUsd: number | null,
  direction: string | null,
  _status?: string | null,
  options?: { withSign?: boolean }
): string {
  void _status;
  if (amountUsd == null || Number.isNaN(amountUsd)) return "—";
  const value = Math.abs(amountUsd).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const d = direction?.toLowerCase();
  const withSign = options?.withSign ?? true;
  const sign = withSign ? (d === "outbound" ? "−" : d === "inbound" ? "+" : "") : "";
  return `${sign}${value} USD`;
}
