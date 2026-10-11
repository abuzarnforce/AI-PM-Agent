import { readJson, writeJson } from "./kvStore";

export type Role = "admin" | "member";

/** Accounts are keyed by work email — there are no passwords. Sign-in is a one-time code
 * sent to the email, so owning the inbox is the credential (same model as Claude, Slack, Notion). */
export interface Account {
  email: string;
  name: string;
  role: Role;
  status: "invited" | "active";
  invitedBy?: string;
  createdAt: string;
  lastLoginAt?: string;
  /** SSO identities ("google:<sub>", "microsoft:<sub>") proven by an emailed code on first use. */
  identities?: string[];
}

const KEY = "accounts";

const list = (v: string | undefined) =>
  (v ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);

/** ADMIN_EMAILS bootstraps the first admins; ALLOWED_EMAIL_DOMAINS lets anyone at the
 * company (e.g. "nforceone.com") join as a member on first sign-in. Everyone else needs an invite. */
export const adminEmails = () => list(process.env.ADMIN_EMAILS);
export const allowedDomains = () => list(process.env.ALLOWED_EMAIL_DOMAINS);

export function normalizeEmail(email: unknown): string | null {
  if (typeof email !== "string") return null;
  const e = email.trim().toLowerCase();
  return e.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? e : null;
}

async function load(): Promise<Account[]> {
  const accounts = await readJson<Account[]>(KEY);
  return Array.isArray(accounts) ? accounts : [];
}

export async function listAccounts(): Promise<Account[]> {
  return load();
}

export async function getAccount(email: string): Promise<Account | undefined> {
  return (await load()).find((a) => a.email === email);
}

export async function canSignIn(email: string): Promise<boolean> {
  if (adminEmails().includes(email)) return true;
  if (allowedDomains().includes(email.split("@")[1])) return true;
  return !!(await getAccount(email));
}

/** Called only after the emailed code checks out. First sign-in (no account yet, or an
 * accepted invite) is reported so the UI can ask for a display name. */
export async function completeSignIn(
  email: string,
  sso?: { identity: string; name: string }
): Promise<{ account: Account; firstTime: boolean }> {
  const accounts = await load();
  const now = new Date().toISOString();
  let account = accounts.find((a) => a.email === email);
  const firstTime = !account || account.status === "invited";
  if (!account) {
    account = { email, name: "", role: "member", status: "active", createdAt: now };
    accounts.push(account);
  }
  account.status = "active";
  account.lastLoginAt = now;
  if (adminEmails().includes(email)) account.role = "admin";
  if (sso) {
    account.identities = Array.from(new Set([...(account.identities ?? []), sso.identity]));
    if (!account.name) account.name = sso.name;
  }
  await writeJson(KEY, accounts);
  return { account, firstTime };
}

/** True when this SSO identity already passed its first-time email check for this account. */
export async function hasIdentity(email: string, identity: string): Promise<boolean> {
  return !!(await getAccount(email))?.identities?.includes(identity);
}

export async function updateAccount(email: string, patch: Partial<Pick<Account, "name" | "role">>): Promise<Account> {
  const accounts = await load();
  const account = accounts.find((a) => a.email === email);
  if (!account) throw new Error("No such account.");
  if (patch.role && patch.role !== "admin" && account.role === "admin") {
    if (adminEmails().includes(email)) throw new Error("This admin is set by the ADMIN_EMAILS setting.");
    if (accounts.filter((a) => a.role === "admin").length <= 1) throw new Error("The workspace needs at least one admin.");
  }
  Object.assign(account, patch);
  await writeJson(KEY, accounts);
  return account;
}

export async function inviteAccount(email: string, role: Role, invitedBy: string): Promise<Account> {
  const accounts = await load();
  if (accounts.some((a) => a.email === email)) throw new Error(`${email} already has access.`);
  const account: Account = { email, name: "", role, status: "invited", invitedBy, createdAt: new Date().toISOString() };
  accounts.push(account);
  await writeJson(KEY, accounts);
  return account;
}

export async function removeAccount(email: string): Promise<void> {
  const accounts = await load();
  const account = accounts.find((a) => a.email === email);
  if (!account) return;
  if (adminEmails().includes(email)) throw new Error("This admin is set by the ADMIN_EMAILS setting.");
  if (account.role === "admin" && accounts.filter((a) => a.role === "admin").length <= 1) {
    throw new Error("The workspace needs at least one admin.");
  }
  await writeJson(KEY, accounts.filter((a) => a.email !== email));
}
