"use client";

import Image from "next/image";
import type { Answer, TestQuestion } from "@/lib/types";

interface Props {
  item: TestQuestion;
  answer: Answer;
  /** Omit to render read-only. */
  onChange?: (answer: Answer) => void;
  /** Mark correct and wrong choices and show the explanation. */
  reveal?: boolean;
  label?: string;
}

/** Renders `**bold**` lines as headings and `• item` lines as bullets. */
function ContextBlock({ lines }: { lines: string[] }) {
  return (
    <div className="space-y-2 text-[15px] leading-relaxed text-ink">
      {lines.map((line, i) => {
        const bold = /^\*\*(.*)\*\*$/.exec(line);
        if (bold) return <p key={i} className="font-bold text-okta-navy">{bold[1]}</p>;
        if (line.startsWith("• "))
          return (
            <p key={i} className="flex gap-2 pl-2">
              <span className="text-okta-blue">•</span>
              <span>{line.slice(2)}</span>
            </p>
          );
        return <p key={i}>{line}</p>;
      })}
    </div>
  );
}

function LogPanel({ lines }: { lines: string[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-line bg-canvas font-mono text-[13px]">
      <div className="border-b border-line bg-okta-sky px-4 py-2 font-sans text-xs font-bold uppercase tracking-wide text-okta-navy">
        System Log
      </div>
      <div className="space-y-1 px-4 py-3">
        {lines.map((line, i) => {
          const bold = /^\*\*(.*)\*\*$/.exec(line);
          return bold ? (
            <p key={i} className="pt-1 font-bold text-okta-navy">{bold[1]}</p>
          ) : (
            <p key={i} className="pl-4 text-ink">{line}</p>
          );
        })}
      </div>
    </div>
  );
}

export default function QuestionCard({ item, answer, onChange, reveal = false, label }: Props) {
  const { question: q, order, rightChoices } = item;
  const readOnly = !onChange || reveal;
  const multiple = q.type === "multiple";
  const hint =
    q.type === "matching"
      ? "Match each item"
      : multiple
        ? `Choose ${q.correct?.length ?? 2}`
        : "Choose one";

  const toggle = (idx: number) => {
    if (readOnly) return;
    const selected = answer.selected ?? [];
    onChange!({
      selected: multiple
        ? selected.includes(idx) ? selected.filter((s) => s !== idx) : [...selected, idx]
        : [idx],
    });
  };

  const setMatch = (pairIdx: number, value: string) => {
    if (readOnly) return;
    const matches = [...(answer.matches ?? q.pairs!.map(() => ""))];
    matches[pairIdx] = value;
    onChange!({ matches });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
        {label && <span className="text-muted">{label}</span>}
        <span className="chip border-okta-sky-2 bg-okta-sky text-okta-blue">{q.topic}</span>
        <span className="chip border-line text-muted">{hint}</span>
      </div>

      {q.context.length > 0 && <ContextBlock lines={q.context} />}
      {q.log.length > 0 && <LogPanel lines={q.log} />}
      {q.images.length > 0 && (
        <div className="grid gap-4">
          {q.images.map((src, i) => (
            <figure key={src} className="overflow-hidden rounded-lg border border-line bg-white">
              <a href={src} target="_blank" rel="noreferrer" title="Open full size">
                <Image src={src} alt={q.imageCaptions[i] ?? "Question screenshot"} width={1200} height={600} className="h-auto w-full" />
              </a>
              {q.imageCaptions[i] && (
                <figcaption className="border-t border-line bg-canvas px-3 py-2 text-xs font-semibold text-muted">
                  {q.imageCaptions[i]}
                </figcaption>
              )}
            </figure>
          ))}
        </div>
      )}

      <h2 className="text-lg font-semibold leading-snug text-okta-navy">{q.prompt}</h2>

      {q.type === "matching" ? (
        <div className="space-y-3">
          {order.map((pairIdx) => {
            const pair = q.pairs![pairIdx];
            const chosen = answer.matches?.[pairIdx] ?? "";
            const ok = chosen === pair.right;
            return (
              <div
                key={pairIdx}
                className={`rounded-lg border p-3 ${
                  reveal ? (ok ? "border-good bg-good-bg" : "border-bad bg-bad-bg") : "border-line bg-white"
                }`}
              >
                <p className="mb-2 text-sm font-semibold text-ink">{pair.left}</p>
                <select
                  className="input"
                  value={chosen}
                  disabled={readOnly}
                  onChange={(e) => setMatch(pairIdx, e.target.value)}
                >
                  <option value="">Select a match…</option>
                  {rightChoices.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
                {reveal && !ok && (
                  <p className="mt-2 text-sm text-good">
                    <span className="font-semibold">Correct match:</span> {pair.right}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-2.5" role={multiple ? "group" : "radiogroup"}>
          {order.map((idx, pos) => {
            const selected = answer.selected?.includes(idx) ?? false;
            const correct = q.correct!.includes(idx);
            let style = "border-line bg-white hover:border-okta-blue/60";
            if (selected) style = "border-okta-blue bg-okta-sky";
            if (reveal) {
              style = correct ? "border-good bg-good-bg" : selected ? "border-bad bg-bad-bg" : "border-line bg-white opacity-80";
            }
            return (
              <button
                key={idx}
                type="button"
                role={multiple ? "checkbox" : "radio"}
                aria-checked={selected}
                disabled={readOnly}
                onClick={() => toggle(idx)}
                className={`flex w-full items-start gap-3 rounded-lg border px-4 py-3 text-left text-[15px] transition-colors disabled:cursor-default ${style}`}
              >
                <span
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center border-2 text-[11px] font-bold ${
                    multiple ? "rounded" : "rounded-full"
                  } ${selected ? "border-okta-blue bg-okta-blue text-white" : "border-line bg-white text-muted"}`}
                >
                  {selected ? "✓" : String.fromCharCode(65 + pos)}
                </span>
                <span className="flex-1">{q.options![idx]}</span>
                {reveal && correct && <span className="shrink-0 text-xs font-bold text-good">Correct</span>}
                {reveal && selected && !correct && <span className="shrink-0 text-xs font-bold text-bad">Your answer</span>}
              </button>
            );
          })}
        </div>
      )}

      {reveal && (q.explanation || q.corrected) && (
        <div className="rounded-lg border border-okta-sky-2 bg-okta-sky px-4 py-3 text-sm text-okta-navy">
          {q.explanation && <p>{q.explanation}</p>}
          {q.corrected && (
            <p className="mt-1 text-xs text-muted">
              This answer was corrected from the one highlighted in the source document.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
