"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { X, LogOut, UserPlus, Users, UserRound } from "lucide-react";
import { Badge, Button, inputCls } from "./ui";

interface Me {
  name: string;
  email: string;
  role: "admin" | "member";
}
interface Person extends Me {
  status: "invited" | "active";
}

async function call(url: string, method: string, body?: object) {
  const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body && JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Something went wrong");
  return data;
}

export default function AccountModal({ onClose, onRenamed }: { onClose: () => void; onRenamed?: (name: string) => void }) {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [name, setName] = useState("");
  const [people, setPeople] = useState<Person[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"member" | "admin">("member");
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    call("/api/auth/me", "GET").then((d) => {
      setMe(d);
      setName(d.name);
    });
    call("/api/auth/users", "GET").then((d) => setPeople(d.accounts ?? [])).catch(() => {});
  }, []);

  async function act(key: string, fn: () => Promise<string | void>) {
    setBusy(key);
    setMessage(null);
    try {
      const ok = await fn();
      if (ok) setMessage({ type: "ok", text: ok });
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setBusy(null);
    }
  }

  const saveName = () =>
    act("name", async () => {
      const d = await call("/api/auth/me", "PATCH", { name });
      setMe(d);
      onRenamed?.(d.username);
      return "Name updated.";
    });

  const invite = () =>
    act("invite", async () => {
      const d = await call("/api/auth/users", "POST", { email: inviteEmail, role: inviteRole });
      setPeople((p) => [...p, d.account]);
      setInviteEmail("");
      return d.emailed ? `Invite emailed to ${d.account.email}.` : `${d.account.email} can now sign in (the invite email couldn't be sent).`;
    });

  const setRole = (email: string, role: Me["role"]) =>
    act(email, async () => {
      await call("/api/auth/users", "PATCH", { email, role });
      setPeople((p) => p.map((x) => (x.email === email ? { ...x, role } : x)));
    });

  const remove = (email: string) =>
    act(email, async () => {
      if (!confirm(`Remove ${email} from the workspace? They'll be signed out.`)) return;
      await call("/api/auth/users", "DELETE", { email });
      setPeople((p) => p.filter((x) => x.email !== email));
      return `Removed ${email}.`;
    });

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  const isAdmin = me?.role === "admin";

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          role="dialog"
          aria-label="Account"
          initial={{ opacity: 0, y: 10, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 6, scale: 0.98 }}
          transition={{ type: "spring", bounce: 0, duration: 0.3 }}
          onClick={(e) => e.stopPropagation()}
          className="card-surface max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-2xl bg-panel p-5"
        >
          <div className="mb-5 flex items-start justify-between">
            <div className="min-w-0">
              <div className="text-panel-title">Account</div>
              <div className="truncate text-sm text-muted">
                {me?.email} {me && <Badge tone={isAdmin ? "blue" : "neutral"}>{me.role}</Badge>}
              </div>
            </div>
            <button onClick={onClose} aria-label="Close" className="btn rounded-full p-1.5 text-fg/40 hover:bg-fg/5 hover:text-fg/80">
              <X size={16} />
            </button>
          </div>

          <section className="mb-6">
            <div className="mb-2 flex items-center gap-1.5 text-sm font-medium text-fg/70">
              <UserRound size={14} /> Display name
            </div>
            <div className="flex gap-2">
              <input aria-label="Display name" maxLength={60} value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
              <Button onClick={saveName} loading={busy === "name"} disabled={!name.trim() || name === me?.name}>
                Save
              </Button>
            </div>
            <p className="mt-2 text-xs text-subtle">You sign in with a one-time code sent to your email — there's no password to manage.</p>
          </section>

          {isAdmin && (
            <section className="mb-6">
              <div className="mb-2 flex items-center gap-1.5 text-sm font-medium text-fg/70">
                <UserPlus size={14} /> Invite a teammate
              </div>
              <div className="flex gap-2">
                <input
                  type="email"
                  aria-label="Teammate's email"
                  placeholder="teammate@company.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className={inputCls}
                />
                <select aria-label="Role" value={inviteRole} onChange={(e) => setInviteRole(e.target.value as Me["role"])} className="px-2 text-sm">
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <Button variant="primary" onClick={invite} loading={busy === "invite"} disabled={!inviteEmail.includes("@")} className="mt-2 w-full">
                Send invite
              </Button>
            </section>
          )}

          {message && <div className={`mb-4 text-xs ${message.type === "ok" ? "text-emerald-400" : "text-red-400"}`}>{message.text}</div>}

          {people.length > 0 && (
            <section className="mb-6">
              <div className="mb-2 flex items-center gap-1.5 text-sm font-medium text-fg/70">
                <Users size={14} /> People with access
              </div>
              <ul className="divide-y divide-border rounded-lg border border-border">
                {people.map((p) => (
                  <li key={p.email} className="flex items-center gap-2 px-3 py-2 text-sm">
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{p.name || p.email.split("@")[0]}</div>
                      <div className="truncate text-xs text-muted">{p.email}</div>
                    </div>
                    {p.status === "invited" && <Badge tone="amber">invited</Badge>}
                    {isAdmin && p.email !== me?.email ? (
                      <>
                        <select
                          aria-label={`Role for ${p.email}`}
                          value={p.role}
                          disabled={busy === p.email}
                          onChange={(e) => setRole(p.email, e.target.value as Me["role"])}
                          className="px-1.5 text-xs"
                        >
                          <option value="member">Member</option>
                          <option value="admin">Admin</option>
                        </select>
                        <button onClick={() => remove(p.email)} aria-label={`Remove ${p.email}`} className="btn rounded p-1 text-subtle hover:bg-red-500/10 hover:text-red-400">
                          <X size={14} />
                        </button>
                      </>
                    ) : (
                      <Badge tone={p.role === "admin" ? "blue" : "neutral"}>{p.role}</Badge>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <Button variant="danger" icon={LogOut} onClick={logout} className="w-full">
            Sign out
          </Button>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
