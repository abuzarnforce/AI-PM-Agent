"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Mail, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/IntelligenceLayer";
import { Button, Field, codeInputCls, inputCls } from "@/components/ui";

type Step = "email" | "code" | "name";
export type ProviderId = "google" | "microsoft";

const ERRORS: Record<string, string> = {
  sso_failed: "We couldn't complete that sign-in. Please try again.",
  sso_cancelled: "Sign-in was cancelled.",
  sso_unavailable: "That sign-in option isn't set up for this workspace.",
  rate_limited: "Too many codes requested. Try again in a few minutes.",
  email_failed: "We couldn't send your verification email. Try again in a minute.",
};

async function post(url: string, body: object, method = "POST") {
  const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Something went wrong");
  return data;
}

/** Only same-site paths, so ?next= can't bounce people to another site after sign-in. */
const safeNext = (n: string | null) => (n && n.startsWith("/") && !n.startsWith("//") ? n : "/app");

export default function SignIn({ providers }: { providers: ProviderId[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const via = params.get("via"); // set when Google / Microsoft sent a first-time user here for an email code
  const [step, setStep] = useState<Step>(params.get("step") === "code" && params.get("email") ? "code" : "email");
  const [email, setEmail] = useState(params.get("email") ?? "");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(ERRORS[params.get("error") ?? ""] ?? null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(via ? 30 : 0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function run(fn: () => Promise<void>) {
    setLoading(true);
    setError(null);
    try {
      await fn();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const sendCode = () =>
    run(async () => {
      setNotice(null);
      await post("/api/auth/otp/request", { email });
      setStep("code");
      setCode("");
      setCooldown(30);
    });

  const verify = (value = code) =>
    run(async () => {
      const { firstTime } = await post("/api/auth/otp/verify", { email, code: value });
      if (firstTime) return setStep("name");
      router.replace(next);
      router.refresh();
    });

  const saveName = () =>
    run(async () => {
      await post("/api/auth/me", { name }, "PATCH");
      router.replace(next);
      router.refresh();
    });

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (step === "email") sendCode();
    else if (step === "code") verify();
    else saveName();
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-bg">
      <header className="flex items-center justify-between px-6 py-5">
        <Link href="/" className="flex items-center gap-2.5">
          <Logo />
          <span className="text-sm font-semibold tracking-tight">PM Agent</span>
        </Link>
        <Link href="/" className="text-sm text-muted hover:text-fg">
          Back to site
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 pb-16">
        <form onSubmit={onSubmit} className="w-full max-w-sm" aria-live="polite">
          <AnimatePresence mode="wait">
            <motion.div key={step} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}>
              {step === "email" && (
                <>
                  <h1 className="text-page-title">Sign in to PM Agent</h1>
                  <p className="mt-2 text-sm text-muted">New here? Signing in creates your own private workspace. No password to remember.</p>
                  {providers.length > 0 && (
                    <>
                      <div className="mt-8 space-y-2.5">
                        {providers.map((p) => (
                          <a
                            key={p}
                            href={`/api/auth/sso/${p}?next=${encodeURIComponent(next)}`}
                            className="btn flex h-10 w-full items-center justify-center gap-2.5 rounded-md border border-border bg-panel text-sm font-medium hover:bg-fg/[0.04]"
                          >
                            {p === "google" ? <GoogleMark /> : <MicrosoftMark />}
                            Continue with {p === "google" ? "Google" : "Microsoft"}
                          </a>
                        ))}
                      </div>
                      <div className="my-6 flex items-center gap-3 text-xs text-subtle">
                        <span className="h-px flex-1 bg-border" />
                        or
                        <span className="h-px flex-1 bg-border" />
                      </div>
                    </>
                  )}
                  <Field label="Email" className={providers.length ? "" : "mt-8"}>
                    <input
                      autoFocus
                      type="email"
                      autoComplete="email"
                      placeholder="you@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={inputCls}
                    />
                  </Field>
                  <Button type="submit" variant="primary" icon={Mail} loading={loading} disabled={!email.includes("@")} className="mt-5 h-10 w-full">
                    Continue with email
                  </Button>
                </>
              )}

              {step === "code" && (
                <>
                  <button type="button" onClick={() => setStep("email")} className="mb-6 flex items-center gap-1.5 text-sm text-muted hover:text-fg">
                    <ArrowLeft size={14} /> Use a different email
                  </button>
                  <h1 className="text-page-title">{via ? "One more step" : "Check your inbox"}</h1>
                  <p className="mt-2 text-sm text-muted">
                    {via ? (
                      <>
                        First time signing in with {via}? To confirm it's really you, we've sent a 6-digit code to{" "}
                        <span className="font-medium text-fg">{email}</span>. You'll only need to do this once.
                      </>
                    ) : (
                      <>
                        We've sent a 6-digit code to <span className="font-medium text-fg">{email}</span>. It expires in 10 minutes.
                      </>
                    )}
                  </p>
                  <Field label="Sign-in code" className="mt-8">
                    <input
                      autoFocus
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      placeholder="000000"
                      value={code}
                      onChange={(e) => {
                        const v = e.target.value.replace(/\D/g, "");
                        setCode(v);
                        if (v.length === 6) verify(v);
                      }}
                      className={`${inputCls} ${codeInputCls}`}
                    />
                  </Field>
                  <Button type="submit" variant="primary" loading={loading} disabled={code.length !== 6} className="mt-5 h-10 w-full">
                    Sign in
                  </Button>
                  <div className="mt-4 text-center text-sm text-muted">
                    Didn't get it? Check spam, or{" "}
                    <button type="button" disabled={cooldown > 0 || loading} onClick={() => { sendCode(); setNotice("New code sent."); }} className="font-medium text-accent disabled:text-subtle">
                      {cooldown > 0 ? `resend in ${cooldown}s` : "send a new code"}
                    </button>
                  </div>
                  {notice && !error && <div className="mt-2 text-center text-xs text-emerald-400">{notice}</div>}
                </>
              )}

              {step === "name" && (
                <>
                  <h1 className="text-page-title">Welcome aboard</h1>
                  <p className="mt-2 text-sm text-muted">Your email is verified. What should your teammates call you?</p>
                  <Field label="Your name" className="mt-8">
                    <input autoFocus autoComplete="name" maxLength={60} value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
                  </Field>
                  <Button type="submit" variant="primary" loading={loading} disabled={!name.trim()} className="mt-5 h-10 w-full">
                    Open my workspace
                  </Button>
                </>
              )}
            </motion.div>
          </AnimatePresence>

          {error && (
            <div role="alert" className="mt-4 rounded-md border border-red-500/25 bg-red-500/[0.06] px-3 py-2 text-sm text-red-400">
              {error}
            </div>
          )}

          <div className="mt-10 flex items-start gap-2 border-t border-border pt-5 text-xs leading-relaxed text-subtle">
            <ShieldCheck size={14} className="mt-px shrink-0" />
            <span>Every workspace is private: you only ever see your own team's integrations and data. We'll never ask for your code by phone or chat.</span>
          </div>
        </form>
      </main>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

function MicrosoftMark() {
  return (
    <svg width="15" height="15" viewBox="0 0 21 21" aria-hidden>
      <rect x="1" y="1" width="9" height="9" fill="#f25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
      <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
      <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
    </svg>
  );
}
