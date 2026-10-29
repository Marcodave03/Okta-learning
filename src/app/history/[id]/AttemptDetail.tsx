"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";
import QuestionCard from "@/components/QuestionCard";
import { api, formatDate, formatDuration } from "@/lib/client";
import type { Attempt } from "@/lib/types";

export default function AttemptDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"wrong" | "all">("wrong");

  useEffect(() => {
    api<{ attempt: Attempt }>(`/api/attempts/${id}`)
      .then((d) => {
        setAttempt(d.attempt);
        if (d.attempt.score === d.attempt.total) setTab("all");
      })
      .catch((e: Error) => setError(e.message));
  }, [id]);

  async function remove() {
    if (!confirm("Delete this attempt from the history?")) return;
    try {
      await api(`/api/attempts/${id}`, { method: "DELETE" });
      router.push("/history");
    } catch (e) {
      setError((e as Error).message);
    }
  }

  if (error) return <p className="card p-6 text-bad">{error}</p>;
  if (!attempt) return <p className="text-muted">Loading attempt…</p>;

  const wrong = attempt.items.filter((i) => !i.isCorrect);
  const shown = tab === "wrong" ? wrong : attempt.items;

  return (
    <div className="space-y-6">
      <Link href="/history" className="text-sm font-semibold text-okta-blue hover:underline">← All attempts</Link>

      <section className={`card overflow-hidden border-t-4 ${attempt.passed ? "border-t-good" : "border-t-bad"}`}>
        <div className="flex flex-wrap items-center gap-6 p-6">
          <div className="flex-1">
            <p className="text-sm text-muted">{formatDate(attempt.createdAt)}</p>
            <h1 className="mt-1 text-2xl font-bold text-okta-navy">{attempt.name}</h1>
            <p className="mt-1 text-sm text-muted">
              Time {formatDuration(attempt.durationSec)} · Pass mark {attempt.settings.passingScore}%
            </p>
          </div>
          <div className="text-right">
            <p className="text-4xl font-bold text-okta-navy">{Math.round(attempt.percent)}%</p>
            <p className="text-sm font-semibold text-muted">{attempt.score} of {attempt.total} correct</p>
          </div>
          <span className={`chip px-4 py-1.5 text-sm ${attempt.passed ? "border-good/30 bg-good-bg text-good" : "border-bad/30 bg-bad-bg text-bad"}`}>
            {attempt.passed ? "Passed" : "Not passed"}
          </span>
        </div>
        <div className="flex flex-wrap gap-3 border-t border-line bg-canvas px-6 py-4">
          {wrong.length > 0 && (
            <Link href={`/test?retry=${attempt.id}`} className="btn-primary">
              Retake the {wrong.length} wrong question{wrong.length === 1 ? "" : "s"}
            </Link>
          )}
          <Link href="/test" className="btn-secondary">New test</Link>
          <button className="btn-danger ml-auto" onClick={remove}>Delete</button>
        </div>
      </section>

      <div className="flex gap-2 border-b border-line">
        {([
          ["wrong", `Wrong answers (${wrong.length})`],
          ["all", `All questions (${attempt.items.length})`],
        ] as const).map(([key, text]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
              tab === key ? "border-okta-blue text-okta-blue" : "border-transparent text-muted hover:text-okta-blue"
            }`}
          >
            {text}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="font-semibold text-good">No wrong answers — perfect score!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {shown.map((item) => {
            const position = attempt.items.indexOf(item) + 1;
            return (
              <article key={position} className={`card border-l-4 p-5 sm:p-6 ${item.isCorrect ? "border-l-good" : "border-l-bad"}`}>
                <QuestionCard
                  item={item}
                  answer={item.answer}
                  reveal
                  label={`Question ${position} · ${item.isCorrect ? "Correct" : "Wrong"}`}
                />
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
