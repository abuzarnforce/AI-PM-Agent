import { cookies } from "next/headers";
import { verifyToken, SESSION_COOKIE, ELEVATED_COOKIE } from "./session";
import { getAccount, type Account } from "./authStore";

/** Signature-only check of the session cookie. Node-runtime only. */
export function getCurrentEmail(): string | null {
  return verifyToken(cookies().get(SESSION_COOKIE)?.value, "session")?.email ?? null;
}

/** Full check: valid cookie AND the account still exists — so removing someone from the
 * workspace signs them out on their next page load. */
export async function getCurrentAccount(): Promise<Account | null> {
  const email = getCurrentEmail();
  if (!email) return null;
  const account = await getAccount(email);
  return account?.status === "active" ? account : null;
}

/** True when the user re-confirmed with an emailed code in the last 15 minutes. */
export function isElevated(email: string): boolean {
  return verifyToken(cookies().get(ELEVATED_COOKIE)?.value, "elevated")?.email === email;
}

/** Guard for credential-bearing routes: admin role + a fresh emailed-code confirmation.
 * Returns an error message (and status) to send back, or null when allowed. */
export async function credentialAccessError(): Promise<{ error: string; status: number } | null> {
  const me = await getCurrentAccount();
  if (!me) return { error: "Not signed in.", status: 401 };
  if (me.role !== "admin") return { error: "Only workspace admins can view or change connections.", status: 403 };
  if (!isElevated(me.email)) return { error: "Confirm it's you to continue.", status: 401 };
  return null;
}
