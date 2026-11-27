"use client";

// Read rendered lesson text and keep the speech queue scoped to this lesson.
import { useEffect, useRef, useState } from "react";

function speechChunks(text: string): string[] {
  const chunks: string[] = [];
  let current = "";
  for (const word of text.trim().split(/\s+/)) {
    if (current && current.length + word.length + 1 > 240) {
      chunks.push(current);
      current = "";
    }
    current += current ? ` ${word}` : word;
  }
  if (current) chunks.push(current);
  return chunks;
}

type Playback = "idle" | "playing" | "paused";

export function ListenToLesson({ contentId, title }: { contentId: string; title: string }) {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [playback, setPlayback] = useState<Playback>("idle");
  const [message, setMessage] = useState("");
  const active = useRef<SpeechSynthesisUtterance | null>(null);

  function cancelSpeech() {
    if (!active.current) return;
    active.current.onend = null;
    active.current.onerror = null;
    active.current = null;
    window.speechSynthesis.cancel();
  }

  useEffect(() => {
    setSupported("speechSynthesis" in window && "SpeechSynthesisUtterance" in window);
    return cancelSpeech;
  }, []);

  function start() {
    const content = document.getElementById(contentId)?.innerText.trim();
    if (!content) return;
    const chunks = speechChunks(`${title}. ${content}`);
    const synth = window.speechSynthesis;
    cancelSpeech();
    if (synth.paused) synth.resume();
    setPlayback("playing");
    setMessage("Reading lesson aloud.");

    function speak(index: number) {
      if (index >= chunks.length) {
        active.current = null;
        setPlayback("idle");
        setMessage("Finished reading.");
        return;
      }
      const utterance = new SpeechSynthesisUtterance(chunks[index]);
      utterance.lang = document.documentElement.lang || "en-AU";
      utterance.onend = () => speak(index + 1);
      utterance.onerror = () => {
        active.current = null;
        setPlayback("idle");
        setMessage("Audio couldn’t play. Try again or check your browser’s speech settings.");
      };
      active.current = utterance;
      synth.speak(utterance);
    }

    speak(0);
  }

  if (supported === null) return null;
  if (!supported) return <p className="text-sm">Read aloud isn’t available in this browser.</p>;

  return <section aria-label="Lesson audio" className="space-y-2">
    <div className="flex flex-wrap gap-2">
      {playback === "idle" ? (
        <button type="button" className="button button-secondary" onClick={start}>
          <span aria-hidden="true">🔊</span> Listen to lesson
        </button>
      ) : <>
        <button type="button" className="button button-secondary" onClick={() => {
          if (playback === "paused") {
            window.speechSynthesis.resume();
            setPlayback("playing");
            setMessage("Reading lesson aloud.");
          } else {
            window.speechSynthesis.pause();
            setPlayback("paused");
            setMessage("Reading paused.");
          }
        }}>{playback === "paused" ? "Resume" : "Pause"}</button>
        <button type="button" className="button button-secondary" onClick={() => {
          cancelSpeech();
          setPlayback("idle");
          setMessage("Reading stopped.");
        }}>Stop</button>
      </>}
    </div>
    <p role="status" className="text-sm">{message}</p>
  </section>;
}
