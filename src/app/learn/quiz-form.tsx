"use client";

// Count questions answered, including questions with multiple selected options.
import { useState, type ReactNode } from "react";
import { ActionButton } from "../components/action-button";

export function QuizForm({ action, questionCount, children }: {
  action: (data: FormData) => Promise<void>; questionCount: number; children: ReactNode;
}) {
  const [answered, setAnswered] = useState(0);
  return <form action={action} className="space-y-5" onChange={(event) => {
    const names = [...new FormData(event.currentTarget).keys()].filter((name) => name.startsWith("answer:"));
    setAnswered(new Set(names).size);
  }}>
    <p className="text-sm" aria-live="polite">{answered} of {questionCount} answered</p>
    <progress className="learning-progress" value={answered} max={questionCount} aria-label="Quiz progress" />
    {children}
    <ActionButton pendingLabel="Submitting…">Submit quiz</ActionButton>
  </form>;
}
