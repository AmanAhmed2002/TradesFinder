#!/usr/bin/env ts-node
import "dotenv/config";
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });

import { readFileSync, readdirSync } from "fs";
import path from "path";
import { createClient } from "@libsql/client";

function must(name: string) {
  const v = process.env[name];
  if (!v || !v.trim()) throw new Error(`Missing ${name}`);
  return v;
}

/** Very simple splitter: removes line comments (-- ...), splits by ;, trims, drops empties. */
function splitSql(sql: string): string[] {
  // Drop -- line comments
  const noComments = sql.replace(/--.*$/gm, "");
  // Split on ; and trim
  return noComments
    .split(";")
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

async function columnExists(db: any, table: string, column: string) {
  const r = await db.execute({
    sql: `SELECT COUNT(*) AS c FROM pragma_table_info(?) WHERE name = ?`,
    args: [table, column],
  });
  const c = Number((r.rows[0] as any)?.c ?? 0);
  return c > 0;
}

async function addColumnIfMissing(db: any, table: string, column: string, decl: string) {
  if (await columnExists(db, table, column)) return false;
  await db.execute({ sql: `ALTER TABLE ${table} ADD COLUMN ${column} ${decl}`, args: [] });
  return true;
}

async function main() {
  const url = must("TURSO_DATABASE_URL");
  const authToken = must("TURSO_AUTH_TOKEN");
  const db = createClient({ url, authToken });

  // 1) Run all .sql files as batches
  const dir = path.join(process.cwd(), "scripts", "sql");
  const files = readdirSync(dir).filter(f => f.endsWith(".sql")).sort();

  for (const f of files) {
    const p = path.join(dir, f);
    const text = readFileSync(p, "utf8");
    const statements = splitSql(text);

    console.log(`\n== Running ${f} (${statements.length} statements) ==`);

    // Use libSQL batch to run multiple statements atomically
    // Each item is { sql, args } per SDK reference
    // https://docs.turso.tech/sdk/ts/reference (Batch Transactions)
    const batchItems = statements.map(sql => ({ sql, args: [] as any[] }));
    if (batchItems.length > 0) {
      await db.batch(batchItems, "write"); // implicit transaction
    }

    console.log(`OK: ${f}`);
  }

  // 2) Idempotent column adds that SQLite doesn’t support with IF NOT EXISTS
  const added: string[] = [];
  if (await addColumnIfMissing(db, "favorites", "user_id", "TEXT")) added.push("favorites.user_id");
  if (await addColumnIfMissing(db, "favorites", "snapshot_json", "TEXT")) added.push("favorites.snapshot_json");

  console.log(added.length ? `Added columns: ${added.join(", ")}` : "No column additions needed.");

  await db.close();
  console.log("\nAll migrations applied.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

