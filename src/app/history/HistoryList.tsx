"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { api, formatDate, formatDuration } from "@/lib/client";
import type { AttemptSummary } from "@/lib/types";

export default function HistoryList() {
  const [attempts, setAttempts] = useState<AttemptSummary[] | null>(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("");

  useEffect(() => {
    api<{ attempts: AttemptSummary[] }>("/api/attempts")
      .then((d) => setAttempts(d.attempts))
      .catch((e: Error) => setError(e.message));
  }, []);

  const visible = useMemo(() => {
    const term = filter.trim().toLowerCase();
    return (attempts ?? []).filter((a) => !term || a.name.toLowerCase().includes(term));
  }, [attempts, filter]);

  const best = visible.reduce((m, a) => Math.max(m, a.percent), 0);
  const avg = visible.length ? visible.reduce((s, a) => s + a.percent, 0) / visible.length : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-okta-navy">History</h1>
          <p className="mt-1 text-sm text-muted">Open an attempt to review the questions you got wrong.</p>
        </div>
        <Link href="/test" className="btn-primary">New test</Link>
      </div>

      {error && <p className="card p-6 text-bad">{error}</p>}
      {!attempts && !error && <p className="text-muted">Loading…</p>}

      {attempts && attempts.length === 0 && (
        <div className="card p-10 text-center">
          <p className="font-semibold text-ink">No attempts yet</p>
          <p className="mt-1 text-sm text-muted">Take a test and your score will show up here.</p>
        </div>
      )}

      {attempts && attempts.length > 0 && (
        <>
          <div className="grid grid-cols-3 gap-3">
            {[
              ["Attempts", String(visible.length)],
              ["Best score", `${Math.round(best)}%`],
              ["Average", `${Math.round(avg)}%`],
            ].map(([k, v]) => (
              <div key={k} className="card px-5 py-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">{k}</p>
                <p className="mt-1 text-2xl font-bold text-okta-navy">{v}</p>
              </div>
            ))}
          </div>

          <input
            className="input sm:max-w-xs"
            placeholder="Filter by name…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />

          <div className="card overflow-hidden">
            <ul className="divide-y divide-line">
              {visible.map((a) => (
                <li key={a.id}>
                  <Link href={`/history/${a.id}`} className="flex flex-wrap items-center gap-x-6 gap-y-2 px-5 py-4 transition-colors hover:bg-okta-sky/60">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-ink">{a.name}</p>
                      <p className="text-xs text-muted">{formatDate(a.createdAt)} · {formatDuration(a.durationSec)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-okta-navy">{a.score} / {a.total}</p>
                      <p className="text-xs text-muted">{a.total - a.score} wrong</p>
                    </div>
                    <span className={`chip w-20 justify-center ${a.passed ? "border-good/30 bg-good-bg text-good" : "border-bad/30 bg-bad-bg text-bad"}`}>
                      {Math.round(a.percent)}% {a.passed ? "Pass" : "Fail"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
