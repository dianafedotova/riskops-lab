"use client";

import type { AdminEntitySearchOption } from "@/lib/services/admin-review-cases";
import { useCallback, useEffect, useId, useRef, useState } from "react";

type AdminEntityAsyncPickerProps = {
  ariaLabel: string;
  disabled?: boolean;
  placeholder?: string;
  selectedId: string | null;
  selectedLabel: string | null;
  onClear: () => void;
  onSelect: (option: AdminEntitySearchOption) => void;
  search: (query: string) => Promise<{ options: AdminEntitySearchOption[]; error: string | null }>;
  debounceMs?: number;
};

export function AdminEntityAsyncPicker({
  ariaLabel,
  disabled,
  placeholder = "Search…",
  selectedId,
  selectedLabel,
  onClear,
  onSelect,
  search,
  debounceMs = 280,
}: AdminEntityAsyncPickerProps) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<AdminEntitySearchOption[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runSearch = useCallback(
    async (q: string) => {
      setLoading(true);
      setSearchError(null);
      const result = await search(q);
      setLoading(false);
      if (result.error) {
        setSearchError(result.error);
        setOptions([]);
        return;
      }
      setOptions(result.options);
    },
    [search]
  );

  useEffect(() => {
    if (selectedId) {
      setInput(selectedLabel ?? "");
    }
  }, [selectedId, selectedLabel]);

  useEffect(() => {
    if (!open || selectedId) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = input.trim();
    if (!q) {
      setOptions([]);
      setSearchError(null);
      return;
    }

    debounceRef.current = setTimeout(() => {
      void runSearch(q);
    }, debounceMs);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [input, open, selectedId, debounceMs, runSearch]);

  useEffect(() => {
    if (!open) return;
    const handleDown = (event: MouseEvent | TouchEvent) => {
      if (rootRef.current?.contains(event.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handleDown);
    document.addEventListener("touchstart", handleDown);
    return () => {
      document.removeEventListener("mousedown", handleDown);
      document.removeEventListener("touchstart", handleDown);
    };
  }, [open]);

  const showList = open && !selectedId && input.trim().length > 0;

  return (
    <div ref={rootRef} className="relative">
      <div className="flex gap-1">
        <input
          type="text"
          aria-label={ariaLabel}
          aria-expanded={showList}
          aria-controls={showList ? listId : undefined}
          aria-autocomplete="list"
          disabled={disabled}
          value={selectedId ? (selectedLabel ?? selectedId) : input}
          onChange={(e) => {
            if (selectedId) return;
            setInput(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            if (!selectedId) setOpen(true);
          }}
          placeholder={placeholder}
          className="dark-input h-10 min-w-0 flex-1 rounded-[0.65rem] px-3 text-sm"
        />
        {selectedId ? (
          <button
            type="button"
            className="ui-btn ui-btn-secondary shrink-0 rounded-[0.65rem] px-2.5 py-1 text-xs font-medium"
            onClick={() => {
              onClear();
              setInput("");
              setOptions([]);
              setOpen(false);
            }}
          >
            Clear
          </button>
        ) : null}
      </div>
      {searchError ? <p className="mt-1 text-xs text-rose-600">{searchError}</p> : null}
      {showList ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 top-full z-40 mt-1 max-h-52 overflow-y-auto rounded-[0.7rem] border border-slate-200/95 bg-white py-1 shadow-[0_18px_36px_rgba(15,23,42,0.16)]"
        >
          {loading ? (
            <li className="px-3 py-2 text-sm text-slate-500">Searching…</li>
          ) : options.length === 0 ? (
            <li className="px-3 py-2 text-sm text-slate-500">No matches</li>
          ) : (
            options.map((opt) => (
              <li key={opt.id} role="option">
                <button
                  type="button"
                  className="block w-full px-3 py-2 text-left text-sm text-slate-800 hover:bg-slate-100"
                  onClick={() => {
                    onSelect(opt);
                    setOpen(false);
                    setInput(opt.label);
                  }}
                >
                  <span className="font-medium">{opt.label}</span>
                  <span className="mt-0.5 block font-mono text-[11px] text-slate-500">{opt.id}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
