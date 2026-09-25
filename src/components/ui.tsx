"use client";

import { useEffect, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, ArrowRight, Check, Loader2, ShieldCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useNav } from "@/lib/nav";

/* ---------------------------------------------------------------- Button */

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-accent text-white hover:bg-accent-hover",
  secondary: "border border-border bg-panel text-fg hover:bg-fg/[0.04]",
  ghost: "text-muted hover:bg-fg/[0.05] hover:text-fg",
  danger: "border border-red-500/30 text-red-400 hover:bg-red-500/10",
};

export function Button({
  variant = "secondary",
  size = "md",
  icon: Icon,
  loading,
  children,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: "sm" | "md";
  icon?: LucideIcon;
  loading?: boolean;
}) {
  const sizing = size === "sm" ? "h-8 px-2.5 text-[13px] gap-1.5" : "h-9 px-3.5 text-sm gap-2";
  return (
    <button
      {...props}
      disabled={props.disabled || loading}
      className={`btn inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-md font-medium disabled:opacity-50 ${sizing} ${BUTTON_VARIANTS[variant]} ${className}`}
    >
      {loading ? <Loader2 size={14} className="animate-spin" /> : Icon && <Icon size={14} strokeWidth={2.2} />}
      {children}
    </button>
  );
}

/* ----------------------------------------------------------------- Badge */

export type Tone = "neutral" | "green" | "amber" | "red" | "blue" | "violet";
const BADGE_TONES: Record<Tone, string> = {
  neutral: "bg-fg/[0.06] text-muted",
  green: "bg-emerald-500/10 text-emerald-400",
  amber: "bg-amber-500/10 text-amber-400",
  red: "bg-red-500/10 text-red-400",
  blue: "bg-sky-500/10 text-sky-400",
  violet: "bg-violet-500/10 text-violet-400",
};
const DOT_TONES: Record<Tone, string> = {
  neutral: "bg-subtle",
  green: "bg-emerald-400",
  amber: "bg-amber-400",
  red: "bg-red-400",
  blue: "bg-sky-400",
  violet: "bg-violet-400",
};

export function Badge({ tone = "neutral", dot, children }: { tone?: Tone; dot?: boolean; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 text-[11px] font-medium ${BADGE_TONES[tone]}`}>
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${DOT_TONES[tone]}`} />}
      {children}
    </span>
  );
}

export function StatusDot({ tone, label }: { tone: Tone; label?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted">
      <span className={`h-1.5 w-1.5 rounded-full ${DOT_TONES[tone]}`} aria-hidden />
      {label}
    </span>
  );
}

/* ------------------------------------------------------------ PageHeader */

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  children,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="mb-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          {eyebrow && <div className="eyebrow mb-3">{eyebrow}</div>}
          <h1 className="text-page-title">{title}</h1>
          {description && <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-muted">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children && <div className="mt-6">{children}</div>}
    </header>
  );
}

/* ------------------------------------------------------------------ Tabs */

export function Tabs<T extends string>({
  tabs,
  active,
  onChange,
  id,
}: {
  tabs: { id: T; label: string; disabled?: boolean; hint?: string }[];
  active: T;
  onChange: (t: T) => void;
  id: string;
}) {
  return (
    <div role="tablist" className="-mb-px flex gap-5 overflow-x-auto border-b border-border">
      {tabs.map((t) => {
        const isActive = t.id === active;
        return (
          <button
            key={t.id}
            role="tab"
            aria-selected={isActive}
            disabled={t.disabled}
            title={t.hint}
            onClick={() => onChange(t.id)}
            className={`relative shrink-0 pb-3 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
              isActive ? "text-fg" : "text-muted hover:text-fg"
            }`}
          >
            {t.label}
            {isActive && (
              <motion.span layoutId={`tab-underline-${id}`} className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-fg" />
            )}
          </button>
        );
      })}
    </div>
  );
}

/* --------------------------------------------------------------- Section */

