import crypto from "crypto";
import { readJson, writeJson } from "./kvStore";

export interface StoredUser {
  username: string;
  salt: string;
  passwordHash: string;
  createdAt: string;
}

const USERS_KEY = "users";

const DEFAULT_ADMIN_USERNAME = "admin";
const DEFAULT_ADMIN_PASSWORD = "ChangeMe123!";

function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString("hex");
}

/** Seeds a default admin account on first run so the app is usable out of the box.
 * The default password is intentionally documented (not secret) — the PM is expected
 * to change it immediately from the Account panel. */
async function seedIfEmpty(): Promise<StoredUser[]> {
  const salt = crypto.randomBytes(16).toString("hex");
  const seeded: StoredUser[] = [
    {
      username: DEFAULT_ADMIN_USERNAME,
      salt,
      passwordHash: hashPassword(DEFAULT_ADMIN_PASSWORD, salt),
      createdAt: new Date().toISOString(),
    },
  ];
  await writeJson(USERS_KEY, seeded);
  return seeded;
}

async function loadUsers(): Promise<StoredUser[]> {
  const users = await readJson<StoredUser[]>(USERS_KEY);
  if (!Array.isArray(users) || users.length === 0) return seedIfEmpty();
  return users;
}

async function saveUsers(users: StoredUser[]): Promise<void> {
  await writeJson(USERS_KEY, users);
}

export async function listUsernames(): Promise<string[]> {
  return (await loadUsers()).map((u) => u.username);
}

export async function findUser(username: string): Promise<StoredUser | undefined> {
  return (await loadUsers()).find((u) => u.username.toLowerCase() === username.toLowerCase());
}

export async function verifyPassword(username: string, password: string): Promise<boolean> {
  const user = await findUser(username);
  if (!user) return false;
  const candidate = hashPassword(password, user.salt);
  const a = Buffer.from(candidate, "hex");
  const b = Buffer.from(user.passwordHash, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function createUser(username: string, password: string): Promise<void> {
  const users = await loadUsers();
  if (users.some((u) => u.username.toLowerCase() === username.toLowerCase())) {
    throw new Error(`A user named "${username}" already exists.`);
  }
  const salt = crypto.randomBytes(16).toString("hex");
  users.push({
    username,
    salt,
    passwordHash: hashPassword(password, salt),
    createdAt: new Date().toISOString(),
  });
  await saveUsers(users);
}

export async function changePassword(username: string, newPassword: string): Promise<void> {
  const users = await loadUsers();
  const user = users.find((u) => u.username.toLowerCase() === username.toLowerCase());
  if (!user) throw new Error("User not found.");
  const salt = crypto.randomBytes(16).toString("hex");
  user.salt = salt;
  user.passwordHash = hashPassword(newPassword, salt);
  await saveUsers(users);
}
