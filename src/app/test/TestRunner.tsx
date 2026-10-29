"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useCallback, useEffect, useRef, useState } from "react";
import QuestionCard from "@/components/QuestionCard";
import { api, formatDuration, rememberName, rememberedName } from "@/lib/client";
import { isAnswered, isCorrect } from "@/lib/grading";
import type { Answer, TestQuestion, TestSettings } from "@/lib/types";

type Params = Promise<Record<string, string | string[] | undefined>>;

interface SettingsResponse {
  settings: TestSettings;
  topics: { topic: string; count: number }[];
}

function SettingsSummary({ settings, topic, retry }: { settings: TestSettings; topic: string; retry: string }) {
  const rows: [string, string][] = [
    ["Questions", retry ? "Only the ones you got wrong" : settings.questionCount ? String(settings.questionCount) : "All"],
    ["Topics", topic || (settings.topics.length ? settings.topics.join(", ") : "All topics")],
    ["Time limit", settings.timeLimitMinutes ? `${settings.timeLimitMinutes} minutes` : "None"],
    ["Pass mark", `${settings.passingScore}%`],
    ["Feedback", settings.feedback === "instant" ? "After each question" : "At the end"],
    ["Order", [settings.shuffleQuestions && "random questions", settings.shuffleOptions && "random answers"].filter(Boolean).join(", ") || "Fixed"],
  ];
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
      {rows.map(([k, v]) => (
        <div key={k}>
          <dt className="text-xs font-semibold uppercase tracking-wide text-muted">{k}</dt>
          <dd className="mt-0.5 font-semibold text-ink">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export default function TestRunner({ searchParams }: { searchParams: Params }) {
  const params = use(searchParams);
  const topic = typeof params.topic === "string" ? params.topic : "";
  const retry = typeof params.retry === "string" ? params.retry : "";
  const router = useRouter();

  const [config, setConfig] = useState<SettingsResponse | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // running test state
  const [settings, setSettings] = useState<TestSettings | null>(null);
  const [items, setItems] = useState<TestQuestion[]>([]);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [checked, setChecked] = useState<boolean[]>([]);
  const [index, setIndex] = useState(0);
  const [startedAt, setStartedAt] = useState(0);
  const [now, setNow] = useState(0);
  const submitted = useRef(false);

  useEffect(() => {
    api<SettingsResponse>("/api/settings")
      .then((d) => {
        setConfig(d);
        setName((n) => n || rememberedName());
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  const running = settings !== null;

  const submit = useCallback(async () => {
    if (!settings || submitted.current) return;
    submitted.current = true;
    setBusy(true);
    try {
      const { id } = await api<{ id: number }>("/api/attempts", {
        method: "POST",
        body: JSON.stringify({
          name,
          settings,
          durationSec: Math.round((Date.now() - startedAt) / 1000),
          items: items.map((it, i) => ({
            id: it.question.id,
            order: it.order,
            rightChoices: it.rightChoices,
            answer: answers[i],
          })),
        }),
      });
      router.push(`/history/${id}`);
    } catch (e) {
      submitted.current = false;
      setBusy(false);
      setError((e as Error).message);
    }
  }, [settings, name, startedAt, items, answers, router]);

  const limitSec = (settings?.timeLimitMinutes ?? 0) * 60;
  const elapsed = running ? Math.floor((now - startedAt) / 1000) : 0;
  const remaining = limitSec ? Math.max(0, limitSec - elapsed) : null;

  const submitRef = useRef(submit);
  useEffect(() => {
    submitRef.current = submit;
  }, [submit]);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => {
      const current = Date.now();
      setNow(current);
      // Time is up: submit whatever has been answered.
      if (limitSec && current - startedAt >= limitSec * 1000) submitRef.current();
    }, 1000);
    const warn = (e: BeforeUnloadEvent) => {
      if (!submitted.current) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => {
      clearInterval(t);
      window.removeEventListener("beforeunload", warn);
    };
  }, [running, limitSec, startedAt]);

  async function start(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return setError("Please enter your name first.");
    setError("");
    setBusy(true);
    try {
      const data = await api<{ settings: TestSettings; questions: TestQuestion[] }>("/api/test", {
        method: "POST",
        body: JSON.stringify({ topic: topic || undefined, retryAttemptId: retry ? Number(retry) : undefined }),
      });
      rememberName(trimmed);
      setName(trimmed);
      setItems(data.questions);
      setAnswers(data.questions.map(() => ({})));
      setChecked(data.questions.map(() => false));
      setIndex(0);
      setStartedAt(Date.now());
      setNow(Date.now());
      setSettings(data.settings);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  /* ------------------------------------------------------------ setup --- */
  if (!running) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-okta-navy">{retry ? "Retake wrong answers" : "Take a practice test"}</h1>
          <p className="mt-1 text-sm text-muted">Enter your name so the result is saved to your history.</p>
        </div>
        <form onSubmit={start} className="card space-y-6 p-6">
          <div>
            <label htmlFor="name" className="label">Your name</label>
            <input
              id="name"
              className="input"
              placeholder="e.g. Marco"
              maxLength={100}
              value={name}
              autoFocus
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="rounded-lg bg-canvas p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-bold text-okta-navy">Test settings</span>
              <Link href="/settings" className="text-sm font-semibold text-okta-blue hover:underline">Change</Link>
            </div>
            {config ? <SettingsSummary settings={config.settings} topic={topic} retry={retry} /> : <p className="text-sm text-muted">Loading…</p>}
          </div>
          {error && <p className="rounded-lg bg-bad-bg px-4 py-3 text-sm text-bad">{error}</p>}
          <button type="submit" className="btn-primary w-full py-3 text-base" disabled={busy || !config}>
            {busy ? "Preparing…" : "Start test"}
          </button>
        </form>
      </div>
    );
  }

  /* ---------------------------------------------------------- running --- */
  const item = items[index];
  const answer = answers[index];
  const instant = settings.feedback === "instant";
  const isChecked = checked[index];
  const answeredCount = items.filter((it, i) => isAnswered(it.question, answers[i])).length;
  const allAnswered = answeredCount === items.length;
  const last = index === items.length - 1;
  const mustAnswer = (instant && !isChecked) || (!settings.allowBack && settings.requireAllAnswered);
  const canAdvance = !mustAnswer || (instant ? isChecked : isAnswered(item.question, answer));

  const setAnswer = (a: Answer) => setAnswers((prev) => prev.map((x, i) => (i === index ? a : x)));

  function finish() {
    if (settings!.requireAllAnswered && !allAnswered) {
      setError(`Answer all questions before submitting (${items.length - answeredCount} left).`);
      return;
    }
    const unanswered = items.length - answeredCount;
    if (unanswered && !confirm(`You have ${unanswered} unanswered question(s). Submit anyway?`)) return;
    submit();
  }

  return (
    <div className="space-y-5">
      <div className="card sticky top-[4.5rem] z-20 flex flex-wrap items-center gap-4 px-5 py-3">
        <div className="min-w-40 flex-1">
          <div className="mb-1.5 flex justify-between text-xs font-semibold text-muted">
            <span>Question {index + 1} of {items.length}</span>
            <span>{answeredCount} answered</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-okta-sky">
            <div className="h-full rounded-full bg-okta-blue transition-all" style={{ width: `${((index + 1) / items.length) * 100}%` }} />
          </div>
        </div>
        <div className={`rounded-lg px-3 py-1.5 font-mono text-sm font-bold ${remaining !== null && remaining < 60 ? "bg-bad-bg text-bad" : "bg-okta-sky text-okta-navy"}`}>
          {remaining !== null ? `${formatDuration(remaining)} left` : formatDuration(elapsed)}
        </div>
      </div>

      <div className="card p-5 sm:p-7">
        <QuestionCard
          key={index}
          item={item}
          answer={answer}
          onChange={setAnswer}
          reveal={instant && isChecked}
          label={`Question ${index + 1}`}
        />
        {instant && isChecked && (
          <p className={`mt-4 text-sm font-bold ${isCorrect(item.question, answer) ? "text-good" : "text-bad"}`}>
            {isCorrect(item.question, answer) ? "Correct!" : "Incorrect — the correct answer is highlighted in green."}
          </p>
        )}
      </div>

      {error && <p className="rounded-lg bg-bad-bg px-4 py-3 text-sm text-bad">{error}</p>}

      <div className="flex flex-wrap items-center gap-3">
        {settings.allowBack && (
          <button className="btn-secondary" disabled={index === 0} onClick={() => setIndex(index - 1)}>
            ← Previous
          </button>
        )}
        <div className="ml-auto flex gap-3">
          {instant && !isChecked && (
            <button
              className="btn-secondary"
              disabled={!isAnswered(item.question, answer)}
              onClick={() => setChecked((c) => c.map((x, i) => (i === index ? true : x)))}
            >
              Check answer
            </button>
          )}
          {last ? (
            <button className="btn-primary" disabled={busy || !canAdvance} onClick={finish}>
              {busy ? "Submitting…" : "Submit test"}
            </button>
          ) : (
            <button className="btn-primary" disabled={!canAdvance} onClick={() => setIndex(index + 1)}>
              Next →
            </button>
          )}
        </div>
      </div>

      {settings.allowBack && (
        <div className="card p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">Jump to question</p>
          <div className="flex flex-wrap gap-2">
            {items.map((it, i) => {
              const done = isAnswered(it.question, answers[i]);
              return (
                <button
                  key={i}
                  onClick={() => setIndex(i)}
                  disabled={instant && !isChecked && i > index}
                  className={`h-9 w-9 rounded-lg border text-sm font-semibold transition-colors disabled:opacity-40 ${
                    i === index
                      ? "border-okta-blue bg-okta-blue text-white"
                      : done
                        ? "border-okta-sky-2 bg-okta-sky text-okta-blue"
                        : "border-line bg-white text-muted hover:border-okta-blue"
                  }`}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
          <button className="btn-ghost mt-3 px-0" disabled={busy} onClick={finish}>
            Finish and submit now
          </button>
        </div>
      )}
    </div>
  );
}
