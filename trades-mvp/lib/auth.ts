// lib/auth.ts
import crypto from "crypto";
import argon2 from "argon2";
import { cookies } from "next/headers";
import { db, one } from "./db";

const SESSION_COOKIE = "sid";
const COOKIE_PATH = "/";

/** Password helpers */
export async function hashPassword(plain: string) {
  return argon2.hash(plain, { type: argon2.argon2id });
}
export async function verifyPassword(hash: string, plain: string) {
  return argon2.verify(hash, plain);
}

/** Users */
export async function getUserByEmail(email: string) {
  return one<any>(`SELECT * FROM users WHERE email = ?`, [email]);
}
export async function createUser(email: string, password: string) {
  const id = crypto.randomUUID();
  const password_hash = await hashPassword(password);
  // Try with email_verified_at present; fallback if column missing
  try {
    await db.execute({
      sql: `INSERT INTO users (id, email, password_hash, email_verified_at) VALUES (?, ?, ?, NULL)`,
      args: [id, email, password_hash],
    });
  } catch {
    await db.execute({
      sql: `INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)`,
      args: [id, email, password_hash],
    });
  }
  return { id, email, password_hash };
}

/** Verification tokens — uses your existing email_tokens(type='verify') */
export async function createVerificationToken(user_id: string, email: string) {
  const id = crypto.randomUUID();
  const token = crypto.randomBytes(32).toString("hex");

  // Try with columns (id, user_id, email, token, type, expires_at)
  try {
    await db.execute({
      sql: `
        INSERT INTO email_tokens (id, user_id, email, token, type, expires_at)
        VALUES (?, ?, ?, ?, 'verify', datetime('now','+1 day'))
      `,
      args: [id, user_id, email, token],
    });
  } catch {
    // Fallback without email column
    await db.execute({
      sql: `
        INSERT INTO email_tokens (id, user_id, token, type, expires_at)
        VALUES (?, ?, ?, 'verify', datetime('now','+1 day'))
      `,
      args: [id, user_id, token],
    });
  }

  return { id, token };
}

/** Session cookie helpers (session cookie => no Expires/Max-Age) */
async function setSessionCookie(token: string) {
  const jar = await cookies();
  jar.set({
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: COOKIE_PATH,
  });
}
export async function clearSessionCookie() {
  const jar = await cookies();
  jar.set({
    name: SESSION_COOKIE,
    value: "",
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: COOKIE_PATH,
    maxAge: 0,
  });
}

/** Sessions */
export async function createSession(user_id: string) {
  const id = crypto.randomUUID();
  // Insert with expires_at to match your NOT NULL schema if present
  try {
    await db.execute({
      sql: `
        INSERT INTO sessions (id, user_id, created_at, last_seen_at, expires_at)
        VALUES (?, ?, datetime('now'), datetime('now'), datetime('now','+1 day'))
      `,
      args: [id, user_id],
    });
  } catch (e1) {
    try {
      await db.execute({
        sql: `
          INSERT INTO sessions (id, user_id, created_at, expires_at)
          VALUES (?, ?, datetime('now'), datetime('now','+1 day'))
        `,
        args: [id, user_id],
      });
    } catch {
      await db.execute({
        sql: `INSERT INTO sessions (id, user_id, created_at) VALUES (?, ?, datetime('now'))`,
        args: [id, user_id],
      });
    }
  }
  await setSessionCookie(id);
  return id;
}

export async function deleteCurrentSession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.execute({ sql: `DELETE FROM sessions WHERE id = ?`, args: [token] });
  }
  await clearSessionCookie();
}

export async function getSession(): Promise<{ id: string; user_id: string } | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  let row: any = null;
  try {
    row = await one<any>(`SELECT id, user_id, expires_at FROM sessions WHERE id = ?`, [token]);
  } catch {
    row = await one<any>(`SELECT id, user_id FROM sessions WHERE id = ?`, [token]);
  }
  if (!row) return null;

  if (row.expires_at) {
    const expired = await one<any>(
      `SELECT CASE WHEN datetime(?) <= datetime('now') THEN 1 ELSE 0 END AS is_expired`,
      [row.expires_at]
    );
    if (expired?.is_expired) {
      await db.execute({ sql: `DELETE FROM sessions WHERE id = ?`, args: [token] });
      await clearSessionCookie();
      return null;
    }
  }

  try {
    await db.execute({ sql: `UPDATE sessions SET last_seen_at = datetime('now') WHERE id = ?`, args: [token] });
  } catch {}
  return { id: row.id, user_id: row.user_id };
}

export async function getUserFromSession() {
  const s = await getSession();
  if (!s) return null;
  return one<any>(`SELECT * FROM users WHERE id = ?`, [s.user_id]);
}

export async function requireUser() {
  const u = await getUserFromSession();
  return u as any;
}

/** Optional helper */
export async function logoutAll(user_id: string) {
  await db.execute({ sql: `DELETE FROM sessions WHERE user_id = ?`, args: [user_id] });
  await clearSessionCookie();
}

