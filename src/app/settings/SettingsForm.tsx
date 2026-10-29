"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { DEFAULT_SETTINGS } from "@/lib/settings";
import type { TestSettings } from "@/lib/types";

interface SettingsResponse {
  settings: TestSettings;
  topics: { topic: string; count: number }[];
  storage: "mysql" | "local";
}

function Toggle({ label, help, checked, onChange }: { label: string; help: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 py-4">
      <span>
        <span className="block text-sm font-semibold text-ink">{label}</span>
        <span className="mt-0.5 block text-sm text-muted">{help}</span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? "bg-okta-blue" : "bg-line"}`}
      >
        <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-5" : ""}`} />
      </button>
    </label>
  );
}

export default function SettingsForm() {
  const [data, setData] = useState<SettingsResponse | null>(null);
  const [s, setS] = useState<TestSettings>(DEFAULT_SETTINGS);
  const [status, setStatus] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api<SettingsResponse>("/api/settings")
      .then((d) => {
        setData(d);
        setS(d.settings);
      })
      .catch((e: Error) => setStatus({ kind: "error", text: e.message }));
  }, []);

  const set = <K extends keyof TestSettings>(key: K, value: TestSettings[K]) => {
    setS((prev) => ({ ...prev, [key]: value }));
    setStatus(null);
  };

  const available = data
    ? data.topics.filter((t) => s.topics.length === 0 || s.topics.includes(t.topic)).reduce((n, t) => n + t.count, 0)
    : 0;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api<{ settings: TestSettings }>("/api/settings", { method: "PUT", body: JSON.stringify(s) });
      setS(res.settings);
      setStatus({ kind: "ok", text: "Settings saved. They apply to the next test you start." });
    } catch (err) {
      setStatus({ kind: "error", text: (err as Error).message });
    } finally {
      setSaving(false);
    }
  }

  async function syncQuestions() {
    if (!confirm("Reload the question bank in the database from data/questions.json?")) return;
    try {
      const { count } = await api<{ count: number }>("/api/questions/sync", { method: "POST" });
      setStatus({ kind: "ok", text: `Question bank reloaded: ${count} questions.` });
    } catch (err) {
      setStatus({ kind: "error", text: (err as Error).message });
    }
  }

  const toggleTopic = (topic: string) => {
    const all = data!.topics.map((t) => t.topic);
    const current = s.topics.length ? s.topics : all;
    const next = current.includes(topic) ? current.filter((t) => t !== topic) : [...current, topic];
    set("topics", next.length === all.length ? [] : next);
  };

  if (!data && !status) return <p className="text-muted">Loading settings…</p>;

  return (
    <form onSubmit={save} className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-okta-navy">Test settings</h1>
        <p className="mt-1 text-sm text-muted">Configure how practice tests run.</p>
      </div>

      {data && (
        <>
          <section className="card space-y-5 p-6">
            <h2 className="text-base font-bold text-okta-navy">Questions</h2>
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="count">Number of questions</label>
                <input
                  id="count"
                  type="number"
                  min={0}
                  className="input"
                  value={s.questionCount}
                  onChange={(e) => set("questionCount", Number(e.target.value))}
                />
                <p className="mt-1 text-xs text-muted">0 = all {available} questions in the selected topics.</p>
              </div>
              <div>
                <label className="label" htmlFor="pass">Pass mark (%)</label>
                <input
                  id="pass"
                  type="number"
                  min={0}
                  max={100}
                  className="input"
                  value={s.passingScore}
                  onChange={(e) => set("passingScore", Number(e.target.value))}
                />
              </div>
            </div>
            <div>
              <span className="label">Topics</span>
              <div className="flex flex-wrap gap-2">
                {data.topics.map((t) => {
                  const on = s.topics.length === 0 || s.topics.includes(t.topic);
                  return (
                    <button
                      key={t.topic}
                      type="button"
                      onClick={() => toggleTopic(t.topic)}
                      className={`chip ${on ? "border-okta-blue bg-okta-sky text-okta-blue" : "border-line bg-white text-muted"}`}
                    >
                      {on ? "✓ " : ""}{t.topic} · {t.count}
                    </button>
                  );
                })}
              </div>
              <p className="mt-1.5 text-xs text-muted">
                {s.topics.length === 0 ? "All topics are included." : `${s.topics.length} of ${data.topics.length} topics selected.`}
              </p>
            </div>
          </section>

          <section className="card p-6">
            <h2 className="text-base font-bold text-okta-navy">Randomization</h2>
            <div className="divide-y divide-line">
              <Toggle label="Shuffle questions" help="Pick questions in a random order each test." checked={s.shuffleQuestions} onChange={(v) => set("shuffleQuestions", v)} />
              <Toggle label="Shuffle answer choices" help="Show the options of each question in a random order." checked={s.shuffleOptions} onChange={(v) => set("shuffleOptions", v)} />
            </div>
          </section>

          <section className="card space-y-5 p-6">
            <h2 className="text-base font-bold text-okta-navy">Test behavior</h2>
            <div>
              <label className="label" htmlFor="time">Time limit (minutes)</label>
              <input
                id="time"
                type="number"
                min={0}
                className="input sm:max-w-40"
                value={s.timeLimitMinutes}
                onChange={(e) => set("timeLimitMinutes", Number(e.target.value))}
              />
              <p className="mt-1 text-xs text-muted">0 = no time limit. The test is submitted automatically when time runs out.</p>
            </div>
            <div>
              <span className="label">Show correct answers</span>
              <div className="grid gap-2 sm:grid-cols-2">
                {([
                  ["end", "At the end", "Exam mode: results after you submit."],
                  ["instant", "After each question", "Practice mode: check each answer as you go."],
                ] as const).map(([value, title, help]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => set("feedback", value)}
                    className={`rounded-lg border p-3 text-left ${s.feedback === value ? "border-okta-blue bg-okta-sky" : "border-line bg-white"}`}
                  >
                    <span className="block text-sm font-semibold text-ink">{title}</span>
                    <span className="block text-xs text-muted">{help}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="divide-y divide-line border-t border-line">
              <Toggle label="Allow going back" help="Move to previous questions and jump between questions." checked={s.allowBack} onChange={(v) => set("allowBack", v)} />
              <Toggle label="Require every question to be answered" help="The test can only be submitted when all questions have an answer." checked={s.requireAllAnswered} onChange={(v) => set("requireAllAnswered", v)} />
            </div>
          </section>
        </>
      )}

      {status && (
        <p className={`rounded-lg px-4 py-3 text-sm ${status.kind === "ok" ? "bg-good-bg text-good" : "bg-bad-bg text-bad"}`}>{status.text}</p>
      )}

      {data && (
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" className="btn-primary" disabled={saving}>{saving ? "Saving…" : "Save settings"}</button>
          <button type="button" className="btn-ghost" onClick={() => { setS(DEFAULT_SETTINGS); setStatus(null); }}>
            Reset to defaults
          </button>
        </div>
      )}

      {data && (
        <section className="card flex flex-wrap items-center gap-4 p-5 text-sm">
          <div className="flex-1">
            <p className="font-semibold text-ink">Storage: {data.storage === "mysql" ? "MySQL database" : "Local JSON files (data/)"}</p>
            <p className="text-muted">
              {data.storage === "mysql"
                ? "Questions were loaded from data/questions.json. Reload after editing that file."
                : "Set DATABASE_URL to store everything in MySQL."}
            </p>
          </div>
          {data.storage === "mysql" && (
            <button type="button" className="btn-secondary" onClick={syncQuestions}>Reload questions</button>
          )}
        </section>
      )}
    </form>
  );
}
