import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import { hashRateLimitKey, requestClientKey } from "../src/lib/rate-limit.ts";

/** Every text file under the given roots, skipping binary asset types. */
function sourceFiles(roots: string[]): string[] {
  const BINARY = /\.(png|jpe?g|webp|avif|gif|ico|mp4|webm|woff2?|ttf|otf|pdf)$/i;
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      if (entry === "node_modules" || entry.startsWith(".")) continue;
      const path = join(dir, entry);
      if (statSync(path).isDirectory()) walk(path);
      else if (!BINARY.test(path)) out.push(path);
    }
  };
  for (const root of roots) walk(root);
  return out;
}

const TAB = 0x09;
const LINE_FEED = 0x0a;
const CARRIAGE_RETURN = 0x0d;
const FIRST_PRINTABLE = 0x20;

describe("source hygiene", () => {
  it("no source file carries a raw control byte", () => {
    // A literal NUL turns a .ts file binary as far as git and grep are
    // concerned: `git diff` reports "Binary files differ" with no line
    // diff, and `grep -r` skips the file silently. That had happened to
    // src/lib/rate-limit.ts — the rate limiter, the file where a
    // reviewer most needs to see exactly what changed. Control
    // characters used as test data belong here as \u escapes, which
    // keep the runtime value identical and the file readable.
    const offenders: string[] = [];
    for (const path of sourceFiles(["src", "tests", "supabase"])) {
      const bytes = readFileSync(path);
      for (const [index, byte] of bytes.entries()) {
        if (
          byte < FIRST_PRINTABLE &&
          byte !== TAB &&
          byte !== LINE_FEED &&
          byte !== CARRIAGE_RETURN
        ) {
          offenders.push(
            `${path} byte ${index}: 0x${byte.toString(16).padStart(2, "0")}`,
          );
          break;
        }
      }
    }
    assert.deepEqual(offenders, []);
  });

  it("the rate-limit key separator survives as a real NUL at runtime", () => {
    // The escape changed how the separator is WRITTEN, not what it is.
    // Two different splits of the same characters must still hash apart.
    assert.notEqual(hashRateLimitKey("a", "b c"), hashRateLimitKey("a b", "c"));
    assert.equal(hashRateLimitKey("enquiry", "1.2.3.4").length, 32);
    assert.equal(
      hashRateLimitKey("enquiry", "1.2.3.4"),
      hashRateLimitKey("enquiry", "1.2.3.4"),
      "the same client must map to the same bucket",
    );
  });

  it("a request without x-forwarded-for still gets its own bucket", () => {
    const key = (headers: Record<string, string>) =>
      requestClientKey(new Request("https://example.test/", { headers }));

    assert.equal(key({ "x-forwarded-for": "9.9.9.9, 10.0.0.1" }), "9.9.9.9");
    // x-forwarded-for wins when both are present.
    assert.equal(
      key({ "x-forwarded-for": "9.9.9.9", "x-real-ip": "8.8.8.8" }),
      "9.9.9.9",
    );
    // Without it, x-real-ip keeps two visitors in separate buckets
    // instead of both landing in the shared "unknown" one, where a
    // lead form rejects real enquiries five at a time.
    assert.equal(key({ "x-real-ip": "8.8.8.8" }), "8.8.8.8");
    assert.notEqual(key({ "x-real-ip": "8.8.8.8" }), key({ "x-real-ip": "7.7.7.7" }));
    assert.equal(key({}), "unknown");
  });
});
