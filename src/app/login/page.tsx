"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Sparkles, LogIn } from "lucide-react";

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
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <motion.form
        onSubmit={submit}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", bounce: 0, duration: 0.35 }}
        className="card-surface w-full max-w-sm rounded-2xl p-6"
      >
        <div className="mb-6 flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-accent to-violet-500 text-white shadow-lg shadow-accent/20">
            <Sparkles size={17} strokeWidth={2.25} />
          </div>
          <div>
            <div className="text-sm font-semibold tracking-tight">AI PM Agent</div>
            <div className="text-[11px] text-fg/40">Sign in to continue</div>
          </div>
        </div>

        <label className="mb-3 block text-sm">
          <div className="mb-1 text-fg/50">Username</div>
          <input
            autoFocus
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full rounded-md border border-fg/10 bg-panel px-3 py-2 outline-none transition-colors focus:border-accent"
          />
        </label>
        <label className="mb-4 block text-sm">
          <div className="mb-1 text-fg/50">Password</div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-fg/10 bg-panel px-3 py-2 outline-none transition-colors focus:border-accent"
          />
        </label>

        {error && (
          <div className="mb-4 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !username.trim() || !password}
          className="btn flex w-full items-center justify-center gap-1.5 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          <LogIn size={14} />
          {loading ? "Signing in…" : "Sign in"}
        </button>

        <p className="mt-4 text-center text-[11px] text-fg/30">
          First time here? Default login is <span className="text-fg/50">admin</span> /{" "}
          <span className="text-fg/50">ChangeMe123!</span> — change it right after signing in.
        </p>
      </motion.form>
    </div>
  );
}
