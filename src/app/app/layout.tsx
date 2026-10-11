import { redirect } from "next/navigation";
import { getCurrentAccount } from "@/lib/currentUser";

/** Middleware already rejects missing/forged sessions; this also catches people who were
 * removed from the workspace after signing in. */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  if (!(await getCurrentAccount())) redirect("/login?next=/app");
  return <>{children}</>;
}
