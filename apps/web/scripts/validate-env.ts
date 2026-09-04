/**
 * Run before promoting a build to a real environment:
 *   pnpm --filter @noyala/web validate-env
 * Exits non-zero and lists every missing required variable so a bad deploy
 * fails fast and loud instead of a user hitting a broken auth flow.
 */
import { ENV_VARS } from "../src/server/env.js";

const missing = ENV_VARS.filter(
  (v) => v.required && !process.env[v.name],
).map((v) => v.name);

if (missing.length > 0) {
  console.error(
    `Missing required environment variable(s): ${missing.join(", ")}\nSee .env.example.`,
  );
  process.exit(1);
}

console.log("All required environment variables are set.");
