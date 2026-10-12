import crypto from "crypto";
import { MAIN_WORKSPACE, readJson, writeJson } from "./kvStore";

export type Role = "admin" | "member";

/** Accounts are keyed by email — there are no passwords. Sign-in is a one-time code sent to
 * the email (or Google / Microsoft), so owning the inbox is the credential.
 * Anyone can sign up. Each account belongs to exactly one workspace, and all data is scoped
 * to it (see kvStore), so a new sign-up never sees another company's integrations or data. */
export interface Account {
  email: string;
  /** Missing on accounts created before workspaces existed — those are all MAIN_WORKSPACE. */
  workspace?: string;
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

/** ADMIN_EMAILS are admins of the main workspace. Emails on ALLOWED_EMAIL_DOMAINS (e.g.
 * "nforceone.com") join the main workspace as members. Everyone else gets their own new,
 * empty workspace — unless an admin invited them into theirs. */
export const adminEmails = () => list(process.env.ADMIN_EMAILS);
export const mainDomains = () => list(process.env.ALLOWED_EMAIL_DOMAINS);

export const workspaceOf = (a: Account) => a.workspace ?? MAIN_WORKSPACE;

export function normalizeEmail(email: unknown): string | null {
  if (typeof email !== "string") return null;
  const e = email.trim().toLowerCase();
  return e.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? e : null;
}

async function load(): Promise<Account[]> {
  const accounts = await readJson<Account[]>(KEY);
  return Array.isArray(accounts) ? accounts : [];
}

export async function listAccounts(workspace: string): Promise<Account[]> {
  return (await load()).filter((a) => workspaceOf(a) === workspace);
}

export async function getAccount(email: string): Promise<Account | undefined> {
  return (await load()).find((a) => a.email === email);
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
    const main = adminEmails().includes(email) || mainDomains().includes(email.split("@")[1]);
    account = main
      ? { email, workspace: MAIN_WORKSPACE, name: "", role: "member", status: "active", createdAt: now }
      : { email, workspace: crypto.randomBytes(12).toString("hex"), name: "", role: "admin", status: "active", createdAt: now };
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

const lastAdmin = (accounts: Account[], a: Account) =>
  a.role === "admin" && accounts.filter((x) => x.role === "admin" && workspaceOf(x) === workspaceOf(a)).length <= 1;

/** `workspace` limits the change to that workspace, so an admin can't touch other companies' people. */
export async function updateAccount(
  email: string,
  patch: Partial<Pick<Account, "name" | "role">>,
  workspace?: string
): Promise<Account> {
  const accounts = await load();
  const account = accounts.find((a) => a.email === email && (!workspace || workspaceOf(a) === workspace));
  if (!account) throw new Error("No such account.");
  if (patch.role && patch.role !== "admin" && account.role === "admin") {
    if (adminEmails().includes(email)) throw new Error("This admin is set by the ADMIN_EMAILS setting.");
    if (lastAdmin(accounts, account)) throw new Error("The workspace needs at least one admin.");
  }
  Object.assign(account, patch);
  await writeJson(KEY, accounts);
  return account;
}

export async function inviteAccount(email: string, role: Role, invitedBy: string, workspace: string): Promise<Account> {
  const accounts = await load();
  // ponytail: one workspace per email; supporting several needs a workspace switcher.
  if (accounts.some((a) => a.email === email)) throw new Error(`${email} already has a PM Agent account.`);
  const account: Account = { email, workspace, name: "", role, status: "invited", invitedBy, createdAt: new Date().toISOString() };
  accounts.push(account);
  await writeJson(KEY, accounts);
  return account;
}

export async function removeAccount(email: string, workspace: string): Promise<void> {
  const accounts = await load();
  const account = accounts.find((a) => a.email === email && workspaceOf(a) === workspace);
  if (!account) throw new Error("No such account.");
  if (adminEmails().includes(email)) throw new Error("This admin is set by the ADMIN_EMAILS setting.");
  if (lastAdmin(accounts, account)) throw new Error("The workspace needs at least one admin.");
  await writeJson(KEY, accounts.filter((a) => a.email !== email));
}
