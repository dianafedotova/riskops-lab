export function ageFromIsoDate(dob: string | null): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const diff = Date.now() - d.getTime();
  return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
}

export function formatMoneyUsd(n: number | null): string {
  if (n == null || Number.isNaN(n)) return "—";
  return `${n.toLocaleString("en-US", { maximumFractionDigits: 0 })} USD`;
}

export function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (x: number) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (x: number) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
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

export function formatTransactionAmount(
  amount: number | null,
  currency: string | null,
  direction: string | null
): string {
  if (amount == null || Number.isNaN(amount)) return "—";
  const cc = currency ?? "USD";
  const value = Math.abs(amount).toLocaleString("en-US", { maximumFractionDigits: 2 });
  const d = direction?.toLowerCase();
  const sign = d === "outbound" ? "−" : d === "inbound" ? "+" : "";
  return `${sign}${value} ${cc}`;
}
