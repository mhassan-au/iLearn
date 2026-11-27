// Shared layout and responsive navigation.
import type { Metadata } from "next";
import Link from "next/link";
import "./styles.css";

export const metadata: Metadata = {
  title: { default: "SelfLearn", template: "%s | SelfLearn" },
  description: "Structured, self-paced learning.",
};

export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-AU">
      <body>
        <a className="skip" href="#main">Skip to content</a>
        <header className="site-header">
          <nav className="frame flex flex-wrap items-center justify-between gap-4" aria-label="Main navigation">
            <Link className="brand" href="/">SelfLearn</Link>
            <div className="flex flex-wrap gap-5">
              <Link href="/topics">Topics</Link>
              <Link href="/dashboard">My learning</Link>
              <Link href="/progress">My progress</Link>
            </div>
          </nav>
        </header>
        <main className="frame content" id="main" tabIndex={-1}>{children}</main>
      </body>
    </html>
  );
}
