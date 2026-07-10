import "dotenv/config";
import { Pool } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL?.replace(/^"|"$/g, "");
const pool = new Pool({ connectionString: url });

async function main() {
  // Create helper functions
  await pool.query(`
    CREATE OR REPLACE FUNCTION current_org_id()
    RETURNS uuid LANGUAGE sql STABLE AS $$
      SELECT NULLIF(current_setting('app.current_org_id', true), '')::uuid
    $$;
  `);
  console.log("Created current_org_id()");

  await pool.query(`
    CREATE OR REPLACE FUNCTION current_user_id()
    RETURNS uuid LANGUAGE sql STABLE AS $$
      SELECT NULLIF(current_setting('app.current_user_id', true), '')::uuid
    $$;
  `);
  console.log("Created current_user_id()");

  // Now run the policy statements
  const fs = await import("fs");
  const sql = fs.readFileSync("scripts/rls-migration.sql", "utf-8");
  
  const statements = sql
    .split(";")
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith("--") && !s.startsWith("CREATE OR REPLACE FUNCTION"));
  
  for (const stmt of statements) {
    try {
      await pool.query(stmt);
      console.log("OK:", stmt.substring(0, 60) + "...");
    } catch (e) {
      console.error("ERROR:", stmt.substring(0, 60) + "...");
      console.error(e instanceof Error ? e.message : String(e));
    }
  }
  
  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });