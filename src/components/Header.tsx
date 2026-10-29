"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/learn", label: "Learn" },
  { href: "/test", label: "Take a Test" },
  { href: "/history", label: "History" },
  { href: "/settings", label: "Settings" },
];

export function Logo() {
  return (
    <span className="flex items-center gap-2.5">
      <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden>
        <circle cx="14" cy="14" r="10.5" fill="none" stroke="currentColor" strokeWidth="5" />
      </svg>
      <span className="text-lg font-bold tracking-tight">
        okta <span className="font-medium text-okta-blue">cert prep</span>
      </span>
    </span>
  );
}

export default function Header() {
  return <HeaderView pathname={usePathname()} />;
}

/** Also rendered without a pathname as the Suspense fallback while the route resolves. */
export function HeaderView({ pathname }: { pathname: string }) {
  const [open, setOpen] = useState(false);
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="text-okta-navy" onClick={() => setOpen(false)}>
          <Logo />
        </Link>
        <nav className="hidden gap-1 md:flex">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                isActive(n.href) ? "bg-okta-sky text-okta-blue" : "text-muted hover:text-okta-blue"
              }`}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <button
          className="btn-ghost md:hidden"
          aria-label="Toggle menu"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
            <rect y="3" width="20" height="2" rx="1" />
            <rect y="9" width="20" height="2" rx="1" />
            <rect y="15" width="20" height="2" rx="1" />
          </svg>
        </button>
      </div>
      {open && (
        <nav className="border-t border-line bg-white px-4 py-2 md:hidden">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              onClick={() => setOpen(false)}
              className={`block rounded-lg px-3 py-2.5 text-sm font-semibold ${
                isActive(n.href) ? "bg-okta-sky text-okta-blue" : "text-muted"
              }`}
            >
              {n.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
