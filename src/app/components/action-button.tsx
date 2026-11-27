"use client";

// Scope the pending indicator to the submitter that triggered the form action.
import type { ComponentPropsWithoutRef } from "react";
import { useFormStatus } from "react-dom";

export function ActionButton({ pendingLabel, children, className = "button", disabled, name, value, ...props }:
  ComponentPropsWithoutRef<"button"> & { pendingLabel: string }) {
  const { pending, data } = useFormStatus();
  const isSubmitter = pending && (!name || data?.get(name) === value);
  return <button {...props} type="submit" name={name} value={value} className={className}
    disabled={disabled || pending} aria-busy={isSubmitter}>
    {isSubmitter && <span className="button-spinner" aria-hidden="true" />}
    {isSubmitter ? pendingLabel : children}
  </button>;
}
