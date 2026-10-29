import type { Metadata } from "next";
import { Suspense } from "react";
import AttemptDetail from "./AttemptDetail";

export const metadata: Metadata = { title: "Attempt" };

export default function AttemptPage({ params }: PageProps<"/history/[id]">) {
  return (
    <Suspense fallback={<p className="text-muted">Loading attempt…</p>}>
      <AttemptDetail params={params} />
    </Suspense>
  );
}
