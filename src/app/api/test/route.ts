import { badRequest, handle, notFound } from "@/lib/api";
import { getStore } from "@/lib/store";
import { buildTest } from "@/lib/test-builder";

interface StartBody {
  /** Retake only the questions answered wrong in this attempt. */
  retryAttemptId?: number;
  /** Override the configured topics, e.g. "practice this topic" from the Learn page. */
  topic?: string;
}

export async function POST(request: Request) {
  return handle(async () => {
    const body = (await request.json().catch(() => ({}))) as StartBody;
    const store = getStore();
    const [settings, questions] = await Promise.all([store.getSettings(), store.getQuestions()]);

    let onlyIds: number[] | undefined;
    let name: string | undefined;
    if (body.retryAttemptId) {
      const attempt = await store.getAttempt(Number(body.retryAttemptId));
      if (!attempt) return notFound("Attempt not found");
      onlyIds = attempt.items.filter((i) => !i.isCorrect).map((i) => i.question.id);
      if (!onlyIds.length) return badRequest("That attempt has no wrong answers to retake.");
      name = attempt.name;
    }
    if (body.topic) settings.topics = [body.topic];

    const test = buildTest(questions, settings, onlyIds);
    if (!test.length) return badRequest("No questions match the current settings.");
    return Response.json({ settings, questions: test, name });
  });
}
