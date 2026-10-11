import { Suspense } from "react";
import { enabledProviders } from "@/lib/sso";
import SignIn from "./SignIn";

export const dynamic = "force-dynamic"; // provider buttons follow the current env vars

export default function LoginPage() {
  return (
    <Suspense>
      <SignIn providers={enabledProviders()} />
    </Suspense>
  );
}
