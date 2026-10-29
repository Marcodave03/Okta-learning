import { connection } from "next/server";
import { badRequest, handle } from "@/lib/api";
import { isCorrect } from "@/lib/grading";
import { sanitizeSettings } from "@/lib/settings";
import { getStore } from "@/lib/store";
import type { Answer, AttemptItem } from "@/lib/types";

export async function GET() {
  await connection();
  return handle(async () => Response.json({ attempts: await getStore().listAttempts() }));
}

interface SubmitBody {
  name: string;
  durationSec: number;
  settings: unknown;
  items: { id: number; order: number[]; rightChoices: string[]; answer: Answer }[];
}

/** Grades a finished test on the server and stores it in the history. */
export async function POST(request: Request) {
  return handle(async () => {
    const body = (await request.json()) as SubmitBody;
    const name = String(body.name ?? "").trim().slice(0, 100);
    if (!name) return badRequest("Name is required.");
    if (!Array.isArray(body.items) || !body.items.length) return badRequest("No answers submitted.");

    const store = getStore();
    const byId = new Map((await store.getQuestions()).map((q) => [q.id, q]));
    const items: AttemptItem[] = [];
    for (const it of body.items) {
      const question = byId.get(Number(it.id));
      if (!question) return badRequest(`Unknown question ${it.id}.`);
      const answer: Answer = {
        selected: Array.isArray(it.answer?.selected) ? it.answer.selected.map(Number) : undefined,
        matches: Array.isArray(it.answer?.matches) ? it.answer.matches.map(String) : undefined,
      };
      items.push({
        question,
        order: Array.isArray(it.order) ? it.order.map(Number) : [],
        rightChoices: Array.isArray(it.rightChoices) ? it.rightChoices.map(String) : [],
        answer,
        isCorrect: isCorrect(question, answer),
      });
    }

    const settings = sanitizeSettings(body.settings);
    const score = items.filter((i) => i.isCorrect).length;
    const percent = Math.round((score / items.length) * 10000) / 100;
    const id = await store.createAttempt({
      name,
      score,
      total: items.length,
      percent,
      passed: percent >= settings.passingScore,
      durationSec: Math.max(0, Math.round(Number(body.durationSec) || 0)),
      settings,
      items,
    });
    return Response.json({ id });
  });
}
