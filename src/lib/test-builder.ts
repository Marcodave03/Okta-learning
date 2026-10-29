import { shuffle } from "./grading";
import type { Question, TestQuestion, TestSettings } from "./types";

/** Picks and orders questions for a new test according to the settings. */
export function buildTest(all: Question[], settings: TestSettings, onlyIds?: number[]): TestQuestion[] {
  let pool = onlyIds?.length
    ? all.filter((q) => onlyIds.includes(q.id))
    : all.filter((q) => settings.topics.length === 0 || settings.topics.includes(q.topic));

  if (settings.shuffleQuestions) pool = shuffle(pool);
  if (settings.questionCount > 0 && !onlyIds?.length) pool = pool.slice(0, settings.questionCount);

  return pool.map((question) => {
    const n = question.type === "matching" ? question.pairs!.length : question.options!.length;
    const indices = [...Array(n).keys()];
    const rights = [...new Set((question.pairs ?? []).map((p) => p.right))];
    return {
      question,
      order: settings.shuffleOptions ? shuffle(indices) : indices,
      // Never list match choices in answer order, or the answers are given away.
      rightChoices: settings.shuffleOptions ? shuffle(rights) : rights.sort((a, b) => a.localeCompare(b)),
    };
  });
}
