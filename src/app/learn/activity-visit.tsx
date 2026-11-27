"use client";

// Record a visit once the activity is displayed in the browser rather than prefetched.
import { useEffect } from "react";
import { recordActivityVisit } from "./actions";

export function ActivityVisit({ chapter, activity }: { chapter: string; activity: string }) {
  useEffect(() => {
    void recordActivityVisit(chapter, activity).catch(() => {
      // A failed visit record should not interrupt reading.
    });
  }, [chapter, activity]);
  return null;
}