export function Section({
  title,
  description,
  action,
  children,
  className = "",
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`mt-10 first:mt-0 ${className}`}>
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-section">{title}</h2>
          {description && <p className="mt-0.5 text-[13px] text-muted">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

/* ---------------------------------------------------------------- Metric */

export function Metric({
  label,
  value,
  caption,
  tone,
  source,
}: {
  label: string;
  value: ReactNode;
  caption?: ReactNode;
  tone?: Tone;
  source?: string;
}) {
  return (
    <div className="min-w-0">
      <div className="text-[13px] text-muted">{label}</div>
      <div className="tabular mt-1.5 text-[32px] font-semibold leading-none tracking-tight">{value}</div>
      {caption && (
        <div className="mt-2">{tone ? <StatusDot tone={tone} label={caption as string} /> : <span className="text-xs text-muted">{caption}</span>}</div>
      )}
      {source && <div className="mt-1.5 truncate text-[11px] text-subtle">{source}</div>}
    </div>
  );
}

/* ------------------------------------------------------------ EmptyState */

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  compact,
}: {
  icon?: LucideIcon;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={`flex flex-col items-center text-center ${compact ? "py-8" : "py-16"}`}>
      {Icon && (
        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-panel text-muted">
          <Icon size={18} />
        </div>
      )}
      <div className="text-[15px] font-medium">{title}</div>
      {description && <p className="mt-1 max-w-sm text-sm leading-relaxed text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/* -------------------------------------------------------------- Skeleton */

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden />;
}

/* --------------------------------------------------- Working (AI progress) */

/** Steps mirror the real backend stages for the call in flight; the timing
 * between them is estimated because each call is a single request. */
export function WorkingState({ steps, interval = 1600 }: { steps: string[]; interval?: number }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((n) => Math.min(n + 1, steps.length - 1)), interval);
    return () => clearInterval(t);
  }, [steps.length, interval]);
  return (
    <div role="status" aria-live="polite" className="space-y-2 py-1">
      {steps.slice(0, i + 1).map((s, idx) => (
        <motion.div
          key={s}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className={`flex items-center gap-2.5 text-sm ${idx === i ? "text-fg" : "text-muted"}`}
        >
          {idx === i ? (
            <Loader2 size={14} className="animate-spin text-accent" />
          ) : (
            <Check size={14} className="text-emerald-400" />
          )}
          {s}
        </motion.div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------ ErrorState */

function humanize(msg: string): { title: string; detail: string; reconnect: boolean } {
  if (/gemini is not configured/i.test(msg))
    return { title: "PM Agent's AI isn't connected yet.", detail: "Add a Gemini API key in Connections to enable answers and drafting.", reconnect: true };
  if (/jira and gemini must/i.test(msg))
    return { title: "Jira and Gemini both need to be connected.", detail: "Health checks read Jira and reason with Gemini.", reconnect: true };
  if (/jira is not configured/i.test(msg))
    return { title: "Jira isn't connected yet.", detail: "Connect your Jira site to start understanding your product.", reconnect: true };
  if (/github is not configured/i.test(msg))
    return { title: "GitHub isn't connected yet.", detail: "Add a repository and a read-only token in Connections.", reconnect: true };
  if (/\b(401|403)\b|unauthori[sz]ed|forbidden/i.test(msg))
    return { title: "We couldn't connect to Jira.", detail: "Your credentials may have expired or lack permission for this project.", reconnect: true };
  if (/\b429\b|quota|rate.?limit/i.test(msg))
    return { title: "The AI service is busy right now.", detail: "You've hit a rate limit. Wait a moment and try again.", reconnect: false };
  if (/jql|field .* does not exist|does not exist for the field/i.test(msg))
    return { title: "Jira didn't understand that search.", detail: "Try rephrasing, or name a project key or sprint explicitly.", reconnect: false };
  if (/fetch failed|network|ECONN|ENOTFOUND|timed? ?out/i.test(msg))
    return { title: "We couldn't reach the service.", detail: "Check your connection and try again.", reconnect: false };
  return { title: "Something went wrong.", detail: "PM Agent couldn't finish that request.", reconnect: false };
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const { navigate } = useNav();
  const h = humanize(message);
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      role="alert"
      className="flex gap-3 rounded-lg border border-red-500/20 bg-red-500/[0.05] p-4"
    >
      <AlertCircle size={16} className="mt-0.5 shrink-0 text-red-400" />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium">{h.title}</div>
        <div className="mt-0.5 text-sm text-muted">{h.detail}</div>
        <details className="mt-2 text-xs text-subtle">
          <summary className="cursor-pointer select-none hover:text-muted">Details</summary>
          <div className="mt-1 break-words font-mono">{message}</div>
        </details>
        {(onRetry || h.reconnect) && (
          <div className="mt-3 flex gap-2">
            {h.reconnect && (
              <Button size="sm" variant="primary" onClick={() => navigate("connections")}>
                Open Connections
              </Button>
            )}
            {onRetry && (
              <Button size="sm" onClick={onRetry}>
                Try again
              </Button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

/* ---------------------------------------------------------- Source chips */

export function SourceChip({ label, kind, href }: { label: string; kind: string; href?: string | null }) {
  const inner = (
    <>
      <span className="text-subtle">{kind}</span>
      <span className="text-subtle">·</span>
      <span className={href ? "text-fg" : "text-muted"}>{label}</span>
    </>
  );
  const cls = "inline-flex items-center gap-1 rounded-md border border-border bg-panel px-2 py-1 text-xs";
  return href ? (
    <a href={href} target="_blank" rel="noreferrer" className={`${cls} transition-colors hover:border-accent/50`}>
      {inner}
    </a>
  ) : (
    <span className={cls}>{inner}</span>
  );
}

/* --------------------------------------------------- Responsible-AI notes */

export function HumanApprovalNote({ children = "Human approval required — nothing reaches Jira until you approve it in Drafts." }: { children?: ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-xs text-muted">
      <ShieldCheck size={13} className="shrink-0 text-emerald-400" />
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ Field */

export function Field({ label, hint, children, className = "" }: { label: string; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <label className={`block text-sm ${className}`}>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <span className="font-medium text-fg/80">{label}</span>
        {hint && <span className="text-xs text-subtle">{hint}</span>}
      </div>
      {children}
    </label>
  );
}

export const inputCls = "w-full px-3 py-2 text-sm";

/* ------------------------------------------------------------- Link row */

export function LinkRow({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className="group inline-flex items-center gap-1 text-sm font-medium text-accent hover:text-accent-hover">
      {children}
      <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
    </button>
  );
}

export function FadeIn({ children, delay = 0, className = "" }: { children: ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", bounce: 0, duration: 0.35, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export { AnimatePresence };

export function relativeTime(iso: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}
