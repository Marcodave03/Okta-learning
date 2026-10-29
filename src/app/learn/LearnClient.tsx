"use client";

import Link from "next/link";
import { use, useEffect, useMemo, useState } from "react";
import QuestionCard from "@/components/QuestionCard";
import { api } from "@/lib/client";
import { correctAnswer, isAnswered, isCorrect, topicsOf } from "@/lib/grading";
import type { Answer, Question, TestQuestion } from "@/lib/types";

const asStudyItem = (question: Question): TestQuestion => ({
  question,
  order: [...Array(question.type === "matching" ? question.pairs!.length : question.options!.length).keys()],
  rightChoices: [...new Set((question.pairs ?? []).map((p) => p.right))].sort((a, b) => a.localeCompare(b)),
});

export default function LearnClient({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = use(searchParams);
  const initialTopic = typeof params.topic === "string" ? params.topic : "";

  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [error, setError] = useState("");
  const [topic, setTopic] = useState(initialTopic);
  const [search, setSearch] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [answers, setAnswers] = useState<Record<number, Answer>>({});
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});

  useEffect(() => {
    api<{ questions: Question[] }>("/api/questions")
      .then((d) => setQuestions(d.questions))
      .catch((e: Error) => setError(e.message));
  }, []);

  const topics = useMemo(() => topicsOf(questions ?? []), [questions]);
  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (questions ?? []).filter(
      (q) =>
        (!topic || q.topic === topic) &&
        (!term ||
          [q.prompt, ...q.context, ...(q.options ?? []), ...(q.pairs ?? []).flatMap((p) => [p.left, p.right])]
            .join(" ")
            .toLowerCase()
            .includes(term)),
    );
  }, [questions, topic, search]);

  if (error) return <p className="card p-6 text-bad">{error}</p>;
  if (!questions) return <p className="text-muted">Loading questions…</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-okta-navy">Learn</h1>
          <p className="mt-1 text-sm text-muted">
            Pick an answer and check it, or reveal the answer straight away.
          </p>
        </div>
        <Link
          href={topic ? `/test?topic=${encodeURIComponent(topic)}` : "/test"}
          className="btn-primary"
        >
          {topic ? "Practice test on this topic" : "Take a practice test"}
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        {[{ topic: "", count: questions.length }, ...topics].map((t) => (
          <button
            key={t.topic || "all"}
            onClick={() => setTopic(t.topic)}
            className={`chip ${
              topic === t.topic
                ? "border-okta-blue bg-okta-blue text-white"
                : "border-line bg-white text-muted hover:border-okta-blue hover:text-okta-blue"
            }`}
          >
            {t.topic || "All topics"} · {t.count}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          className="input sm:max-w-sm"
          placeholder="Search questions…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-ink">
          <input
            type="checkbox"
            className="h-4 w-4 accent-okta-blue"
            checked={showAll}
            onChange={(e) => setShowAll(e.target.checked)}
          />
          Show all answers
        </label>
        <span className="text-sm text-muted sm:ml-auto">{visible.length} questions</span>
      </div>

      <div className="space-y-4">
        {visible.map((q) => {
          const shown = showAll || revealed[q.id];
          const tried = answers[q.id];
          const answer = shown && !isAnswered(q, tried) ? correctAnswer(q) : tried ?? {};
          return (
            <article key={q.id} className="card p-5 sm:p-6">
              <QuestionCard
                item={asStudyItem(q)}
                answer={answer}
                reveal={shown}
                label={`#${q.id}`}
                onChange={(a) => setAnswers((prev) => ({ ...prev, [q.id]: a }))}
              />
              <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-line pt-4">
                {shown ? (
                  <>
                    {isAnswered(q, tried) && (
                      <span className={`text-sm font-bold ${isCorrect(q, tried) ? "text-good" : "text-bad"}`}>
                        {isCorrect(q, tried) ? "You got it right" : "Not quite"}
                      </span>
                    )}
                    {!showAll && (
                      <button
                        className="btn-ghost"
                        onClick={() => {
                          setRevealed((r) => ({ ...r, [q.id]: false }));
                          setAnswers((a) => ({ ...a, [q.id]: {} }));
                        }}
                      >
                        Try again
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <button
                      className="btn-primary"
                      disabled={!isAnswered(q, tried)}
                      onClick={() => setRevealed((r) => ({ ...r, [q.id]: true }))}
                    >
                      Check answer
                    </button>
                    <button className="btn-ghost" onClick={() => setRevealed((r) => ({ ...r, [q.id]: true }))}>
                      Show answer
                    </button>
                  </>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
