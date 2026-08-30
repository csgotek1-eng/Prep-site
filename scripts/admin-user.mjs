#!/usr/bin/env node
/**
 * Dockentra admin-role operator utility (SERVER-SIDE ONLY).
 *
 * Grants/revokes/checks the `app_metadata.role = "admin"` claim on an
 * EXISTING Supabase Auth user, so production admin setup never requires
 * editing application code or the database by hand.
 *
 *   npm run admin:check  -- --email user@example.com
 *   npm run admin:grant  -- --email user@example.com
 *   npm run admin:revoke -- --email user@example.com
 *
 * Requirements (environment variables only — NEVER passed as flags,
 * never printed, never committed):
 *   SUPABASE_PUBLIC_URL        the project URL
 *   SUPABASE_SERVICE_ROLE_KEY  the server-only service-role key
 *
 * Deliberate constraints:
 *  - It NEVER creates a user and NEVER touches passwords. Create the
 *    user first in Supabase Dashboard → Authentication → Users (see
 *    docs/ADMIN_SETUP.md).
 *  - It refuses ambiguous matches and only ever changes the single
 *    `role` key inside app_metadata; everything else is preserved.
 *  - Output contains no key material and no tokens.
 */

const [, , command, ...rest] = process.argv;

function fail(message) {
  console.error(`Error: ${message}`);
  process.exit(1);
}

function parseEmail(args) {
  const index = args.indexOf("--email");
  const email = index >= 0 ? args[index + 1] : undefined;
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    fail("pass the target user with --email user@example.com");
  }
  return email.toLowerCase();
}

const COMMANDS = ["check", "grant", "revoke"];
if (!COMMANDS.includes(command)) {
  console.log(
    "Usage: node scripts/admin-user.mjs <check|grant|revoke> --email user@example.com",
  );
  process.exit(command ? 1 : 0);
}
const email = parseEmail(rest);

const url = process.env.SUPABASE_PUBLIC_URL?.trim();
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
if (!url || !serviceRoleKey) {
  fail(
    "SUPABASE_PUBLIC_URL and SUPABASE_SERVICE_ROLE_KEY must be set in the environment (do not paste keys on the command line).",
  );
}
const base = url.replace(/\/$/, "");
const headers = {
  apikey: serviceRoleKey,
  Authorization: `Bearer ${serviceRoleKey}`,
  "Content-Type": "application/json",
};

async function api(method, path, body) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) {
    // Never echo the response body — it can contain user records.
    fail(`Supabase Auth API responded ${response.status} for ${method} ${path}.`);
  }
  return response.json();
}

/** Find exactly one existing user by email (paged scan, capped). */
async function findUser() {
  const matches = [];
  for (let page = 1; page <= 20; page++) {
    const data = await api(
      "GET",
      `/auth/v1/admin/users?page=${page}&per_page=200`,
    );
    const users = Array.isArray(data.users) ? data.users : [];
    for (const user of users) {
      if (typeof user.email === "string" && user.email.toLowerCase() === email) {
        matches.push(user);
      }
    }
    if (users.length < 200) break;
  }
  if (matches.length === 0) {
    fail(
      `no Supabase Auth user exists with email ${email} — create the user first (Supabase Dashboard → Authentication → Users), then re-run.`,
    );
  }
  if (matches.length > 1) {
    fail(`ambiguous: ${matches.length} users match ${email}; refusing to act.`);
  }
  return matches[0];
}

function describe(user) {
  const role = user.app_metadata?.role;
  console.log(`user id:  ${user.id}`);
  console.log(`email:    ${user.email}`);
  console.log(`admin:    ${role === "admin" ? "YES" : "no"}`);
}

const user = await findUser();

if (command === "check") {
  describe(user);
  process.exit(0);
}

// Preserve every other app_metadata key; change ONLY `role`.
const nextMetadata = { ...(user.app_metadata ?? {}) };
if (command === "grant") {
  nextMetadata.role = "admin";
} else {
  // `null` (not deletion) so the revoke also holds on servers that
  // merge rather than replace app_metadata; the server-side check is
  // strict `role === "admin"` either way.
  nextMetadata.role = null;
}

await api("PUT", `/auth/v1/admin/users/${user.id}`, {
  app_metadata: nextMetadata,
});
const updated = await api("GET", `/auth/v1/admin/users/${user.id}`);
console.log(command === "grant" ? "Admin role GRANTED." : "Admin role REVOKED.");
describe(updated);
console.log(
  "Note: the change applies to the user's NEXT sign-in/token refresh.",
);
