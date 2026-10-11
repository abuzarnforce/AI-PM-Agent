// Self-check for the SSO ID-token claim validation. Run: node scripts/check-sso.mjs
import assert from "node:assert/strict";
import { checkClaims } from "../src/lib/sso.ts";

const g = { clientId: "cid", issuer: "https://accounts.google.com" };
const ms = { clientId: "cid", issuer: "https://login.microsoftonline.com/tid/v2.0" };
const exp = Math.floor(Date.now() / 1000) + 300;
const good = { iss: g.issuer, aud: "cid", nonce: "n", exp, sub: "123", email: "A@Co.com", email_verified: true, name: "Ann" };

assert.deepEqual(checkClaims("google", g, good, "n"), { email: "a@co.com", subject: "google:123", name: "Ann" });
assert.ok(checkClaims("google", g, { ...good, iss: "accounts.google.com" }, "n"));
for (const bad of [
  { aud: "other" },
  { nonce: "x" },
  { exp: Math.floor(Date.now() / 1000) - 1 },
  { iss: "https://evil.example" },
  { email_verified: false },
  { email_verified: "true" },
  { sub: "" },
  { email: "not-an-email" },
]) assert.equal(checkClaims("google", g, { ...good, ...bad }, "n"), null, JSON.stringify(bad));

const msGood = { iss: ms.issuer, aud: "cid", nonce: "n", exp, sub: "s1", preferred_username: "b@co.com" };
assert.equal(checkClaims("microsoft", ms, msGood, "n")?.email, "b@co.com");
assert.equal(checkClaims("microsoft", ms, { ...msGood, iss: "https://login.microsoftonline.com/other-tenant/v2.0" }, "n"), null);
console.log("sso claim checks: ok");
