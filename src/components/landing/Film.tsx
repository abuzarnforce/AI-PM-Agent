"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { Play, Volume2, VolumeX } from "lucide-react";

/** Chapter start times (seconds) in public/pm-agent-film.mp4 — from videos/pm-agent-launch-v3/index.html. */
export const CHAPTERS = [
  { id: "home", label: "Home", t: 15 },
  { id: "ask", label: "Ask anything", t: 20.4 },
  { id: "sprint", label: "Sprint health", t: 28.4 },
  { id: "release", label: "Release check", t: 34.7 },
  { id: "standup", label: "Standup", t: 41.6 },
  { id: "followups", label: "Follow-ups", t: 48.5 },
  { id: "connect", label: "Connections", t: 55.3 },
  { id: "keystroke", label: "⌘K", t: 59.5 },
  { id: "approve", label: "You decide", t: 63.3 },
  { id: "studio", label: "Studio", t: 70.1 },
] as const;

export type ChapterId = (typeof CHAPTERS)[number]["id"];
const SEEK_EVENT = "pm-film-seek";

export function Film() {
  const ref = useRef<HTMLVideoElement>(null);
  const reduceMotion = useReducedMotion();
  const [muted, setMuted] = useState(true);
  const [now, setNow] = useState(0);

  useEffect(() => {
    function onSeek(e: Event) {
      const v = ref.current;
      const ch = CHAPTERS.find((c) => c.id === (e as CustomEvent<ChapterId>).detail);
      if (!v || !ch) return;
      v.currentTime = ch.t;
      v.play().catch(() => {});
      v.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
    }
    window.addEventListener(SEEK_EVENT, onSeek);
    return () => window.removeEventListener(SEEK_EVENT, onSeek);
  }, [reduceMotion]);

  function toggleSound() {
    const v = ref.current;
    if (!v) return;
    v.muted = !muted;
    if (muted) {
      v.currentTime = 0; // with sound, start the story from the top
      v.play().catch(() => {});
    }
    setMuted(!muted);
  }

  const active = [...CHAPTERS].reverse().find((c) => now >= c.t)?.id;

  return (
    <div>
      <div className="relative overflow-hidden rounded-2xl border border-border bg-panel [box-shadow:var(--overlay-shadow)]">
        <video
          ref={ref}
          src="/pm-agent-film.mp4"
          poster="/pm-agent-film-poster.jpg"
          autoPlay={!reduceMotion}
          controls={!!reduceMotion}
          muted
          loop
          playsInline
          preload="metadata"
          aria-label="PM Agent product film"
          onTimeUpdate={(e) => setNow(e.currentTarget.currentTime)}
          className="block aspect-video w-full"
        />
        {!reduceMotion && (
          <button
            type="button"
            onClick={toggleSound}
            aria-label={muted ? "Play with sound" : "Mute"}
            className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5 text-xs font-medium text-white backdrop-blur hover:bg-black/75"
          >
            {muted ? <VolumeX size={13} /> : <Volume2 size={13} />}
            {muted ? "Watch with sound" : "Mute"}
          </button>
        )}
      </div>
      <div className="mt-4 flex flex-wrap justify-center gap-1.5" aria-label="Jump to a chapter">
        {CHAPTERS.map((c) => (
          <WatchButton key={c.id} chapter={c.id} variant="chip" active={active === c.id}>
            {c.label}
          </WatchButton>
        ))}
      </div>
    </div>
  );
}

export function WatchButton({
  chapter,
  children,
  variant = "link",
  active,
}: {
  chapter: ChapterId;
  children: React.ReactNode;
  variant?: "link" | "chip";
  active?: boolean;
}) {
  const seek = () => window.dispatchEvent(new CustomEvent(SEEK_EVENT, { detail: chapter }));
  if (variant === "chip") {
    return (
      <button
        type="button"
        onClick={seek}
        aria-pressed={active}
        className={`btn rounded-full border px-3 py-1 text-xs font-medium ${
          active ? "border-accent/40 bg-accent/10 text-accent" : "border-border text-muted hover:bg-fg/[0.04] hover:text-fg"
        }`}
      >
        {children}
      </button>
    );
  }
  return (
    <button type="button" onClick={seek} className="btn inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:text-accent-hover">
      <Play size={13} className="fill-current" />
      {children}
    </button>
  );
}
