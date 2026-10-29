import type { Answer, Question } from "./types";

export function isAnswered(q: Question, a: Answer | undefined): boolean {
  if (!a) return false;
  if (q.type === "matching") {
    return (q.pairs ?? []).every((_, i) => Boolean(a.matches?.[i]));
  }
  return (a.selected?.length ?? 0) > 0;
}

export function isCorrect(q: Question, a: Answer | undefined): boolean {
  if (!a) return false;
  if (q.type === "matching") {
    return (q.pairs ?? []).every((p, i) => a.matches?.[i] === p.right);
  }
  const selected = [...new Set(a.selected ?? [])].sort((x, y) => x - y);
  const correct = [...(q.correct ?? [])].sort((x, y) => x - y);
  return selected.length === correct.length && selected.every((v, i) => v === correct[i]);
}

/** The answer that is fully correct, used to reveal answers in study mode. */
export function correctAnswer(q: Question): Answer {
  return q.type === "matching"
    ? { matches: (q.pairs ?? []).map((p) => p.right) }
    : { selected: [...(q.correct ?? [])] };
}

export function shuffle<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function topicsOf(questions: Question[]): { topic: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const q of questions) counts.set(q.topic, (counts.get(q.topic) ?? 0) + 1);
  return [...counts].map(([topic, count]) => ({ topic, count }));
}
