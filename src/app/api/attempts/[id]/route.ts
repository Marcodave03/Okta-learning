import { connection } from "next/server";
import { badRequest, handle, notFound, parseId } from "@/lib/api";
import { getStore } from "@/lib/store";

export async function GET(_request: Request, ctx: RouteContext<"/api/attempts/[id]">) {
  await connection();
  return handle(async () => {
    const id = parseId((await ctx.params).id);
    if (!id) return badRequest("Invalid id");
    const attempt = await getStore().getAttempt(id);
    return attempt ? Response.json({ attempt }) : notFound("Attempt not found");
  });
}

export async function DELETE(_request: Request, ctx: RouteContext<"/api/attempts/[id]">) {
  return handle(async () => {
    const id = parseId((await ctx.params).id);
    if (!id) return badRequest("Invalid id");
    await getStore().deleteAttempt(id);
    return Response.json({ ok: true });
  });
}
