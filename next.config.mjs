import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

// Session signing key. On Vercel set SESSION_SECRET in project env vars. Locally, generate one
// into the gitignored .data/ folder so a fresh checkout works with zero setup and never shares a key.
if (!process.env.SESSION_SECRET) {
  if (process.env.VERCEL) throw new Error("Set SESSION_SECRET (32+ random characters) in Vercel env vars.");
  const file = path.join(process.cwd(), ".data", "session-secret.txt");
  if (!fs.existsSync(file)) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, crypto.randomBytes(32).toString("hex"));
  }
  process.env.SESSION_SECRET = fs.readFileSync(file, "utf8").trim();
}

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
