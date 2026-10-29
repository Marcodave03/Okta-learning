import { StorageError } from "./store";

/** Runs a route handler body and turns failures into JSON errors. */
export async function handle(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (err) {
    console.error(err);
    const message =
      err instanceof StorageError ? err.message : `Server error: ${(err as Error).message ?? "unknown"}`;
    return Response.json({ error: message }, { status: 500 });
  }
}

export const badRequest = (error: string) => Response.json({ error }, { status: 400 });
export const notFound = (error = "Not found") => Response.json({ error }, { status: 404 });

export function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}
