import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Suspense } from "react";
import Header, { HeaderView } from "@/components/Header";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Okta Cert Prep", template: "%s · Okta Cert Prep" },
  description: "Study and practice tests for the Okta certification exam.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <Suspense fallback={<HeaderView pathname="" />}>
          <Header />
        </Suspense>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">{children}</main>
        <footer className="border-t border-line bg-white">
          <div className="mx-auto max-w-5xl px-4 py-5 text-xs text-muted sm:px-6">
            Personal study project for the Okta certification exam. Not affiliated with or endorsed by Okta, Inc.
          </div>
        </footer>
      </body>
    </html>
  );
}
