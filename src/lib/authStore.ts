import fs from "fs";
import path from "path";
import crypto from "crypto";

const DATA_DIR = path.join(process.cwd(), ".data");
const USERS_PATH = path.join(DATA_DIR, "users.json");

export interface StoredUser {
  username: string;
  salt: string;
  passwordHash: string;
  createdAt: string;
}

const DEFAULT_ADMIN_USERNAME = "admin";
const DEFAULT_ADMIN_PASSWORD = "ChangeMe123!";

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString("hex");
}

/** Seeds a default admin account on first run so the app is usable out of the box.
 * The default password is intentionally documented (not secret) — the PM is expected
 * to change it immediately from the Account panel. */
function seedIfEmpty(): StoredUser[] {
  const salt = crypto.randomBytes(16).toString("hex");
  const seeded: StoredUser[] = [
    {
      username: DEFAULT_ADMIN_USERNAME,
      salt,
      passwordHash: hashPassword(DEFAULT_ADMIN_PASSWORD, salt),
      createdAt: new Date().toISOString(),
    },
  ];
  ensureDataDir();
  fs.writeFileSync(USERS_PATH, JSON.stringify({ users: seeded }, null, 2));
  return seeded;
}

function loadUsers(): StoredUser[] {
  ensureDataDir();
  if (!fs.existsSync(USERS_PATH)) return seedIfEmpty();
  try {
    const data = JSON.parse(fs.readFileSync(USERS_PATH, "utf8"));
    const users = data.users as StoredUser[];
    if (!Array.isArray(users) || users.length === 0) return seedIfEmpty();
    return users;
  } catch {
    return seedIfEmpty();
  }
}

function saveUsers(users: StoredUser[]) {
  ensureDataDir();
  fs.writeFileSync(USERS_PATH, JSON.stringify({ users }, null, 2));
}

export function listUsernames(): string[] {
  return loadUsers().map((u) => u.username);
}

export function findUser(username: string): StoredUser | undefined {
  return loadUsers().find((u) => u.username.toLowerCase() === username.toLowerCase());
}

export function verifyPassword(username: string, password: string): boolean {
  const user = findUser(username);
  if (!user) return false;
  const candidate = hashPassword(password, user.salt);
  const a = Buffer.from(candidate, "hex");
  const b = Buffer.from(user.passwordHash, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function createUser(username: string, password: string): void {
  const users = loadUsers();
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
  saveUsers(users);
}

export function changePassword(username: string, newPassword: string): void {
  const users = loadUsers();
  const user = users.find((u) => u.username.toLowerCase() === username.toLowerCase());
  if (!user) throw new Error("User not found.");
  const salt = crypto.randomBytes(16).toString("hex");
  user.salt = salt;
  user.passwordHash = hashPassword(newPassword, salt);
  saveUsers(users);
}

export function isDefaultAdminPasswordStillSet(): boolean {
  return verifyPassword(DEFAULT_ADMIN_USERNAME, DEFAULT_ADMIN_PASSWORD);
}
