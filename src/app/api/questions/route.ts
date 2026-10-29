import { connection } from "next/server";
import { handle } from "@/lib/api";
import { getStore } from "@/lib/store";

export async function GET() {
  await connection();
  return handle(async () => Response.json({ questions: await getStore().getQuestions() }));
}
