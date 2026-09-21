"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { X, LogOut, KeyRound, UserPlus, Users } from "lucide-react";

export default function AccountModal({
  username,
  onClose,
}: {
  username: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [usernames, setUsernames] = useState<string[]>([]);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [pwMessage, setPwMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [pwBusy, setPwBusy] = useState(false);

  const [newUsername, setNewUsername] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [userMessage, setUserMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [userBusy, setUserBusy] = useState(false);

  useEffect(() => {
    fetch("/api/auth/users")
      .then((r) => r.json())
      .then((d) => setUsernames(d.usernames ?? []))
      .catch(() => {});
  }, []);

  async function changePassword() {
    setPwBusy(true);
    setPwMessage(null);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPwMessage({ type: "ok", text: "Password updated." });
      setCurrentPassword("");
      setNewPassword("");
    } catch (err: any) {
      setPwMessage({ type: "error", text: err.message ?? "Something went wrong" });
    } finally {
      setPwBusy(false);
    }
  }

  async function addUser() {
    setUserBusy(true);
    setUserMessage(null);
    try {
      const res = await fetch("/api/auth/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: newUsername, password: newUserPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUsernames((u) => [...u, data.username]);
      setUserMessage({ type: "ok", text: `Added "${data.username}".` });
      setNewUsername("");
      setNewUserPassword("");
    } catch (err: any) {
      setUserMessage({ type: "error", text: err.message ?? "Something went wrong" });
    } finally {
      setUserBusy(false);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 6, scale: 0.98 }}
          transition={{ type: "spring", bounce: 0, duration: 0.3 }}
          onClick={(e) => e.stopPropagation()}
          className="card-surface w-full max-w-md rounded-2xl bg-panel p-5"
        >
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-panel-title">Account</div>
              <div className="text-sm text-fg/50">Signed in as {username}</div>
            </div>
            <button onClick={onClose} className="btn rounded-md p-1.5 text-fg/40 hover:bg-fg/5 hover:text-fg/80">
              <X size={16} />
            </button>
          </div>

          <div className="mb-5">
            <div className="mb-2 flex items-center gap-1.5 text-sm font-medium text-fg/70">
              <KeyRound size={14} />
              Change password
            </div>
            <div className="space-y-2">
              <input
                type="password"
                placeholder="Current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full rounded-md border border-fg/10 bg-bg px-3 py-1.5 text-sm outline-none transition-colors focus:border-accent"
              />
              <input
                type="password"
                placeholder="New password (min 8 characters)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-md border border-fg/10 bg-bg px-3 py-1.5 text-sm outline-none transition-colors focus:border-accent"
              />
              <button
                onClick={changePassword}
                disabled={pwBusy || !currentPassword || newPassword.length < 8}
                className="btn w-full rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
              >
                {pwBusy ? "Updating…" : "Update password"}
              </button>
              {pwMessage && (
                <div className={`text-xs ${pwMessage.type === "ok" ? "text-emerald-300" : "text-red-300"}`}>
                  {pwMessage.text}
                </div>
              )}
            </div>
          </div>

          <div className="mb-5">
            <div className="mb-2 flex items-center gap-1.5 text-sm font-medium text-fg/70">
              <UserPlus size={14} />
              Add a teammate
            </div>
            <div className="space-y-2">
              <input
                placeholder="Username"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                className="w-full rounded-md border border-fg/10 bg-bg px-3 py-1.5 text-sm outline-none transition-colors focus:border-accent"
              />
              <input
                type="password"
                placeholder="Password (min 8 characters)"
                value={newUserPassword}
                onChange={(e) => setNewUserPassword(e.target.value)}
                className="w-full rounded-md border border-fg/10 bg-bg px-3 py-1.5 text-sm outline-none transition-colors focus:border-accent"
              />
              <button
                onClick={addUser}
                disabled={userBusy || !newUsername.trim() || newUserPassword.length < 8}
                className="btn w-full rounded-md border border-fg/10 px-3 py-1.5 text-sm font-medium hover:bg-fg/5 disabled:opacity-50"
              >
                {userBusy ? "Adding…" : "Add user"}
              </button>
              {userMessage && (
                <div className={`text-xs ${userMessage.type === "ok" ? "text-emerald-300" : "text-red-300"}`}>
                  {userMessage.text}
                </div>
              )}
            </div>
          </div>

          {usernames.length > 0 && (
            <div className="mb-5">
              <div className="mb-2 flex items-center gap-1.5 text-sm font-medium text-fg/70">
                <Users size={14} />
                People with access
              </div>
              <div className="flex flex-wrap gap-1.5">
                {usernames.map((u) => (
                  <span key={u} className="rounded bg-fg/5 px-2 py-0.5 text-xs text-fg/60">
                    {u}
                  </span>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={logout}
            className="btn flex w-full items-center justify-center gap-1.5 rounded-md border border-red-500/30 px-3 py-1.5 text-sm font-medium text-red-300 hover:bg-red-500/10"
          >
            <LogOut size={14} />
            Sign out
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
