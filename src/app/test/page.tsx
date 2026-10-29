import type { Metadata } from "next";
import { Suspense } from "react";
import TestRunner from "./TestRunner";

export const metadata: Metadata = { title: "Take a Test" };

export default function TestPage({ searchParams }: PageProps<"/test">) {
  return (
    <Suspense fallback={<p className="text-muted">Loading…</p>}>
      <TestRunner searchParams={searchParams} />
    </Suspense>
  );
}
