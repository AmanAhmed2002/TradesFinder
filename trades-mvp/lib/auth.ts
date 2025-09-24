// lib/auth.ts  (FULL FILE — replace)
import crypto from "crypto";
import argon2 from "argon2";
import { cookies } from "next/headers";
import { one, db } from "./db";

const SESSION_COOKIE = "sid";
const SESSION_TTL_DAYS = 30;

function plusDays(days: number) {
  return new Date(Date.now() + days * 864e5).toISOString();
}

export async function hashPassword(plain: string) {
  return argon2.hash(plain, { type: argon2.argon2id });
}
export async function verifyPassword(hash: string, plain: string) {
  return argon2.verify(hash, plain);
}

export async function createUser(email: string, password: string) {
  const id = crypto.randomUUID();
  const pw = await hashPassword(password);
  await db.execute({
    sql: `INSERT INTO users (id,email,password_hash) VALUES (?,?,?)`,
    args: [id, email.toLowerCase(), pw],
  });
  return { id, email: email.toLowerCase() };
}

export async function getUserByEmail(email: string) {
  return one(`SELECT * FROM users WHERE email = ?`, [email.toLowerCase()]);
}

export async function createSession(user_id: string) {
  const id = crypto.randomUUID();
  const expires_at = plusDays(SESSION_TTL_DAYS);
  await db.execute({
    sql: `INSERT INTO sessions (id,user_id,expires_at) VALUES (?,?,?)`,
    args: [id, user_id, expires_at],
  });

  // Next.js 15: cookies() is async — await it before set/delete/get
  const store = await cookies();
  store.set(SESSION_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: new Date(expires_at),
    path: "/",
  });

  return id;
}

export async function getSession() {
  const store = await cookies();
  const sid = store.get(SESSION_COOKIE)?.value;
  if (!sid) return null;

  const s: any = await one(`SELECT * FROM sessions WHERE id = ?`, [sid]);
  if (!s) return null;

  if (new Date(s.expires_at).getTime() < Date.now()) {
    await db.execute({ sql: `DELETE FROM sessions WHERE id = ?`, args: [sid] });
    store.delete(SESSION_COOKIE);
    return null;
  }

  await db.execute({
    sql: `UPDATE sessions SET last_seen_at = datetime('now') WHERE id = ?`,
    args: [sid],
  });

  return s;
}

export async function requireUser() {
  const s = await getSession();
  if (!s) return null;
  const u = await one(`SELECT * FROM users WHERE id = ?`, [s.user_id]);
  return u as any;
}

export async function logoutAll(user_id: string) {
  await db.execute({ sql: `DELETE FROM sessions WHERE user_id = ?`, args: [user_id] });
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

