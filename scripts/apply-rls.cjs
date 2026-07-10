require("dotenv/config");
const { Pool } = require("pg");
const fs = require("fs");

const url = process.env.DATABASE_URL?.replace(/^"|"$/g, "");
const pool = new Pool({ connectionString: url });

const sql = fs.readFileSync("scripts/rls-migration.sql", "utf8");

async function main() {
  const client = await pool.connect();
  try {
    await client.query(sql);
    console.log("RLS migration applied successfully");
  } catch (e) {
    console.error("Migration error:", e.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();