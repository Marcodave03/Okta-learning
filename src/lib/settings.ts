import type { TestSettings } from "./types";

export const DEFAULT_SETTINGS: TestSettings = {
  questionCount: 20,
  shuffleQuestions: true,
  shuffleOptions: true,
  topics: [],
  timeLimitMinutes: 30,
  passingScore: 70,
  feedback: "end",
  allowBack: true,
  requireAllAnswered: false,
};

const clampInt = (value: unknown, min: number, max: number, fallback: number) => {
  const n = Math.round(Number(value));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

const bool = (value: unknown, fallback: boolean) =>
  typeof value === "boolean" ? value : fallback;

/** Coerces untrusted input (request bodies, stored JSON) into valid settings. */
export function sanitizeSettings(input: unknown): TestSettings {
  const s = (input && typeof input === "object" ? input : {}) as Partial<Record<keyof TestSettings, unknown>>;
  const d = DEFAULT_SETTINGS;
  return {
    questionCount: clampInt(s.questionCount, 0, 1000, d.questionCount),
    shuffleQuestions: bool(s.shuffleQuestions, d.shuffleQuestions),
    shuffleOptions: bool(s.shuffleOptions, d.shuffleOptions),
    topics: Array.isArray(s.topics) ? s.topics.filter((t): t is string => typeof t === "string") : d.topics,
    timeLimitMinutes: clampInt(s.timeLimitMinutes, 0, 600, d.timeLimitMinutes),
    passingScore: clampInt(s.passingScore, 0, 100, d.passingScore),
    feedback: s.feedback === "instant" ? "instant" : "end",
    allowBack: bool(s.allowBack, d.allowBack),
    requireAllAnswered: bool(s.requireAllAnswered, d.requireAllAnswered),
  };
}
