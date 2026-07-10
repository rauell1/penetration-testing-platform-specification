#!/usr/bin/env node
import "dotenv/config";
import { Pool } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL?.replace(/^"|"$/g, "");
const pool = new Pool({ connectionString: url });

async function main() {
  const [, , command, orgSlug] = process.argv;

  if (!command || !["on", "off", "status", "list"].includes(command)) {
    console.error("Usage: npm run kill-switch <on|off|status|list> [org-slug]");
    console.error("  on <org-slug>     - enable emergency stop for organization");
    console.error("  off <org-slug>    - disable emergency stop for organization");
    console.error("  status <org-slug> - show emergency stop status for organization");
    console.error("  list              - list all organizations with emergency stop status");
    process.exit(1);
  }

  try {
    switch (command) {
      case "on": {
        if (!orgSlug) {
          console.error("Error: org-slug required for 'on' command");
          process.exit(1);
        }
        const result = await pool.query(
          `UPDATE organizations SET emergency_stop = true WHERE slug = $1 RETURNING id, slug, name, emergency_stop`,
          [orgSlug]
        );
        if (result.rowCount === 0) {
          console.error(`Organization with slug "${orgSlug}" not found`);
          process.exit(1);
        }
        console.log(`✅ Emergency STOP ENABLED for ${result.rows[0].name} (${result.rows[0].slug})`);
        break;
      }

      case "off": {
        if (!orgSlug) {
          console.error("Error: org-slug required for 'off' command");
          process.exit(1);
        }
        const result = await pool.query(
          `UPDATE organizations SET emergency_stop = false WHERE slug = $1 RETURNING id, slug, name, emergency_stop`,
          [orgSlug]
        );
        if (result.rowCount === 0) {
          console.error(`Organization with slug "${orgSlug}" not found`);
          process.exit(1);
        }
        console.log(`✅ Emergency STOP DISABLED for ${result.rows[0].name} (${result.rows[0].slug})`);
        break;
      }

      case "status": {
        if (!orgSlug) {
          console.error("Error: org-slug required for 'status' command");
          process.exit(1);
        }
        const result = await pool.query(
          `SELECT id, slug, name, emergency_stop FROM organizations WHERE slug = $1`,
          [orgSlug]
        );
        if (result.rowCount === 0) {
          console.error(`Organization with slug "${orgSlug}" not found`);
          process.exit(1);
        }
        const org = result.rows[0];
        console.log(`${org.emergency_stop ? "🔴 STOPPED" : "🟢 ACTIVE"} - ${org.name} (${org.slug})`);
        break;
      }

      case "list": {
        const result = await pool.query(
          `SELECT slug, name, emergency_stop, plan, created_at FROM organizations ORDER BY created_at DESC`
        );
        if (result.rowCount === 0) {
          console.log("No organizations found");
          break;
        }
        console.log("\nOrganization Emergency Stop Status:\n");
        console.log("  STATUS  | SLUG                    | NAME");
        console.log("  --------|-------------------------|---------------------------");
        for (const org of result.rows) {
          const status = org.emergency_stop ? "🔴 STOP" : "🟢 OK  ";
          console.log(`  ${status} | ${org.slug.padEnd(23)} | ${org.name}`);
        }
        console.log("");
        break;
      }
    }
  } catch (e) {
    console.error("Error:", e instanceof Error ? e.message : String(e));
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();