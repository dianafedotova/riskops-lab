"use client";

import { ageFromIsoDate, formatDate, formatDateTime, formatEventType, formatMoneyUsd, formatTransactionAmount, maskIp } from "@/lib/format";
import { getOpsEventLabel } from "@/lib/ops-events";
import { supabase } from "@/lib/supabase";
import type { AlertRow, OpsEventRow, PaymentMethodRow, TransactionRow, UserEventRow, UserFinancialsRow, UserNoteRow, UserRow } from "@/lib/types";
import Image from "next/image";
import Link from "next/link";
import { QueryErrorBanner } from "@/components/query-error";
import { TableSwipeHint } from "@/components/table-swipe-hint";
import { UserProfileSkeleton } from "@/components/user-profile-skeleton";
import { TABLE_PY_INNER } from "@/lib/table-padding";
import { normalizeFinancialsRow } from "@/lib/user-financials";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

type TabKey =
  | "overview"
  | "transactions"
  | "accounts"
  | "network"
  | "activity"
  | "opslog"
  | "alerts"
  | "notes";

type AccountStatus = "active" | "not_active" | "restricted" | "blocked" | "closed";

const PROFILE_TABS: { key: TabKey; label: string }[] = [
  { key: "transactions", label: "Transactions" },
  { key: "accounts", label: "Cards & Accounts" },
  { key: "network", label: "Devices & Links" },
  { key: "activity", label: "User Activity" },
  { key: "overview", label: "SOF Questionnaire" },
  { key: "alerts", label: "Linked Alerts" },
  { key: "opslog", label: "Operations Log" },
  { key: "notes", label: "Internal Notes" },
];

type UiPaymentMethod = PaymentMethodRow & {
  closedByClosure?: boolean;
  restrictedFrozen?: boolean;
  blockedByFullBlock?: boolean;
};

function normalizeAccountStatus(value: string | null | undefined): AccountStatus {
  const v = (value ?? "").toLowerCase().trim();
  if (v === "active" || v === "not_active" || v === "restricted" || v === "blocked" || v === "closed") {
    return v;
  }
  return "active";
}

