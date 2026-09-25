"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ShieldCheck } from "lucide-react";
import IntelligenceLayer, { Logo } from "@/components/IntelligenceLayer";
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
          <div className="mt-12 max-w-xl opacity-90">
            <IntelligenceLayer />
          </div>
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
