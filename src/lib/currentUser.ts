import { cookies } from "next/headers";
import { verifySessionToken, SESSION_COOKIE } from "./session";

/** Reads and verifies the session cookie for the current request. Node-runtime only
 * (route handlers and Server Components), never called from Edge middleware. */
export function getCurrentUsername(): string | null {
  const token = cookies().get(SESSION_COOKIE)?.value;
  return verifySessionToken(token)?.username ?? null;
}
