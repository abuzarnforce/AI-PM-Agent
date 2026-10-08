"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { ShieldCheck, Volume2, VolumeX } from "lucide-react";
import { Logo } from "@/components/IntelligenceLayer";
import { Button, Field, inputCls } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.push("/");
      router.refresh();
    } catch (err: any) {
      setError(err.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-[100dvh] bg-bg lg:grid-cols-[1.15fr_1fr]">
      <section className="relative hidden flex-col justify-between overflow-hidden border-r border-border p-12 lg:flex">
        <div className="flex items-center gap-2.5">
          <Logo />
          <span className="text-sm font-semibold tracking-tight">PM Agent</span>
        </div>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <h1 className="text-display max-w-xl">Your product deserves an intelligent workspace.</h1>
          <p className="mt-5 max-w-md text-lg leading-relaxed text-muted">
            Connect product, engineering, QA and delivery. Understand anything. Stay in control of every change.
          </p>
          <ProductFilm />
        </motion.div>
        <div className="text-xs text-subtle">Connect everything. Understand anything. Move product forward.</div>
      </section>

      <section className="flex items-center justify-center px-6 py-12">
        <motion.form
          onSubmit={submit}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm"
          aria-labelledby="signin-title"
        >
          <div className="mb-10 flex items-center gap-2.5 lg:hidden">
            <Logo />
            <span className="text-sm font-semibold tracking-tight">PM Agent</span>
          </div>
          <h2 id="signin-title" className="text-page-title">
            Sign in
          </h2>
          <p className="mt-2 text-sm text-muted">Use the account your workspace admin created for you.</p>

          <div className="mt-8 space-y-4">
            <Field label="Username">
              <input autoFocus autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} className={inputCls} />
            </Field>
            <Field label="Password">
              <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} />
            </Field>
          </div>

          {error && (
            <div role="alert" className="mt-4 rounded-md border border-red-500/25 bg-red-500/[0.06] px-3 py-2 text-sm text-red-400">
              {/invalid|incorrect|wrong/i.test(error) ? "That username and password don't match." : error}
            </div>
          )}

          <Button type="submit" variant="primary" loading={loading} disabled={!username.trim() || !password} className="mt-6 h-10 w-full">
            Continue
          </Button>

          <div className="mt-8 flex items-center gap-2 text-xs text-subtle">
            <ShieldCheck size={13} />
            AI suggests. You approve. Nothing reaches Jira without you.
          </div>
        </motion.form>
      </section>
    </div>
  );
}

/** The launch film, framed as a floating product window. Muted autoplay loop; sound is opt-in. */
function ProductFilm() {
  const ref = useRef<HTMLVideoElement>(null);
  const reduceMotion = useReducedMotion();
  const [muted, setMuted] = useState(true);

  function toggleSound() {
    const v = ref.current;
    if (!v) return;
    v.muted = !muted;
    if (muted) {
      v.currentTime = 0; // with sound, start the story from the top
      v.play();
    }
    setMuted(!muted);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.15, duration: 0.6 }}
      className="group relative mt-12 max-w-2xl overflow-hidden rounded-2xl border border-border bg-panel [box-shadow:var(--overlay-shadow)]"
    >
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
        className="block aspect-video w-full"
      />
      {!reduceMotion && (
        <button
          type="button"
          onClick={toggleSound}
          aria-label={muted ? "Play with sound" : "Mute"}
          className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5 text-xs font-medium text-white backdrop-blur transition-opacity hover:bg-black/75 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
        >
          {muted ? <VolumeX size={13} /> : <Volume2 size={13} />}
          {muted ? "Watch with sound" : "Mute"}
        </button>
      )}
    </motion.div>
  );
}
