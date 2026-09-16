import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { afterEach, describe, it } from "node:test";
import {
  enforceTurnstile,
  isTurnstileConfigured,
  turnstileRemoteIp,
  verifyTurnstileToken,
} from "../src/lib/security/turnstile.ts";

const read = (path: string) => readFileSync(path, "utf8");

/**
 * Source with comments removed. An assertion about what the CODE does
 * must never be satisfied by a doc block that merely mentions the
 * thing, and these files talk about Turnstile at length.
 */
const readCode = (path: string) =>
  read(path)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

/**
 * Cloudflare's PUBLISHED test keys. Documented public values, not
 * credentials: the first always passes and the second always fails
 * against the real endpoint. Nothing here reaches the real
 * endpoint: every call below is answered by the stub, and the documented
 * pair keeps the fixtures honest about what a secret looks like.
 */
const ALWAYS_PASSES = "1x0000000000000000000000000000000AA";
const ALWAYS_FAILS = "2x0000000000000000000000000000000AA";

type FetchCall = { url: string; body: URLSearchParams };

/**
 * Stand in for the network. Returns what was asked of Cloudflare, so
 * the assertions can check the request as well as the answer: the
 * secret leaving for the wrong host would be worse than any of the
 * failures below.
 */
function stubSiteverify(
  reply: { status?: number; json?: unknown } | Error,
): { calls: FetchCall[]; warnings: string[]; restore: () => void } {
  const calls: FetchCall[] = [];
  const warnings: string[] = [];
  const realFetch = globalThis.fetch;
  const realWarn = console.warn;

  globalThis.fetch = (async (input: unknown, init: RequestInit) => {
    calls.push({
      url: String(input),
      body: new URLSearchParams(String(init.body)),
    });
    if (reply instanceof Error) throw reply;
    return {
      ok: (reply.status ?? 200) < 400,
      status: reply.status ?? 200,
      json: async () => reply.json ?? {},
    };
  }) as typeof fetch;
  console.warn = (...args: unknown[]) => {
    warnings.push(args.map(String).join(" "));
  };

  return {
    calls,
    warnings,
    restore: () => {
      globalThis.fetch = realFetch;
      console.warn = realWarn;
    },
  };
}

const withSecret = (secret: string | undefined) => {
  if (secret === undefined) delete process.env.TURNSTILE_SECRET_KEY;
  else process.env.TURNSTILE_SECRET_KEY = secret;
};

afterEach(() => withSecret(undefined));

// ---------------------------------------------------------------------
// The verifier
// ---------------------------------------------------------------------

