"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

interface IndexItem {
  id: string;
  name: string;
  nganh: string;
  dob: string;
  cccd: string;
}

/** Bỏ dấu tiếng Việt (bản client, đồng bộ với lib/text). */
function norm(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export default function SearchClient({ org, orgName }: { org: string; orgName: string }) {
  const [items, setItems] = useState<IndexItem[] | null>(null);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    setItems(null);
    setError(false);
    fetch(`/index/${org}.json`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: IndexItem[]) => active && setItems(data))
      .catch(() => active && setError(true));
    return () => {
      active = false;
    };
  }, [org]);

  // index đã chuẩn hoá để tìm nhanh (theo tên + CCCD)
  const indexed = useMemo(
    () => (items ?? []).map((it) => ({ it, n: norm(it.name), c: it.cccd ?? "" })),
    [items],
  );

  const q = norm(query);
  const qDigits = query.replace(/\D/g, "");
  const results = useMemo(() => {
    if (q.length < 1) return [];
    const isNumeric = qDigits.length >= 3 && qDigits.length === query.trim().length;
    const starts: IndexItem[] = [];
    const contains: IndexItem[] = [];
    for (const { it, n, c } of indexed) {
      if (isNumeric) {
        // query toàn số -> tìm theo CCCD
        if (c.includes(qDigits)) {
          if (c.startsWith(qDigits)) starts.push(it);
          else contains.push(it);
        }
      } else if (n.startsWith(q)) {
        starts.push(it);
      } else if (n.includes(q)) {
        contains.push(it);
      }
      if (starts.length + contains.length > 50) break;
    }
    return [...starts, ...contains].slice(0, 30);
  }, [q, qDigits, query, indexed]);

  return (
    <div>
      <div className="sticky top-14 z-10 -mx-4 bg-slate-100/90 px-4 pb-3 pt-2 backdrop-blur">
        <div className="relative">
          <input
            ref={inputRef}
            type="search"
            inputMode="search"
            autoComplete="off"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nhập tên hoặc số CCCD…"
            disabled={!items && !error}
            className="w-full rounded-2xl border border-slate-200 bg-white py-3.5 pl-11 pr-4 text-base text-slate-900 shadow-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-900/5 disabled:opacity-60"
          />
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
            <SearchIcon />
          </span>
        </div>
      </div>

      {error && (
        <p className="mt-8 text-center text-sm text-red-500">
          Không tải được danh sách của đơn vị “{org}”.
        </p>
      )}

      {!items && !error && (
        <p className="mt-8 text-center text-sm text-slate-400">Đang tải danh sách…</p>
      )}

      {items && query.trim().length === 0 && (
        <p className="mt-10 text-center text-sm text-slate-400">
          Gõ tên hoặc số CCCD để tìm hồ sơ trong ngành {orgName}.
        </p>
      )}

      {items && query.trim().length >= 1 && results.length === 0 && (
        <p className="mt-10 text-center text-sm text-slate-500">
          Không tìm thấy “{query.trim()}”.
        </p>
      )}

      <ul className="mt-3 space-y-2">
        {results.map((it) => (
          <li key={it.id}>
            <Link
              href={`/p/${it.id}`}
              className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition active:bg-slate-50"
            >
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="truncate font-semibold leading-tight text-slate-900">
                    {it.name}
                  </span>
                  {it.dob && (
                    <span className="shrink-0 text-xs font-normal leading-tight text-slate-400">
                      {it.dob}
                    </span>
                  )}
                </span>
                {it.cccd && (
                  <span className="mt-1.5 inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[11px] tracking-wide text-slate-500">
                    CCCD {it.cccd}
                  </span>
                )}
              </span>

              <ChevronRight />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ChevronRight() {
  return (
    <svg className="shrink-0 text-slate-300" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}
