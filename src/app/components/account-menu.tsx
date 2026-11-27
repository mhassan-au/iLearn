"use client";

// Provide account access and logout from anywhere in the signed-in shell.
import { useRef } from "react";
import Link from "next/link";
import { signOut } from "../sign-in/actions";
import { ActionButton } from "./action-button";

export function AccountMenu({ initial }: { initial: string }) {
  const menu = useRef<HTMLDetailsElement>(null);
  return <details className="account-menu" ref={menu} onKeyDown={(event) => {
    if (event.key === "Escape" && menu.current?.open) {
      menu.current.open = false;
      menu.current.querySelector("summary")?.focus();
    }
  }}>
    <summary className="account-trigger"><span className="account-avatar" aria-hidden="true">{initial}</span> My account</summary>
    <div className="account-popover">
      <Link href="/account" onClick={() => { if (menu.current) menu.current.open = false; }}>Account settings</Link>
      <form action={signOut}><ActionButton className="menu-button" pendingLabel="Signing out…">Sign out</ActionButton></form>
    </div>
  </details>;
}
