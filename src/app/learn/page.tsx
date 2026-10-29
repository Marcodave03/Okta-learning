import type { Metadata } from "next";
import { Suspense } from "react";
import LearnClient from "./LearnClient";

export const metadata: Metadata = { title: "Learn" };

export default function LearnPage({ searchParams }: PageProps<"/learn">) {
  return (
    <Suspense fallback={<p className="text-muted">Loading questions…</p>}>
      <LearnClient searchParams={searchParams} />
    </Suspense>
  );
}
