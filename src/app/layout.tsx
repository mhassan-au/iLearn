// Shared layout and responsive navigation.
import type { Metadata } from "next";
import Link from "next/link";
import { requestClient } from "../lib/supabase";
import { AccountMenu } from "./components/account-menu";
import { ApplyTheme } from "./components/theme-preference";
import "./styles.css";

export const metadata: Metadata = {
  title: { default: "iLearn", template: "%s | iLearn" },
  description: "Structured, self-paced learning.",
};

export default async function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  const client = await requestClient();
  const session = await client?.auth.getClaims();
  const user = session?.data?.claims;
  return (
    <html lang="en-AU">
      <body>
        <ApplyTheme />
        <a className="skip" href="#main">Skip to content</a>
        <header className="site-header">
          <nav className="frame flex flex-wrap items-center justify-between gap-4" aria-label="Main navigation">
            <Link className="brand" href={user?.sub ? "/dashboard" : "/"}><span className="brand-mark" aria-hidden="true">i</span>iLearn</Link>
            {user?.sub ? <div className="nav-links">
              <Link href="/topics">Topics</Link>
              <Link href="/dashboard">My learning</Link>
              <Link href="/progress">My progress</Link>
              <AccountMenu initial={typeof user.email === "string" ? user.email.charAt(0).toUpperCase() : "L"} />
            </div> : <Link href="/sign-in">Sign in</Link>}
          </nav>
        </header>
        <main className="frame content" id="main" tabIndex={-1}>{children}</main>
      </body>
    </html>
  );
}
