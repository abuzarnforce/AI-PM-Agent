import { redirect } from "next/navigation";
import { getCurrentUsername } from "@/lib/currentUser";

/** Gates every screen under the main app behind a signed-in session. Runs as a
 * Node-runtime Server Component (not Edge middleware), so it can use the same
 * Node crypto-backed session verification as the auth API routes. */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  const username = getCurrentUsername();
  if (!username) redirect("/login");
  return <>{children}</>;
}
