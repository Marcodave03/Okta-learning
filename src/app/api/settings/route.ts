import { connection } from "next/server";
import { handle } from "@/lib/api";
import { topicsOf } from "@/lib/grading";
import { sanitizeSettings } from "@/lib/settings";
import { getStore } from "@/lib/store";

export async function GET() {
  await connection();
  return handle(async () => {
    const store = getStore();
    const [settings, questions] = await Promise.all([store.getSettings(), store.getQuestions()]);
    return Response.json({ settings, topics: topicsOf(questions), storage: store.kind });
  });
}

export async function PUT(request: Request) {
  return handle(async () => {
    const settings = await getStore().saveSettings(sanitizeSettings(await request.json()));
    return Response.json({ settings });
  });
}
