import Link from "next/link";
import questions from "../../data/questions.json";
import { topicsOf } from "@/lib/grading";
import type { Question } from "@/lib/types";

const FEATURES = [
  {
    title: "Learn by topic",
    body: "Work through every question in the bank, try an answer, then reveal the correct one.",
    href: "/learn",
    cta: "Start learning",
  },
  {
    title: "Randomized tests",
    body: "Questions and answer choices are shuffled each time, with an optional timer and pass mark.",
    href: "/test",
    cta: "Take a test",
  },
  {
    title: "Review your mistakes",
    body: "Every attempt is saved with your name and score. Open one to see what you got wrong and retake it.",
    href: "/history",
    cta: "View history",
  },
];

export default function Home() {
  const topics = topicsOf(questions as Question[]);

  return (
    <div className="space-y-10">
      <section className="relative overflow-hidden rounded-2xl bg-okta-navy px-6 py-12 text-white sm:px-10 sm:py-16">
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full border-[48px] border-okta-blue/40" />
        <div className="relative max-w-2xl">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-okta-sky-2">Okta certification</p>
          <h1 className="text-3xl font-bold leading-tight sm:text-5xl">Practice until you pass.</h1>
          <p className="mt-4 text-base text-white/80 sm:text-lg">
            {questions.length} exam-style questions on users, groups, admin roles, authenticators and security
            policies, with randomized tests and a history of your scores.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/test" className="btn bg-white text-okta-navy hover:bg-okta-sky">
              Take a practice test
            </Link>
            <Link href="/learn" className="btn border border-white/40 text-white hover:bg-white/10">
              Browse questions
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {FEATURES.map((f) => (
          <Link key={f.href} href={f.href} className="card group p-6 transition hover:border-okta-blue">
            <h2 className="text-base font-bold text-okta-navy">{f.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">{f.body}</p>
            <span className="mt-4 inline-block text-sm font-semibold text-okta-blue group-hover:underline">
              {f.cta} →
            </span>
          </Link>
        ))}
      </section>

      <section>
        <h2 className="mb-4 text-xl font-bold text-okta-navy">Topics</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {topics.map((t) => (
            <Link
              key={t.topic}
              href={`/learn?topic=${encodeURIComponent(t.topic)}`}
              className="card flex items-center justify-between px-5 py-4 transition hover:border-okta-blue"
            >
              <span className="font-semibold text-ink">{t.topic}</span>
              <span className="chip border-okta-sky-2 bg-okta-sky text-okta-blue">{t.count}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
