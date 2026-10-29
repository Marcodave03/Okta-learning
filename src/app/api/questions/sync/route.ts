import { handle } from "@/lib/api";
import { getStore } from "@/lib/store";

/** Re-loads the question bank in the database from data/questions.json. */
export async function POST() {
  return handle(async () => Response.json({ count: await getStore().syncQuestions() }));
}