describe("Turnstile verification", () => {
  it("skips verification entirely when no secret is configured", async () => {
    // The documented degradation, and the state the site ships in: the
    // owner has no widget yet, so the forms must work untouched. No
    // token, no network call, no complaint.
    withSecret(undefined);
    const stub = stubSiteverify({ json: { success: false } });
    try {
      assert.equal(isTurnstileConfigured(), false);
      assert.deepEqual(await verifyTurnstileToken(null), { ok: true });
      assert.deepEqual(await verifyTurnstileToken("anything"), { ok: true });
      assert.equal(stub.calls.length, 0, "it asked Cloudflare with no secret");
    } finally {
      stub.restore();
    }
  });

  it("treats an empty secret as no secret", async () => {
    // A variable set to "" or to whitespace is what a half-finished
    // deploy leaves behind, and it must not mean "verify against an
    // empty credential and refuse everybody".
    withSecret("   ");
    const stub = stubSiteverify({ json: { success: false } });
    try {
      assert.equal(isTurnstileConfigured(), false);
      assert.deepEqual(await verifyTurnstileToken("tok"), { ok: true });
      assert.equal(stub.calls.length, 0);
    } finally {
      stub.restore();
    }
  });

  it("rejects a missing token once a secret IS configured", async () => {
    withSecret(ALWAYS_PASSES);
    const stub = stubSiteverify({ json: { success: true } });
    try {
      for (const absent of [null, undefined, "", "   "]) {
        assert.deepEqual(await verifyTurnstileToken(absent), {
          ok: false,
          reason: "missing",
        });
      }
      // And it never spent a siteverify call to learn what it could
      // already see.
      assert.equal(stub.calls.length, 0);
    } finally {
      stub.restore();
    }
  });

  it("rejects a token Cloudflare calls invalid", async () => {
    withSecret(ALWAYS_FAILS);
    const stub = stubSiteverify({
      json: { success: false, "error-codes": ["invalid-input-response"] },
    });
    try {
      assert.deepEqual(await verifyTurnstileToken("forged"), {
        ok: false,
        reason: "invalid",
      });
      assert.equal(stub.calls.length, 1);
    } finally {
      stub.restore();
    }
  });

  it("maps timeout-or-duplicate to expired, not to invalid", async () => {
    // Not an attack: somebody left the page open past the token's few
    // minutes, or pressed send twice. Calling that "invalid" would be
    // telling a real visitor their own browser cheated.
    withSecret(ALWAYS_PASSES);
    const stub = stubSiteverify({
      json: { success: false, "error-codes": ["timeout-or-duplicate"] },
    });
    try {
      assert.deepEqual(await verifyTurnstileToken("stale"), {
        ok: false,
        reason: "expired",
      });
    } finally {
      stub.restore();
    }
  });

  it("maps the remaining documented codes", async () => {
    withSecret(ALWAYS_PASSES);
    const cases: Array<[string, string]> = [
      ["missing-input-response", "missing"],
      ["bad-request", "invalid"],
      // Our credential is wrong, which is our fault. The visitor is
      // carried by the fail-open path instead of being blamed.
      ["invalid-input-secret", "unavailable"],
      ["internal-error", "unavailable"],
    ];
    for (const [code, reason] of cases) {
      const stub = stubSiteverify({
        json: { success: false, "error-codes": [code] },
      });
      try {
        assert.deepEqual(
          await verifyTurnstileToken("tok"),
          { ok: false, reason },
          `${code} should map to ${reason}`,
        );
      } finally {
        stub.restore();
      }
    }
  });

  it("treats an unrecognised refusal as a refusal", async () => {
    // success:false with a code nobody has seen is still a no. Reading
    // an unknown answer as a pass is how a check stops being one.
    withSecret(ALWAYS_PASSES);
    const stub = stubSiteverify({
      json: { success: false, "error-codes": ["some-future-code"] },
    });
    try {
      assert.deepEqual(await verifyTurnstileToken("tok"), {
        ok: false,
        reason: "invalid",
      });
    } finally {
      stub.restore();
    }
  });

  it("accepts a token Cloudflare confirms, and asks the right endpoint", async () => {
    withSecret(ALWAYS_PASSES);
    const stub = stubSiteverify({ json: { success: true } });
    try {
      assert.deepEqual(
        await verifyTurnstileToken("good-token", "203.0.113.7"),
        { ok: true },
      );
      assert.equal(stub.calls.length, 1);
      const call = stub.calls[0];
      assert.equal(
        call.url,
        "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      );
      assert.equal(call.body.get("secret"), ALWAYS_PASSES);
      assert.equal(call.body.get("response"), "good-token");
      assert.equal(call.body.get("remoteip"), "203.0.113.7");
    } finally {
      stub.restore();
    }
  });

  it("omits remoteip rather than sending the string 'undefined'", async () => {
    withSecret(ALWAYS_PASSES);
    const stub = stubSiteverify({ json: { success: true } });
    try {
      await verifyTurnstileToken("good-token");
      assert.equal(stub.calls[0].body.has("remoteip"), false);
    } finally {
      stub.restore();
    }
  });
});

// ---------------------------------------------------------------------
// The two degradations
// ---------------------------------------------------------------------

describe("Turnstile degrades in the documented directions", () => {
  it("reports an unreachable Cloudflare as unavailable, and warns", async () => {
    withSecret(ALWAYS_PASSES);
    const stub = stubSiteverify(new Error("connect ECONNREFUSED"));
    try {
      assert.deepEqual(await verifyTurnstileToken("tok"), {
        ok: false,
        reason: "unavailable",
      });
      assert.equal(stub.warnings.length, 1, "the outage was silent");
      assert.match(stub.warnings[0], /^turnstile: /);
    } finally {
      stub.restore();
    }
  });

  it("reports a non-200 from Cloudflare as unavailable, and warns", async () => {
    withSecret(ALWAYS_PASSES);
    const stub = stubSiteverify({ status: 503 });
    try {
      assert.deepEqual(await verifyTurnstileToken("tok"), {
        ok: false,
        reason: "unavailable",
      });
      assert.match(stub.warnings[0], /^turnstile: .*503/);
    } finally {
      stub.restore();
    }
  });

  it("FAILS OPEN on an outage: the form still goes through", async () => {
    // The deliberate trade, and the one most likely to be "fixed" by
    // somebody who has not read why. A bot-protection outage must
    // never take the contact form down; the warning above is the
    // compensating control.
    withSecret(ALWAYS_PASSES);
    const stub = stubSiteverify(new Error("timed out"));
    try {
      assert.deepEqual(await enforceTurnstile("tok"), { ok: true });
      assert.equal(stub.warnings.length, 1);
    } finally {
      stub.restore();
    }
  });

  it("does NOT fail open on a refusal", async () => {
    withSecret(ALWAYS_FAILS);
    const stub = stubSiteverify({
      json: { success: false, "error-codes": ["invalid-input-response"] },
    });
    try {
      const result = await enforceTurnstile("forged");
      assert.equal(result.ok, false);
      assert.ok(result.ok === false && result.error.length > 0);
    } finally {
      stub.restore();
    }
  });

  it("gives a missing and an expired token different, honest wording", async () => {
    withSecret(ALWAYS_PASSES);
    const missing = stubSiteverify({ json: { success: true } });
    let missingMessage = "";
    try {
      const result = await enforceTurnstile(undefined);
      assert.equal(result.ok, false);
      missingMessage = result.ok === false ? result.error : "";
    } finally {
      missing.restore();
    }

    const expired = stubSiteverify({
      json: { success: false, "error-codes": ["timeout-or-duplicate"] },
    });
    try {
      const result = await enforceTurnstile("stale");
      assert.equal(result.ok, false);
      const expiredMessage = result.ok === false ? result.error : "";
      assert.notEqual(missingMessage, expiredMessage);
      assert.match(expiredMessage, /expired/i);
    } finally {
      expired.restore();
    }
  });

  it("treats a non-string token as no token", async () => {
    // JSON.parse will hand the route whatever the caller sent, and
    // {turnstileToken: {}} must not become "[object Object]".
    withSecret(ALWAYS_PASSES);
    const stub = stubSiteverify({ json: { success: true } });
    try {
      for (const junk of [null, undefined, 42, {}, []]) {
        const result = await enforceTurnstile(junk);
        assert.equal(result.ok, false, `${JSON.stringify(junk)} was accepted`);
      }
      assert.equal(stub.calls.length, 0);
    } finally {
      stub.restore();
    }
  });
});

// ---------------------------------------------------------------------
// Nothing sensitive reaches a log
// ---------------------------------------------------------------------

describe("Turnstile logs neither the secret nor the token", () => {
  it("keeps both out of every warning it can emit", async () => {
    withSecret(ALWAYS_PASSES);
    const token = "token-that-must-not-appear-in-a-log";

    for (const reply of [
      new Error("connect ECONNREFUSED"),
      { status: 502 },
      { json: { success: false, "error-codes": ["invalid-input-secret"] } },
    ]) {
      const stub = stubSiteverify(reply);
      try {
        await verifyTurnstileToken(token, "203.0.113.7");
        for (const line of stub.warnings) {
          assert.equal(
            line.includes(ALWAYS_PASSES),
            false,
            `a warning carried the secret: ${line}`,
          );
          assert.equal(
            line.includes(token),
            false,
            `a warning carried the token: ${line}`,
          );
        }
      } finally {
        stub.restore();
      }
    }
  });

  it("never logs the siteverify response body", () => {
    // We sent that endpoint our secret. A body echoed back from a
    // failing host is untrusted text of unknown length, and logging it
    // is how a credential ends up in an observability dashboard.
    const source = readCode("src/lib/security/turnstile.ts");
    assert.equal(/console\.\w+\([^)]*await result\.text/.test(source), false);
    assert.equal(source.includes("result.text()"), false);
  });
});

// ---------------------------------------------------------------------
// The caller's IP
// ---------------------------------------------------------------------

describe("the remote IP handed to Cloudflare", () => {
  const request = (headers: Record<string, string>) =>
    new Request("https://dockentra.ie/api/enquiry", { headers });

  it("prefers CF-Connecting-IP, which the edge sets and a caller cannot", () => {
    assert.equal(
      turnstileRemoteIp(
        request({
          "cf-connecting-ip": "203.0.113.7",
          "x-forwarded-for": "198.51.100.1",
        }),
      ),
      "203.0.113.7",
    );
  });

  it("falls back to the first x-forwarded-for hop, and caps it", () => {
    assert.equal(
      turnstileRemoteIp(
        request({ "x-forwarded-for": "198.51.100.1, 203.0.113.9" }),
      ),
      "198.51.100.1",
    );
    const long = turnstileRemoteIp(
      request({ "x-forwarded-for": "9".repeat(500) }),
    );
    assert.equal(long?.length, 64);
  });

  it("is null when nothing identifies the caller", () => {
    assert.equal(turnstileRemoteIp(request({})), null);
  });
});

// ---------------------------------------------------------------------
// Every public lead route actually runs the check
// ---------------------------------------------------------------------

describe("the public POST routes verify before they persist", () => {
  /**
   * The route file, the thing it does with an accepted submission, and
   * the name the check must appear before. A verifier that runs after
   * the row is written protects nothing, and nothing about the shape of
   * these files would make that obvious in review.
   */
  const GUARDED: Array<[string, string[]]> = [
    ["src/app/api/enquiry/route.ts", ["processLead"]],
    ["src/app/api/become-a-client/route.ts", ["processLead"]],
    ["src/app/api/partnerships/route.ts", ["processLead"]],
    ["src/app/api/quote/route.ts", ["processLead", "getPricingRepository"]],
    ["src/app/api/reviews/route.ts", ["getReviewRepository"]],
    [
      "src/lib/pricing-delivery/route-handler.ts",
      [
        "processWhatsAppPricingRequest(",
        "processEmailPricingRequest(",
        "getPricingRepository",
      ],
    ],
  ];

  for (const [path, persistence] of GUARDED) {
    it(`${path} calls the verifier`, () => {
      const source = readCode(path);
      assert.ok(
        source.includes("enforceTurnstile("),
        `${path} never calls enforceTurnstile`,
      );
      assert.ok(
        source.includes("turnstileRemoteIp(request)"),
        `${path} verifies without telling Cloudflare who is calling`,
      );
      assert.ok(
        source.includes("turnstileToken"),
        `${path} never reads the token out of the body`,
      );
    });

    it(`${path} calls it BEFORE anything is stored or sent`, () => {
      // Imports are stripped first. Every one of these files imports
      // processLead above the handler, so a naive index comparison
      // would call the check "too late" no matter where it sat, and
      // this assertion would pass or fail for the wrong reason.
      const source = readCode(path).replace(/^import [\s\S]*?;$/gm, "");
      const check = source.indexOf("enforceTurnstile(");
      for (const name of persistence) {
        const at = source.indexOf(name);
        if (at === -1) continue;
        assert.ok(
          check < at,
          `${path} reaches ${name} before it verifies the token`,
        );
      }
    });
  }

  it("leaves the read-only estimate endpoint alone", () => {
    // /api/pricing/estimate writes nothing and sends nothing: it prices
    // the caller's own selection and answers. A challenge on every
    // quantity change would make the calculator unusable in exchange
    // for protecting a row that does not exist.
    const source = readCode("src/app/api/pricing/estimate/route.ts");
    assert.equal(source.includes("enforceTurnstile"), false);
    assert.equal(source.includes("Turnstile"), false);
  });

  it("leaves the health check and the admin routes alone", () => {
    // Admin is behind authentication, and a health check that needs a
    // browser to pass is not a health check.
    for (const path of [
      "src/app/api/health/route.ts",
      "src/app/api/admin/leads/route.ts",
      "src/app/api/admin/reviews/route.ts",
    ]) {
      assert.equal(
        readCode(path).includes("enforceTurnstile"),
        false,
        `${path} should not carry a Turnstile check`,
      );
    }
  });

  it("does not disturb the honeypot or the save-first contract", () => {
    // Both predate this change and both are load-bearing. The honeypot
    // answers a bot with a fake success and stores nothing; processLead
    // stores before it notifies. Turnstile is a layer in front of them,
    // not a replacement for either.
    for (const [path] of GUARDED) {
      const source = readCode(path);
      if (source.includes("processLead")) {
        assert.ok(/processLead\(\s*lead,/.test(source), `${path} lost the lead-first call`);
      }
    }
    for (const path of [
      "src/app/api/enquiry/route.ts",
      "src/app/api/become-a-client/route.ts",
      "src/app/api/partnerships/route.ts",
      "src/app/api/reviews/route.ts",
      "src/app/api/quote/route.ts",
    ]) {
      assert.ok(
        /isSpam\w*\(/.test(readCode(path)),
        `${path} lost its honeypot`,
      );
    }
  });
});

// ---------------------------------------------------------------------
// The browser half
// ---------------------------------------------------------------------

describe("the widget matches the server's skip behaviour", () => {
  const widget = read("src/components/TurnstileWidget.tsx");

  it("renders nothing without a site key", () => {
    assert.ok(widget.includes("if (!siteKey) return null;"));
    assert.ok(widget.includes("NEXT_PUBLIC_TURNSTILE_SITE_KEY"));
  });

  it("loads api.js once, from Cloudflare, and renders explicitly", () => {
    assert.ok(widget.includes("https://challenges.cloudflare.com/turnstile/v0/api.js"));
    assert.ok(widget.includes("render=explicit"));
    assert.ok(widget.includes("scriptPromise"));
  });

  it("clears the token the moment it stops being valid", () => {
    // An expired or errored challenge must not leave a stale token in
    // the form to be submitted and refused.
    for (const callback of [
      "expired-callback",
      "error-callback",
      "timeout-callback",
    ]) {
      assert.ok(widget.includes(callback), `no ${callback}`);
    }
  });

  it("never names the secret", () => {
    // Code only: the doc block explains the server's skip behaviour
    // and has to name the variable to do it.
    assert.equal(
      readCode("src/components/TurnstileWidget.tsx").includes(
        "TURNSTILE_SECRET_KEY",
      ),
      false,
    );
  });

  it("cannot force a horizontal scrollbar at 320px", () => {
    // The forms are the narrowest thing on the site and Cloudflare's
    // 300px widget is wider than the content column of a 320px phone.
    // The wrapper contains that inside its own box, so the page itself
    // never scrolls sideways.
    assert.ok(widget.includes("max-w-full"));
    assert.ok(widget.includes("overflow-x-auto"));
  });
});

describe("every public form sends the token and resets on rejection", () => {
  const FORMS = [
    "src/components/EnquiryForm.tsx",
    "src/components/BecomeClientForm.tsx",
    "src/components/PartnershipForm.tsx",
    "src/components/ReviewForm.tsx",
    "src/components/PricingCalculator.tsx",
  ];

  for (const path of FORMS) {
    it(`${path} carries the widget and sends the token`, () => {
      const source = read(path);
      assert.ok(source.includes("<TurnstileWidget"), `${path} has no widget`);
      assert.ok(
        /turnstileToken,/.test(readCode(path)),
        `${path} never puts the token in the body`,
      );
    });

    it(`${path} resets the widget after a failure`, () => {
      // A token is single use. Without a reset the visitor's second
      // attempt fails for a reason the form never mentioned, which is
      // the same class of bug as a false success.
      const source = readCode(path);
      const resets = source.match(/setTurnstileReset\(\(count\) => count \+ 1\)/g);
      assert.ok(
        resets && resets.length >= 2,
        `${path} resets on fewer than both failure paths`,
      );
      assert.ok(source.includes("resetSignal={turnstileReset}"));
    });

    it(`${path} still reports failure honestly`, () => {
      // Nothing added here may turn a refusal into a confirmation.
      const source = readCode(path);
      assert.ok(
        /setPhase\("done"\)|setStatus\("sent"\)|setSendPhase\("done"\)/.test(
          source,
        ),
        `${path} lost its success state`,
      );
    });
  }
});

// ---------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------

describe("Turnstile configuration", () => {
  const config = read("next.config.ts");

  it("adds the Cloudflare host to script-src and frame-src, behind the site key", () => {
    // Exactly as the Google hosts follow the Measurement ID: with no
    // widget on the page, the policy must not authorise its host, and
    // frame-src must stay shut.
    assert.ok(config.includes("NEXT_PUBLIC_TURNSTILE_SITE_KEY"));
    assert.ok(config.includes('"https://challenges.cloudflare.com"'));
    assert.ok(config.includes("turnstileSiteKey ?"));
    assert.ok(config.includes("${turnstileScript}"));
    assert.ok(config.includes("frame-src ${turnstileFrame}"));
    assert.ok(config.includes("turnstileFrame = turnstileSiteKey ?"));
    assert.ok(config.includes("\"'none'\""), "frame-src lost its closed default");
  });

  it("weakens nothing else", () => {
    for (const directive of [
      "default-src 'self'",
      "frame-ancestors 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "style-src 'self' 'unsafe-inline'",
    ]) {
      assert.ok(config.includes(directive), `${directive} is gone`);
    }
    // The widget's own traffic happens inside a cross-origin iframe
    // governed by Cloudflare's policy, not ours, so connect-src must
    // not have been widened for it.
    assert.equal(
      /connect-src[^`]*challenges\.cloudflare/.test(
        readCode("next.config.ts"),
      ),
      false,
      "connect-src was widened for Turnstile without needing to be",
    );
  });

  it("keeps the static asset policy out of it", () => {
    // public/_headers must never grow a second copy of the real CSP.
    assert.equal(
      read("public/_headers").includes("challenges.cloudflare.com"),
      false,
    );
  });

  it("documents both variables and commits neither secret", () => {
    const example = read(".env.example");
    assert.ok(example.includes("NEXT_PUBLIC_TURNSTILE_SITE_KEY="));
    assert.ok(example.includes("TURNSTILE_SECRET_KEY="));
    assert.ok(read("docs/DEPLOYMENT_ENV.md").includes("TURNSTILE_SECRET_KEY"));

    // The secret may never appear in a committed configuration file,
    // with or without a value.
    for (const path of [".env.production", "wrangler.jsonc"]) {
      assert.equal(
        read(path).includes("TURNSTILE_SECRET_KEY="),
        false,
        `${path} assigns the Turnstile secret`,
      );
    }
    assert.equal(
      read("wrangler.jsonc").includes("TURNSTILE"),
      false,
      "wrangler.jsonc names a Turnstile variable; the site key is " +
        "build-time only and the secret belongs in wrangler secret put",
    );
  });

  it("the module says WHY it fails open, not just that it does", () => {
    const header = read("src/lib/security/turnstile.ts").slice(0, 3000);
    assert.match(header, /FAIL OPEN|fail(s|ing)? open/i);
    assert.match(header, /never logs?|is ever logged/i);
  });
});