function accountStatusLabel(status: AccountStatus): string {
  if (status === "not_active") return "Not Active";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function transactionStatusBadge(status: string | null): { label: string; className: string } {
  const raw = (status ?? "").trim();
  if (!raw) {
    return {
      label: "—",
      className: "bg-slate-50 text-slate-500 ring-slate-200",
    };
  }
  const s = raw.toLowerCase().replace(/\s+/g, "");
  if (s === "completed" || s === "complete" || s === "success" || s === "settled" || s === "posted") {
    return { label: raw, className: "bg-emerald-50 text-emerald-800 ring-emerald-200" };
  }
  if (
    s.includes("reject") ||
    s === "failed" ||
    s.includes("declin") ||
    s === "cancelled" ||
    s === "canceled" ||
    s.includes("revers")
  ) {
    return { label: raw, className: "bg-rose-50 text-rose-800 ring-rose-200" };
  }
  if (
    s.includes("pending") ||
    s.includes("processing") ||
    s.includes("review") ||
    s.includes("hold") ||
    s.includes("authori")
  ) {
    return { label: raw, className: "bg-amber-50 text-amber-900 ring-amber-200" };
  }
  return { label: raw, className: "bg-slate-100 text-slate-700 ring-slate-200" };
}

function PaymentMethodStatusBadge({ status }: { status: string | null }) {
  const s = (status ?? "—").toLowerCase();
  const styles =
    s === "active"
      ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
      : s === "frozen"
        ? "bg-amber-50 text-amber-900 ring-amber-200"
        : s === "blocked"
          ? "bg-rose-50 text-rose-900 ring-rose-200"
          : s === "closed"
            ? "bg-slate-200/80 text-slate-700 ring-slate-300"
            : "bg-slate-50 text-slate-600 ring-slate-200";
  return (
    <span
      className={`inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ring-1 ${styles}`}
    >
      {status ?? "—"}
    </span>
  );
}

export default function UserProfilePage() {
  const params = useParams<{ id: string }>();
  const userId = params?.id ?? "";
  const [activeTab, setActiveTab] = useState<TabKey>("transactions");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [noteText, setNoteText] = useState("");
  const [copied, setCopied] = useState(false);
  const [notes, setNotes] = useState<UserNoteRow[]>([]);

  const [user, setUser] = useState<UserRow | null>(null);
  const [userAlerts, setUserAlerts] = useState<AlertRow[]>([]);
  const [userEvents, setUserEvents] = useState<UserEventRow[]>([]);
  const [linkedAccounts, setLinkedAccounts] = useState<{ userId: string; deviceName: string }[]>([]);
  const [opsEvents, setOpsEvents] = useState<OpsEventRow[]>([]);
  const [userTransactions, setUserTransactions] = useState<TransactionRow[]>([]);
  const [financials, setFinancials] = useState<UserFinancialsRow | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<UiPaymentMethod[]>([]);
  const [accountStatus, setAccountStatus] = useState<AccountStatus>("active");
  const [txError, setTxError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);
  const [selfieLoadFailed, setSelfieLoadFailed] = useState(false);
  const [selfieUrl, setSelfieUrl] = useState<string | null>(null);

  useEffect(() => {
    setSelfieLoadFailed(false);
    setSelfieUrl(null);
  }, [user?.id, user?.selfie_path]);

  useEffect(() => {
    if (!user?.selfie_path) {
      setSelfieUrl(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.storage
        .from("selfie")
        .createSignedUrl(user.selfie_path!, 3600);
      if (cancelled) return;
      if (error) {
        const fallback = supabase.storage.from("selfie").getPublicUrl(user.selfie_path!).data.publicUrl;
        setSelfieUrl(fallback);
        return;
      }
      setSelfieUrl(data?.signedUrl ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.selfie_path]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      setTxError(null);
      const { data: row, error: qError } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .maybeSingle();
      if (cancelled) return;
      if (qError) {
        setError(qError.message);
        setUser(null);
        setUserAlerts([]);
        setUserEvents([]);
        setLinkedAccounts([]);
        setOpsEvents([]);
        setNotes([]);
        setUserTransactions([]);
        setFinancials(null);
        setPaymentMethods([]);
        setAccountStatus("active");
        setTxError(null);
        setLoading(false);
        return;
      }
      if (!row) {
        setUser(null);
        setUserAlerts([]);
        setUserEvents([]);
        setLinkedAccounts([]);
        setOpsEvents([]);
        setNotes([]);
        setUserTransactions([]);
        setFinancials(null);
        setPaymentMethods([]);
        setAccountStatus("active");
        setTxError(null);
        setLoading(false);
        return;
      }
      const userRow = row as UserRow;
      setUser(userRow);
      setAccountStatus(normalizeAccountStatus(userRow.status));
      const canonicalUserId = userRow.id;
      if (!canonicalUserId) {
        setError("User record has no id");
        setLoading(false);
        return;
      }
      const userIdInternal = canonicalUserId;
      const [alertsRes, eventsRes, txRes, finRes, pmRes, opsRes, notesRes] = await Promise.all([
        supabase.from("alerts").select("*").eq("user_id", userIdInternal).order("created_at", { ascending: false }),
        supabase
          .from("user_events")
          .select("*")
          .eq("user_id", userIdInternal)
          .order("event_time", { ascending: false }),
        supabase
          .from("transactions")
          .select("*")
          .eq("user_id", userIdInternal)
          .order("transaction_date", { ascending: false }),
        supabase.from("user_financials").select("*").eq("user_id", canonicalUserId).maybeSingle(),
        supabase.from("user_payment_methods").select("*").eq("user_id", userIdInternal),
        supabase
          .from("ops_events")
          .select("*")
          .eq("user_id", userIdInternal)
          .order("event_time", { ascending: false }),
        supabase
          .from("internal_notes")
          .select("id, user_id, note_text, created_at, created_by, updated_at, updated_by")
          .eq("user_id", canonicalUserId)
          .order("created_at", { ascending: false })
      ]);
      // TEMP debug — remove after verifying Supabase
      console.log("[profile] canonicalUserId (users.id)", canonicalUserId);
      console.log("[profile] user_financials", { data: finRes.data, error: finRes.error });
      console.log("[profile] internal_notes", { data: notesRes.data, error: notesRes.error });
      if (!cancelled) setUserAlerts((alertsRes.data as AlertRow[]) ?? []);
      const events = (eventsRes.data as UserEventRow[]) ?? [];
      if (!cancelled) setUserEvents(events);

      const myDeviceIds = [...new Set(events.filter((e) => e.device_id).map((e) => e.device_id!))];
      if (!cancelled && myDeviceIds.length > 0) {
        const { data: linkedRows } = await supabase
          .from("user_events")
          .select("user_id, device_name")
          .in("device_id", myDeviceIds)
          .neq("user_id", userIdInternal);
        const byUser = new Map<string, string>();
        for (const r of linkedRows ?? []) {
          const row = r as { user_id: string; device_name: string | null };
          if (!byUser.has(row.user_id)) {
            byUser.set(row.user_id, row.device_name ?? "Unknown device");
          }
        }
        setLinkedAccounts(Array.from(byUser.entries()).map(([userId, deviceName]) => ({ userId, deviceName })));
      } else if (!cancelled) {
        setLinkedAccounts([]);
      }

      if (!cancelled) {
        setFinancials(normalizeFinancialsRow(finRes.data ?? null));
      }
      if (!cancelled) setPaymentMethods(((pmRes.data as PaymentMethodRow[]) ?? []) as UiPaymentMethod[]);
      if (!cancelled) setOpsEvents((opsRes.data as OpsEventRow[]) ?? []);
      if (!cancelled) setNotes((notesRes.data as UserNoteRow[]) ?? []);
      if (!cancelled) {
        setTxError(txRes.error?.message ?? null);
        const tx = txRes.error ? [] : (txRes.data as TransactionRow[]) ?? [];
        setUserTransactions(tx);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, reloadTick]);

  const addNote = async () => {
    if (!noteText.trim() || !user?.id) return;
    const note_text = noteText.trim();
    setNoteText("");
    const { data: inserted, error } = await supabase
      .from("internal_notes")
      .insert({ user_id: user.id, note_text })
      .select("id, user_id, note_text, created_at, created_by, updated_at, updated_by")
      .single();
    if (!error && inserted) {
      setNotes((prev) => [(inserted as UserNoteRow), ...prev]);
    }
  };

  const copyUserId = async () => {
    await navigator.clipboard.writeText(user?.id ?? "");
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const closeDropdown = useCallback(() => setDropdownOpen(false), []);

  useEffect(() => {
    if (!dropdownOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        closeDropdown();
      }
    };
    const handleScroll = (e: Event) => {
      if (dropdownRef.current?.contains(e.target as Node)) return;
      closeDropdown();
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("scroll", handleScroll, true);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("scroll", handleScroll, true);
    };
  }, [dropdownOpen, closeDropdown]);

  if (loading) {
    return <UserProfileSkeleton />;
  }

  if (error) {
    return (
      <section className="page-panel space-y-4 p-4 sm:p-6">
        <QueryErrorBanner
          message={error}
          onRetry={() => setReloadTick((n) => n + 1)}
          hint={
            <p className="text-xs text-rose-800/90">
              Ensure <code className="rounded bg-rose-100 px-1 font-mono">supabase/schema.sql</code> is applied and
              env keys in <code className="rounded bg-rose-100 px-1 font-mono">.env.local</code> are correct.
            </p>
          }
        />
      </section>
    );
  }

  if (!user) {
    return (
      <section className="page-panel space-y-4 p-4 sm:p-6">
        <p className="text-slate-600">
          User not found. Run <code className="font-mono text-xs">supabase/schema.sql</code> or check the ID.
        </p>
        <Link href="/users" className="text-sm text-[#264B5A] hover:underline">
          Back to Users
        </Link>
      </section>
    );
  }

  const userStatus = accountStatusLabel(accountStatus);
  const tierNum = accountStatus === "not_active" ? "0" : user.tier?.match(/\d+/)?.[0];
  const isTier1 = tierNum === "1";
  const isTier2Or3 = tierNum === "2" || tierNum === "3";
  const isTier0 = tierNum === "0";
  const canOperate = accountStatus !== "closed" && accountStatus !== "not_active";
  const riskLevel = user.risk_level ?? "";
  const tierLabel = `Tier ${tierNum ?? "—"}`;
  const displayName = user.full_name ?? user.email ?? "—";
  const age = ageFromIsoDate(user.date_of_birth);
  const countryLabel = user.country_name ?? "—";

  const riskClass =
    riskLevel === "High"
      ? "text-rose-600"
      : riskLevel === "Medium"
        ? "text-amber-600"
        : riskLevel === "Low"
          ? "text-emerald-600"
          : "text-slate-700";

  const userCards = paymentMethods.filter((m) => m.type?.toLowerCase().includes("card"));
  const userBankAccounts = paymentMethods.filter(
    (m) =>
      !m.type?.toLowerCase().includes("card") &&
      !m.wallet_type &&
      !m.wallet_address &&
      !m.type?.toLowerCase().match(/wallet|crypto/)
  );
  const userCryptoAccounts = paymentMethods.filter(
    (m) =>
      !m.type?.toLowerCase().includes("card") &&
      (!!m.wallet_type || !!m.wallet_address || !!m.type?.toLowerCase().match(/wallet|crypto/))
  );
  const visibleTransactions = isTier0 ? [] : userTransactions;

  // Last Seen = most recent timestamp between latest user event and latest transaction.
  const latestEventTime = userEvents[0]?.event_time ?? null;
  const latestTransactionTime = userTransactions[0]?.transaction_date ?? null;
  const toMs = (iso: string | null | undefined): number | null => {
    if (!iso) return null;
    const t = new Date(iso).getTime();
    return Number.isNaN(t) ? null : t;
  };
  const latestEventMs = toMs(latestEventTime);
  const latestTxMs = toMs(latestTransactionTime);
  const lastSeenIso =
    latestEventMs == null && latestTxMs == null
      ? null
      : latestEventMs != null && (latestTxMs == null || latestEventMs >= latestTxMs)
        ? latestEventTime
        : latestTransactionTime;

  const uniqueDevices = (() => {
    const byName = new Map<
      string,
      { deviceName: string; lastSeen: string; countryCode: string | null }
    >();
    for (const e of userEvents) {
      const name = e.device_name ?? "Unknown device";
      const existing = byName.get(name);
      const eventTime = e.event_time;
      if (!existing || new Date(eventTime) > new Date(existing.lastSeen)) {
        byName.set(name, {
          deviceName: name,
          lastSeen: eventTime,
          countryCode: e.country_code ?? null,
        });
      }
    }
    return Array.from(byName.values()).sort(
      (a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime()
    );
  })();

  const uniqueIps = (() => {
    const byIp = new Map<
      string,
      { ip: string; usageCount: number; lastSeen: string; countryCode: string | null }
    >();
    for (const e of userEvents) {
      if (!e.ip_address) continue;
      const existing = byIp.get(e.ip_address);
      const eventTime = e.event_time;
      if (!existing) {
        byIp.set(e.ip_address, {
          ip: e.ip_address,
          usageCount: 1,
          lastSeen: eventTime,
          countryCode: e.country_code ?? null,
        });
      } else {
        existing.usageCount += 1;
        if (new Date(eventTime) > new Date(existing.lastSeen)) {
          existing.lastSeen = eventTime;
          existing.countryCode = e.country_code ?? null;
        }
      }
    }
    return Array.from(byIp.values())
      .sort((a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime())
      .map(({ ip, usageCount, lastSeen, countryCode }) => ({
        ip,
        usageCount,
        lastSeen,
        country: countryCode ?? "—",
      }));
  })();

  const applyPartialBlock = () => {
    if (!canOperate) return;
    setAccountStatus("restricted");
    setPaymentMethods((prev) =>
      prev.map((m) => {
        if ((m.status ?? "").toLowerCase() !== "active") return m;
        return { ...m, status: "frozen", restrictedFrozen: true };
      })
    );
  };

  const applyFullBlock = () => {
    if (!canOperate) return;
    setAccountStatus("blocked");
    setPaymentMethods((prev) =>
      prev.map((m) => {
        const st = (m.status ?? "").toLowerCase();
        if (st === "closed") return m;
        return { ...m, status: "blocked", blockedByFullBlock: true };
      })
    );
  };

  const unblockAccount = () => {
    setAccountStatus("active");
    setPaymentMethods((prev) =>
      prev.map((m) => {
        const next = { ...m };
        if (next.restrictedFrozen && (next.status ?? "").toLowerCase() === "frozen") {
          next.status = "active";
          next.restrictedFrozen = false;
        }
        if (next.blockedByFullBlock && (next.status ?? "").toLowerCase() === "blocked") {
          next.status = "active";
          next.blockedByFullBlock = false;
        }
        return next;
      })
    );
  };

  const closeAccount = () => {
    if (!canOperate) return;
    setAccountStatus("closed");
    setPaymentMethods((prev) =>
      prev.map((m) => {
        if ((m.status ?? "").toLowerCase() === "closed") return m;
        return { ...m, status: "closed", closedByClosure: true };
      })
    );
  };

  const reactivateAccount = () => {
    setAccountStatus("active");
    setPaymentMethods((prev) =>
      prev.map((m) => {
        if (!m.closedByClosure) return m;
        return { ...m, status: "active", closedByClosure: false, blockedByFullBlock: false, restrictedFrozen: false };
      })
    );
  };

  const statusBadgeClass =
    accountStatus === "active"
      ? "bg-emerald-100 text-emerald-800"
      : accountStatus === "blocked" || accountStatus === "closed"
        ? "bg-rose-100 text-rose-800"
        : accountStatus === "restricted"
          ? "bg-amber-100 text-amber-800"
          : accountStatus === "not_active"
            ? "bg-slate-200 text-slate-700"
            : "bg-slate-200 text-slate-700";
  const riskBadgeClass =
    riskLevel === "High"
      ? "bg-rose-100 text-rose-800"
      : riskLevel === "Medium"
        ? "bg-amber-100 text-amber-800"
        : riskLevel === "Low"
          ? "bg-emerald-100 text-emerald-800"
          : "bg-slate-200 text-slate-700";

  return (
    <section className="page-panel surface-lift space-y-4 p-4 sm:p-6">
      <nav className="text-sm text-slate-500">
        <Link href="/" className="hover:text-[#264B5A]">
          Home
        </Link>{" "}
        /{" "}
        <Link href="/users" className="hover:text-[#264B5A]">
          Users
        </Link>{" "}
        / <span className="text-slate-700">{displayName}</span>
      </nav>

      <div className="flex min-w-0 flex-row items-start gap-4 overflow-hidden rounded-xl border border-slate-200/90 bg-gradient-to-b from-white to-slate-50/80 px-4 py-3 shadow-sm ring-1 ring-slate-200/50 sm:items-center sm:overflow-visible sm:p-5">
        <div className="shrink-0 sm:self-center">
          <div className="relative h-12 w-12 overflow-hidden rounded-full border border-slate-300 bg-slate-200 shadow-sm sm:h-[7.5rem] sm:w-[7.5rem]">
          {selfieUrl && !selfieLoadFailed ? (
            <img
              src={selfieUrl}
              alt=""
              role="presentation"
              onError={() => setSelfieLoadFailed(true)}
              className="h-full w-full object-cover"
            />
          ) : (
            <Image
              src="/user-maya-chen-placeholder.svg"
              alt={`${displayName} profile photo`}
              fill
              sizes="80px"
              className="object-cover"
            />
          )}
          </div>
        </div>
        <div className="min-w-0 flex-1 overflow-hidden sm:px-0">
            <p className="truncate text-base font-semibold text-slate-900 sm:text-lg">{displayName}</p>
            <button
              type="button"
              onClick={copyUserId}
              className="group -mt-0.5 flex min-w-0 max-w-full items-center gap-1 overflow-hidden text-left font-mono text-xs text-slate-500 hover:text-slate-700"
              title="Copy ID"
            >
              <span className="block min-w-0 break-all sm:max-w-[14rem] sm:truncate sm:break-normal lg:max-w-none lg:overflow-visible lg:whitespace-normal">{user.id}</span>
              <span className={copied ? "text-emerald-600" : "opacity-0 transition group-hover:opacity-100"}>
                {copied ? "✓" : "📋"}
              </span>
            </button>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${statusBadgeClass}`}>
                {userStatus}
              </span>
              <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-medium text-sky-800">
                {tierLabel}
              </span>
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${riskBadgeClass}`}>
                {riskLevel ? `${riskLevel} Risk` : "—"}
              </span>
              <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                {countryLabel}
              </span>
              <div className="flex shrink-0 gap-x-3 sm:hidden">
                <div className="min-w-0 text-left">
                  <p className="text-[9px] font-medium uppercase tracking-wide text-slate-500">Balance</p>
                  <p className="truncate text-[11px] font-semibold tabular-nums text-slate-800">
                    {formatMoneyUsd(
                      isTier0 ? null : (userTransactions.length === 0 ? 0 : (financials?.current_balance ?? user.current_balance_usd ?? 0))
                    )}
                  </p>
                </div>
                <div className="min-w-0 text-left">
                  <p className="text-[9px] font-medium uppercase tracking-wide text-slate-500">Turnover</p>
                  <p className="truncate text-[11px] font-semibold tabular-nums text-slate-800">
                    {formatMoneyUsd(
                      isTier0 ? null : (userTransactions.length === 0 ? 0 : (financials?.total_turnover ?? user.total_turnover_usd ?? 0))
                    )}
                  </p>
                </div>
                <div className="min-w-0 text-left">
                  <p className="text-[9px] font-medium uppercase tracking-wide text-slate-500">Last Seen</p>
                  <p className="truncate text-[11px] font-semibold tabular-nums text-slate-800">
                    {formatDate(lastSeenIso)}
                  </p>
                </div>
              </div>
              <div className="flex w-full basis-full shrink-0 flex-wrap items-center gap-1.5 sm:hidden">
                {accountStatus === "not_active" ? (
                  <span className="text-xs text-slate-500">KYC required</span>
                ) : accountStatus === "closed" ? (
                  <button onClick={reactivateAccount} className="rounded-lg border border-emerald-300 px-2 py-1 text-[11px] font-medium text-emerald-700 hover:bg-emerald-50/50">
                    Reactivate Account
                  </button>
                ) : accountStatus === "restricted" ? (
                  <>
                    <button onClick={unblockAccount} className="rounded-lg border border-slate-300 px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50/50">Unblock</button>
                    <button onClick={applyFullBlock} className="rounded-lg border border-rose-300 px-2 py-1 text-[11px] font-medium text-rose-600 hover:bg-rose-50/50">Full Block</button>
                    <button onClick={closeAccount} className="rounded-lg border border-slate-400 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100/50">Account Closure</button>
                  </>
                ) : accountStatus === "blocked" ? (
                  <>
                    <button onClick={unblockAccount} className="rounded-lg border border-slate-300 px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50/50">Unblock</button>
                    <button onClick={closeAccount} className="rounded-lg border border-slate-400 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100/50">Account Closure</button>
                  </>
                ) : (
                  <>
                    <button onClick={applyPartialBlock} disabled={!canOperate} className="rounded-lg border border-amber-300 px-2 py-1 text-[11px] font-medium text-amber-700 enabled:hover:bg-amber-50/50 disabled:cursor-not-allowed disabled:opacity-50">Partial Block</button>
                    <button onClick={applyFullBlock} disabled={!canOperate} className="rounded-lg border border-rose-300 px-2 py-1 text-[11px] font-medium text-rose-600 enabled:hover:bg-rose-50/50 disabled:cursor-not-allowed disabled:opacity-50">Full Block</button>
                    <button onClick={closeAccount} disabled={!canOperate} className="rounded-lg border border-slate-400 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100/50 disabled:cursor-not-allowed disabled:opacity-50">Account Closure</button>
                  </>
                )}
              </div>
            </div>

            <div className="mt-3 hidden min-w-0 flex-col gap-3 sm:flex sm:flex-row sm:items-end sm:justify-between sm:gap-4">
              <div className="mx-auto w-fit max-w-full sm:mx-0">
                <div className="grid grid-cols-3 gap-x-6 gap-y-0.5">
                  <div className="min-w-0 text-left">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">Balance</p>
                    <p className="truncate text-[11px] font-semibold tabular-nums text-slate-800">
                      {formatMoneyUsd(
                        isTier0 ? null : (userTransactions.length === 0 ? 0 : (financials?.current_balance ?? user.current_balance_usd ?? 0))
                      )}
                    </p>
                  </div>
                  <div className="min-w-0 text-left">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">Turnover</p>
                    <p className="truncate text-[11px] font-semibold tabular-nums text-slate-800">
                      {formatMoneyUsd(
                        isTier0 ? null : (userTransactions.length === 0 ? 0 : (financials?.total_turnover ?? user.total_turnover_usd ?? 0))
                      )}
                    </p>
                  </div>
                  <div className="min-w-0 text-left">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">Last Seen</p>
                    <p className="truncate text-[11px] font-semibold tabular-nums text-slate-800">
                      {formatDate(lastSeenIso)}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex min-w-0 shrink-0 flex-wrap items-center justify-center gap-1.5 sm:justify-end">
                {accountStatus === "not_active" ? (
                  <span className="text-xs text-slate-500">KYC required</span>
                ) : accountStatus === "closed" ? (
                  <button
                    onClick={reactivateAccount}
                    className="rounded-lg border border-emerald-300 px-2 py-1 text-[11px] font-medium text-emerald-700 hover:bg-emerald-50/50"
                  >
                    Reactivate Account
                  </button>
                ) : accountStatus === "restricted" ? (
                  <>
                    <button
                      onClick={unblockAccount}
                      className="rounded-lg border border-slate-300 px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50/50"
                    >
                      Unblock
                    </button>
                    <button
                      onClick={applyFullBlock}
                      className="rounded-lg border border-rose-300 px-2 py-1 text-[11px] font-medium text-rose-600 hover:bg-rose-50/50"
                    >
                      Full Block
                    </button>
                    <button
                      onClick={closeAccount}
                      className="rounded-lg border border-slate-400 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100/50"
                    >
                      Account Closure
                    </button>
                  </>
                ) : accountStatus === "blocked" ? (
                  <>
                    <button
                      onClick={unblockAccount}
                      className="rounded-lg border border-slate-300 px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50/50"
                    >
                      Unblock
                    </button>
                    <button
                      onClick={closeAccount}
                      className="rounded-lg border border-slate-400 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100/50"
                    >
                      Account Closure
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={applyPartialBlock}
                      disabled={!canOperate}
                      className="rounded-lg border border-amber-300 px-2 py-1 text-[11px] font-medium text-amber-700 enabled:hover:bg-amber-50/50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Partial Block
                    </button>
                    <button
                      onClick={applyFullBlock}
                      disabled={!canOperate}
                      className="rounded-lg border border-rose-300 px-2 py-1 text-[11px] font-medium text-rose-600 enabled:hover:bg-rose-50/50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Full Block
                    </button>
                    <button
                      onClick={closeAccount}
                      disabled={!canOperate}
                      className="rounded-lg border border-slate-400 px-2 py-1 text-[11px] font-medium text-slate-700 enabled:hover:bg-slate-100/50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Account Closure
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

      <div className="flex flex-col gap-4 xl:flex-row">
        <aside className="min-w-0 shrink-0 space-y-4 lg:w-[320px] lg:min-w-[320px] xl:w-[340px] xl:min-w-[340px]">
          <div className="rounded-2xl border border-slate-200/90 bg-gradient-to-b from-white to-slate-50/95 p-4 shadow-[0_8px_24px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/60">
            <h2 className="heading-section">
              Contact &amp; Details
            </h2>
            <div className="mt-3 flex min-w-0 flex-col gap-2 text-sm text-slate-700">
              <p className="min-w-0 w-full break-words whitespace-normal rounded-xl border border-slate-200/80 bg-white/90 px-3 py-2 shadow-sm"><span className="font-medium">Registration date:</span> {user.registration_date ?? "—"}</p>
              <p className="min-w-0 w-full break-words whitespace-normal rounded-xl border border-slate-200/80 bg-white/90 px-3 py-2 shadow-sm"><span className="font-medium">Email:</span> {user.email}</p>
              <p className="min-w-0 w-full break-words whitespace-normal rounded-xl border border-slate-200/80 bg-white/90 px-3 py-2 shadow-sm"><span className="font-medium">Phone:</span> {user.phone ?? "—"}</p>
              <p className="min-w-0 w-full break-words whitespace-normal rounded-xl border border-slate-200/80 bg-white/90 px-3 py-2 shadow-sm"><span className="font-medium">Date of birth:</span> {user.date_of_birth ?? "—"}</p>
              <p className="min-w-0 w-full break-words whitespace-normal rounded-xl border border-slate-200/80 bg-white/90 px-3 py-2 shadow-sm"><span className="font-medium">Age:</span> {age ?? "—"}</p>
              <p className="min-w-0 w-full break-words whitespace-normal rounded-xl border border-slate-200/80 bg-white/90 px-3 py-2 shadow-sm"><span className="font-medium">Nationality:</span> {user.nationality ?? "—"}</p>
              <p className="min-w-0 w-full break-words whitespace-normal rounded-xl border border-slate-200/80 bg-white/90 px-3 py-2 shadow-sm"><span className="font-medium">Address:</span> {user.address_text ?? "—"}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/90 bg-gradient-to-b from-white to-slate-50/95 p-4 shadow-[0_8px_24px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/60">
            <h2 className="heading-section">
              Documents
            </h2>
            <ul className="mt-3 flex min-w-0 flex-col gap-2.5 text-sm text-slate-700">
              <li className="min-w-0 w-full break-words whitespace-normal rounded-xl border border-slate-200/80 bg-white/90 px-3 py-2 shadow-sm"><span className="font-medium">Proof of Identity:</span> {user.proof_of_identity ?? "—"}</li>
              <li className="min-w-0 w-full break-words whitespace-normal rounded-xl border border-slate-200/80 bg-white/90 px-3 py-2 shadow-sm"><span className="font-medium">Proof of Address:</span> {user.proof_of_address ?? "—"}</li>
                <li className="min-w-0 w-full break-words whitespace-normal rounded-xl border border-slate-200/80 bg-white/90 px-3 py-2 shadow-sm">
                  <span className="font-medium">Source of funds:</span>{" "}
                  {user.source_of_funds_docs && user.source_of_funds_docs.trim().length > 0 ? (
                    user.source_of_funds_docs
                  ) : (
                    <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                      N/A
                    </span>
                  )}
                </li>
            </ul>
          </div>

        </aside>

        <div className="min-w-0 flex-1 space-y-4">
          <div className="overflow-visible rounded-2xl border border-slate-200/90 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/60 sm:overflow-hidden">
            <div className="border-b border-slate-200/80 bg-gradient-to-b from-slate-50 to-slate-100/60 px-2 py-3 sm:px-4 sm:py-3">
              <label id="profile-section-label" className="sr-only">
                Profile section
              </label>
              <div ref={dropdownRef} className="relative sm:hidden">
                <button
                  type="button"
                  id="profile-section"
                  aria-haspopup="listbox"
                  aria-expanded={dropdownOpen}
                  aria-labelledby="profile-section-label"
                  onClick={() => setDropdownOpen((o) => !o)}
                  className="flex w-full min-h-10 items-center justify-between rounded-lg bg-[#244651] px-4 py-2.5 text-left text-sm font-medium text-white shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-100"
                >
                  {PROFILE_TABS.find((t) => t.key === activeTab)?.label ?? "Transactions"}
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={`shrink-0 text-white/90 transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
                    aria-hidden
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>
                {dropdownOpen && (
                  <ul
                    role="listbox"
                    aria-labelledby="profile-section-label"
                    className="absolute left-0 right-0 top-full z-20 mt-1 max-h-[min(16rem,60vh)] overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg [-webkit-overflow-scrolling:touch]"
                  >
                    {PROFILE_TABS.map((tab) => (
                      <li key={tab.key} role="option" aria-selected={activeTab === tab.key}>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab(tab.key);
                            setDropdownOpen(false);
                          }}
                          className={`block w-full px-4 py-2 text-left text-sm font-medium transition-colors ${
                            activeTab === tab.key
                              ? "bg-[#264B5A] text-white"
                              : "text-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          {tab.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="hidden sm:block">
                <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                  {PROFILE_TABS.map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setActiveTab(tab.key)}
                      className={`min-w-0 rounded-xl px-3 py-2.5 text-center text-xs font-medium transition-all ${
                        activeTab === tab.key
                          ? "bg-[#264B5A] text-white shadow-md shadow-[#264B5A]/25 ring-1 ring-slate-900/10"
                          : "border border-slate-200/80 bg-white/90 text-slate-600 shadow-sm hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800"
                      }`}
                    >
                      <span className="block truncate">{tab.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-b from-white to-slate-50/80">
          {activeTab === "overview" && (
            <div className="p-4">
              {isTier1 ? (
                <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50/80 px-3 py-4 text-center text-sm text-slate-500">
                  SOF questionnaire not required for this tier.
                </p>
              ) : isTier2Or3 ? (
                <div className="grid gap-2.5 text-sm text-slate-700 md:grid-cols-2">
                  <p className="rounded-xl border border-slate-200/80 bg-white/90 px-3 py-2 shadow-sm">
                    <span className="font-medium">Occupation:</span> {user.occupation ?? "—"}
                  </p>
                  <p className="rounded-xl border border-slate-200/80 bg-white/90 px-3 py-2 shadow-sm">
                    <span className="font-medium">Employment:</span> {user.employment_status ?? "—"}
                  </p>
                  <p className="rounded-xl border border-slate-200/80 bg-white/90 px-3 py-2 shadow-sm">
                    <span className="font-medium">Annual income:</span>{" "}
                    {user.annual_income_min_usd != null || user.annual_income_max_usd != null
                      ? [user.annual_income_min_usd, user.annual_income_max_usd]
                          .filter((n): n is number => n != null)
                          .map((n) => n.toLocaleString("en-US"))
                          .join(" – ") + " USD"
                      : "—"}
                  </p>
                  <p className="rounded-xl border border-slate-200/80 bg-white/90 px-3 py-2 shadow-sm">
                    <span className="font-medium">Primary source of funds:</span>{" "}
                    {user.primary_source_of_funds ?? user.source_of_funds_docs ?? "—"}
                  </p>
                </div>
              ) : (
                <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50/80 px-3 py-4 text-center text-sm text-slate-500">
                  SOF questionnaire not required for this tier.
                </p>
              )}
            </div>
          )}

          {activeTab === "transactions" && (
            <div className="min-w-0">
              {!txError && visibleTransactions.length === 0 ? (
                <div className="p-4">
                  <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/80 px-3 py-4 text-center text-sm text-slate-500">
                    No transactions.
                  </div>
                </div>
              ) : (
                <>
              <TableSwipeHint />
              <div className="scroll-x-touch w-full min-w-0 overflow-x-auto xl:overflow-x-visible">
              <table className="w-full min-w-[600px] table-fixed border-collapse text-[11px] sm:text-xs">
                <colgroup>
                  <col className="w-[11%]" />
                  <col className="w-[11%]" />
                  <col className="w-[14%]" />
                  <col className="w-[10%]" />
                  <col className="w-[28%]" />
                  <col className="w-[13%]" />
                  <col className="w-[13%]" />
                </colgroup>
                <thead>
                  <tr className="sticky top-0 z-10 border-b border-slate-200/90 bg-slate-50/95 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-[#264B5A] backdrop-blur-sm sm:text-[11px]">
                    <th className={`px-1.5 sm:px-2 ${TABLE_PY_INNER} whitespace-nowrap`}>Date</th>
                    <th className={`px-1.5 sm:px-2 ${TABLE_PY_INNER} whitespace-nowrap`}>Direction</th>
                    <th className={`px-1.5 sm:px-2 ${TABLE_PY_INNER} whitespace-nowrap`}>Type</th>
                    <th className={`px-1.5 sm:px-2 ${TABLE_PY_INNER} whitespace-nowrap`}>Channel</th>
                    <th className={`px-1.5 sm:px-2 ${TABLE_PY_INNER} whitespace-nowrap`}>Counterparty</th>
                    <th className={`px-1.5 sm:px-2 ${TABLE_PY_INNER} whitespace-nowrap`}>Status</th>
                    <th className={`px-1.5 sm:px-2 text-right tabular-nums ${TABLE_PY_INNER} whitespace-nowrap`}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {txError ? (
                    <tr>
                      <td colSpan={7} className="px-3 py-6 text-center text-sm text-rose-600">
                        {txError}
                      </td>
                    </tr>
                  ) : (
                    visibleTransactions.map((tx, idx) => {
                      const direction = tx.direction ?? "—";
                      const directionLower = direction.toLowerCase();
                      const inbound = directionLower === "inbound";
                      const outbound = directionLower === "outbound";
                      const directionLabel = inbound ? "IN" : outbound ? "OUT" : direction;
                      const directionClass = inbound
                        ? "font-medium text-emerald-700"
                        : outbound
                          ? "font-medium text-rose-600"
                          : "text-slate-800";
                      const amountClass = inbound
                        ? "font-medium text-emerald-600"
                        : outbound
                          ? "font-medium text-rose-600"
                          : "font-medium text-slate-800";

                      const channelRaw = tx.channel ?? "";
                      const channelUpper = channelRaw.toUpperCase();
                      let channelLabel = "—";
                      let channelBadgeClass = "bg-slate-50 text-slate-600 ring-slate-200";
                      if (channelUpper.includes("SEPA")) {
                        channelLabel = "SEPA";
                        channelBadgeClass = "bg-sky-50 text-sky-700 ring-sky-200";
                      } else if (channelUpper.includes("EPOS")) {
                        channelLabel = "ePOS";
                        channelBadgeClass = "bg-amber-50 text-amber-800 ring-amber-200";
                      } else if (channelUpper.includes("POS")) {
                        channelLabel = "POS";
                        channelBadgeClass = "bg-slate-100 text-slate-700 ring-slate-200";
                      } else if (channelRaw.trim().length > 0) {
                        channelLabel = channelRaw;
                      }
                      const txStatus = transactionStatusBadge(tx.status);
                      return (
                        <tr
                          key={tx.id}
                          className={`border-b border-slate-200 text-slate-800 transition-colors duration-150 last:border-0 hover:bg-slate-100/60 ${
                            idx % 2 === 1 ? "bg-slate-50/60" : ""
                          }`}
                        >
                          <td className={`px-1.5 tabular-nums sm:px-2 ${TABLE_PY_INNER} whitespace-nowrap`}>
                            {formatDate(tx.transaction_date)}
                          </td>
                          <td className={`px-1.5 sm:px-2 ${TABLE_PY_INNER} whitespace-nowrap`}>
                            <span className={directionClass}>{directionLabel}</span>
                          </td>
                          <td
                            className={`px-1.5 sm:px-2 ${TABLE_PY_INNER} overflow-hidden text-ellipsis whitespace-nowrap`}
                            title={tx.type ?? undefined}
                          >
                            {tx.type ?? "—"}
                          </td>
                          <td className={`px-1.5 sm:px-2 ${TABLE_PY_INNER} whitespace-nowrap`}>
                            <span
                              className={`inline-flex max-w-full shrink-0 items-center whitespace-nowrap rounded-full px-1.5 py-0.5 text-[9px] font-semibold ring-1 sm:text-[10px] ${channelBadgeClass}`}
                            >
                              {channelLabel}
                            </span>
                          </td>
                          <td
                            className={`px-1.5 sm:px-2 ${TABLE_PY_INNER} overflow-hidden text-ellipsis whitespace-nowrap`}
                            title={tx.counterparty_name ?? undefined}
                          >
                            {tx.counterparty_name ?? "—"}
                          </td>
                          <td className={`px-1.5 sm:px-2 ${TABLE_PY_INNER} whitespace-nowrap`}>
                            <span
                              className={`inline-flex max-w-full items-center whitespace-nowrap rounded-full px-1.5 py-0.5 text-[9px] font-semibold capitalize ring-1 sm:text-[10px] ${txStatus.className}`}
                            >
                              {txStatus.label}
                            </span>
                          </td>
                          <td
                            className={`px-1.5 text-right tabular-nums sm:px-2 ${amountClass} ${TABLE_PY_INNER} whitespace-nowrap`}
                          >
                            {formatTransactionAmount(tx.amount, tx.currency, tx.direction)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
              </div>
                </>
              )}
            </div>
          )}

          {activeTab === "accounts" && (
            <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-3">
              <div className="flex flex-col gap-3 rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
                <h2 className="heading-section">
                  Cards
                </h2>
                <ul className="flex flex-col gap-2.5">
                  {isTier0 || userCards.length === 0 ? (
                    <li className="rounded-lg border border-dashed border-slate-200 bg-slate-50/80 px-3 py-4 text-center text-sm text-slate-500">
                      No cards.
                    </li>
                  ) : (
                    userCards.map((card) => (
                      <li
                        key={card.id}
                        className="flex flex-col gap-2 rounded-xl border border-slate-200/80 bg-white/90 px-3 py-2.5 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium capitalize text-slate-900">
                            {card.card_network ?? card.type ?? "Card"}
                          </p>
                          <PaymentMethodStatusBadge status={card.status} />
                        </div>
                        <p className="font-mono text-xs tracking-tight text-slate-600">
                          {card.masked_number ?? "—"}
                        </p>
                      </li>
                    ))
                  )}
                </ul>
              </div>
              <div className="flex flex-col gap-3 rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
                <h2 className="heading-section">
                  Bank Accounts
                </h2>
                <ul className="flex flex-col gap-2.5">
                  {isTier0 || userBankAccounts.length === 0 ? (
                    <li className="rounded-lg border border-dashed border-slate-200 bg-slate-50/80 px-3 py-4 text-center text-sm text-slate-500">
                      No bank accounts.
                    </li>
                  ) : (
                    userBankAccounts.map((acc) => (
                      <li
                        key={acc.id}
                        className="flex flex-col gap-2 rounded-xl border border-slate-200/80 bg-white/90 px-3 py-2.5 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium capitalize text-slate-900">
                            {acc.bank_type ?? acc.type ?? "Account"}
                          </p>
                          <PaymentMethodStatusBadge status={acc.status} />
                        </div>
                        <p className="font-mono text-xs tracking-tight text-slate-600">
                          {acc.account_number ?? "—"}
                        </p>
                      </li>
                    ))
                  )}
                </ul>
              </div>
              <div className="flex flex-col gap-3 rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
                <h2 className="heading-section">
                  Crypto Accounts
                </h2>
                <ul className="flex flex-col gap-2.5">
                  {isTier0 || userCryptoAccounts.length === 0 ? (
                    <li className="rounded-lg border border-dashed border-slate-200 bg-slate-50/80 px-3 py-4 text-center text-sm text-slate-500">
                      No crypto accounts.
                    </li>
                  ) : (
                    userCryptoAccounts.map((acc) => (
                      <li
                        key={acc.id}
                        className="flex flex-col gap-2 rounded-xl border border-slate-200/80 bg-white/90 px-3 py-2.5 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium capitalize text-slate-900">
                            {acc.wallet_type ?? acc.type ?? "Wallet"}
                          </p>
                          <PaymentMethodStatusBadge status={acc.status} />
                        </div>
                        <p className="break-all font-mono text-[11px] leading-relaxed text-slate-600">
                          {acc.wallet_address ?? acc.account_number ?? "—"}
                        </p>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            </div>
          )}

          {activeTab === "network" && (
            <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-3">
              <div className="flex flex-col gap-3 rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
                <h2 className="heading-section">
                  Devices
                </h2>
                <ul className="flex flex-col gap-2.5">
                  {uniqueDevices.length === 0 ? (
                    <li className="rounded-lg border border-dashed border-slate-200 bg-slate-50/80 px-3 py-4 text-center text-sm text-slate-500">
                      No devices.
                    </li>
                  ) : (
                    uniqueDevices.map((d, i) => (
                      <li
                        key={i}
                        className="rounded-xl border border-slate-200/80 bg-white/90 px-3 py-2 shadow-sm"
                      >
                        <p className="text-sm font-medium text-slate-800">{d.deviceName}</p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {d.countryCode ?? "—"} • {formatDate(d.lastSeen)}
                        </p>
                      </li>
                    ))
                  )}
                </ul>
              </div>
              <div className="flex flex-col gap-3 rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
                <h2 className="heading-section">
                  IP Addresses
                </h2>
                <ul className="flex flex-col gap-2.5">
                  {uniqueIps.length === 0 ? (
                    <li className="rounded-lg border border-dashed border-slate-200 bg-slate-50/80 px-3 py-4 text-center text-sm text-slate-500">
                      No IP addresses.
                    </li>
                  ) : (
                    uniqueIps.map(({ ip, usageCount, lastSeen, country }, i) => (
                      <li
                        key={i}
                        className="rounded-xl border border-slate-200/80 bg-white/90 px-3 py-2 shadow-sm"
                      >
                        <p className="font-mono text-sm font-medium text-slate-800">{maskIp(ip)}</p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {country} • {usageCount} events • {formatDate(lastSeen)}
                        </p>
                      </li>
                    ))
                  )}
                </ul>
              </div>
              <div className="flex flex-col gap-3 rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
                <h2 className="heading-section">
                  Linked Accounts
                </h2>
                <ul className="flex flex-col gap-2.5">
                  {linkedAccounts.length === 0 ? (
                    <li className="rounded-lg border border-dashed border-slate-200 bg-slate-50/80 px-3 py-4 text-center text-sm text-slate-500">
                      No linked accounts.
                    </li>
                  ) : (
                    linkedAccounts.map(({ userId, deviceName }) => (
                      <li
                        key={userId}
                        className="rounded-xl border border-slate-200/80 bg-white/90 px-3 py-2 shadow-sm"
                      >
                        <p className="text-sm font-medium text-slate-800">
                          <Link
                            href={`/users/${userId}`}
                            className="font-mono text-[#264B5A] hover:underline"
                          >
                            {userId}
                          </Link>
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          Shared device: {deviceName}
                        </p>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            </div>
          )}

          {activeTab === "activity" && (
            <div className="overflow-hidden">
              {userEvents.length === 0 ? (
                <div className="p-4">
                  <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/80 px-3 py-4 text-center text-sm text-slate-500">
                    No activity.
                  </div>
                </div>
              ) : (
                <>
              <div className="px-2 sm:px-0">
                <TableSwipeHint />
              </div>
              <div className="scroll-x-touch">
              <table className="w-full min-w-[560px] table-fixed border-collapse text-sm">
                <thead>
                  <tr className="sticky top-0 z-10 border-b border-slate-200/90 bg-slate-50/95 text-left text-xs font-semibold uppercase tracking-[0.08em] text-[#264B5A] backdrop-blur-sm">
                    <th className={`w-[165px] shrink-0 px-4 ${TABLE_PY_INNER}`}>Date & Time</th>
                    <th className={`min-w-0 px-4 text-center ${TABLE_PY_INNER}`}>Event</th>
                    <th className={`w-[110px] px-4 ${TABLE_PY_INNER}`}>IP</th>
                    <th className={`w-[80px] px-4 ${TABLE_PY_INNER}`}>Country</th>
                    <th className={`w-[120px] px-4 ${TABLE_PY_INNER}`}>Device</th>
                  </tr>
                </thead>
                <tbody>
                    {userEvents.map((evt, idx) => (
                      <tr
                        key={evt.id}
                        className={`border-b border-slate-200 text-slate-700 transition-colors duration-150 last:border-0 hover:bg-slate-100/60 ${
                          idx % 2 === 1 ? "bg-slate-50/60" : ""
                        }`}
                      >
                        <td className={`whitespace-nowrap px-4 tabular-nums ${TABLE_PY_INNER}`}>
                          {formatDateTime(evt.event_time)}
                        </td>
                        <td className={`px-4 text-center ${TABLE_PY_INNER}`}>{formatEventType(evt.event_type)}</td>
                        <td className={`px-4 font-mono text-xs ${TABLE_PY_INNER}`}>{maskIp(evt.ip_address)}</td>
                        <td className={`px-4 ${TABLE_PY_INNER}`}>{evt.country_code ?? "—"}</td>
                        <td className={`px-4 ${TABLE_PY_INNER}`}>{evt.device_name ?? "—"}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
              </div>
                </>
              )}
            </div>
          )}

          {activeTab === "opslog" && (
            <div className="p-4">
              {opsEvents.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/80 px-3 py-4 text-center text-sm text-slate-500">
                  No operations logged.
                </div>
              ) : (
                <ul className="flex flex-col gap-2.5 text-sm text-slate-700">
                  {opsEvents.map((op) => (
                    <li
                      key={op.id}
                      className="flex w-full flex-col gap-0.5 rounded-xl border border-slate-200/80 bg-white/90 px-3 py-2 shadow-sm"
                    >
                      <p className="text-sm font-medium text-slate-800">
                        {getOpsEventLabel(op.action_type)}
                      </p>
                      <p className="text-sm text-slate-600">
                        {formatDateTime(op.event_time)}
                        {op.performed_by ? ` · ${op.performed_by}` : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {activeTab === "alerts" && (
            <div className="w-full min-w-0">
              {userAlerts.length === 0 ? (
                <div className="p-4">
                  <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/80 px-3 py-4 text-center text-sm text-slate-500">
                    No linked alerts.
                  </div>
                </div>
              ) : (
                <>
              <TableSwipeHint />
              <div className="scroll-x-touch w-full min-w-0">
              <table className="w-full min-w-[600px] table-fixed border-collapse text-sm">
                <colgroup>
                  <col className="w-[16.67%]" />
                  <col className="w-[16.67%]" />
                  <col className="w-[16.67%]" />
                  <col className="w-[16.67%]" />
                  <col className="w-[16.67%]" />
                  <col className="w-[16.67%]" />
                </colgroup>
                <thead>
                  <tr className="sticky top-0 z-10 border-b border-slate-200/90 bg-slate-50/95 text-left text-xs font-semibold uppercase tracking-[0.08em] text-[#264B5A] backdrop-blur-sm">
                    <th className={`whitespace-nowrap px-3 ${TABLE_PY_INNER}`}>Alert ID</th>
                    <th className={`whitespace-nowrap px-3 text-right tabular-nums ${TABLE_PY_INNER}`}>Created</th>
                    <th className={`whitespace-nowrap px-3 ${TABLE_PY_INNER}`}>Type</th>
                    <th className={`whitespace-nowrap px-3 ${TABLE_PY_INNER}`}>Severity</th>
                    <th className={`whitespace-nowrap px-3 ${TABLE_PY_INNER}`}>Status</th>
                    <th className={`whitespace-nowrap px-3 ${TABLE_PY_INNER}`}>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {userAlerts.map((a, idx) => (
                    <tr
                      key={a.id}
                      className={`border-b border-slate-200 text-slate-800 transition-colors duration-150 last:border-0 hover:bg-slate-100/60 ${
                        idx % 2 === 1 ? "bg-slate-50/60" : ""
                      }`}
                    >
                      <td className={`px-3 ${TABLE_PY_INNER}`}>
                        <Link
                          href={`/alerts/${a.id}`}
                          className="font-mono text-xs text-[#264B5A] hover:underline"
                        >
                          {a.id}
                        </Link>
                      </td>
                      <td className={`px-3 text-right text-slate-600 tabular-nums ${TABLE_PY_INNER}`}>
                        {formatDateTime(a.created_at)}
                      </td>
                      <td className={`px-3 ${TABLE_PY_INNER}`}>{a.type ?? "—"}</td>
                      <td className={`px-3 ${TABLE_PY_INNER}`}>{a.severity ?? "—"}</td>
                      <td className={`px-3 ${TABLE_PY_INNER}`}>{a.status ?? "—"}</td>
                      <td className={`max-w-0 truncate px-3 ${TABLE_PY_INNER}`} title={a.description ?? undefined}>
                        {a.description ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
                </>
              )}
            </div>
          )}

          {activeTab === "notes" && (
            <div className="p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  value={noteText}
                  onChange={(event) => setNoteText(event.target.value)}
                  placeholder="Leave a note..."
                  className="min-h-11 w-full min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-[#264B5A] focus:ring-1 focus:ring-[#264B5A]/30 sm:min-h-0"
                />
                <button
                  type="button"
                  onClick={addNote}
                  className="shrink-0 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-slate-100 transition-colors duration-150 hover:bg-brand-500 sm:min-w-[4.5rem]"
                >
                  Add
                </button>
              </div>
              {notes.length === 0 ? (
                <div className="mt-3">
                  <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/80 px-3 py-4 text-center text-sm text-slate-500">
                    No notes yet.
                  </div>
                </div>
              ) : (
                <ul className="mt-3 flex flex-col gap-3">
                  {notes.map((note) => {
                    const noteStyle =
                      note.note_type === "admin"
                        ? "bg-purple-50/80 border-slate-200"
                        : note.note_type === "analyst"
                          ? "bg-blue-50/80 border-slate-200"
                          : "bg-white border-slate-200";
                    return (
                      <li
                        key={note.id}
                        className={`rounded-xl border p-4 ${noteStyle}`}
                      >
                        <div className="mb-2 flex justify-between gap-3 text-xs text-slate-500">
                          <span className="min-w-0 truncate text-[11px]">
                            {note.created_by ?? "—"}
                          </span>
                          <span className="shrink-0 tabular-nums text-[10px]">
                            {formatDateTime(note.created_at)}
                          </span>
                        </div>
                        <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-900">
                          {note.note_text}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
