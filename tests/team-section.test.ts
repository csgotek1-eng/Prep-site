import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { describe, it } from "node:test";

import {
  getTeamMember,
  teamMemberEmailHref,
  teamMemberNames,
  teamMembers,
  TEAM_PORTRAIT_HEIGHT,
  TEAM_PORTRAIT_WIDTH,
} from "../src/lib/team.ts";

const read = (path: string) => readFileSync(path, "utf8");

/**
 * THE TEAM: three real people, one source of truth, nothing invented.
 *
 * The site used to name one person and say he answered every message.
 * Three people work here, so that sentence was a claim about who would
 * handle an account. These tests hold the replacement: the data lives in
 * exactly one module, no surface re-declares a person, and the things
 * nobody has supplied — titles, biographies, addresses — stay absent
 * rather than being filled in to make a card look complete.
 */

describe("the central team model", () => {
  it("holds exactly the three approved people, in order", () => {
    assert.deepEqual(
      teamMembers.map((m) => m.id),
      ["viktor", "anna", "denis"],
    );
    assert.deepEqual(
      teamMembers.map((m) => m.name),
      ["Viktor", "Hannah", "Denis"],
    );
  });

  it("looks a member up by id, and refuses an unknown one", () => {
    // The id stays "anna" (an internal identifier); her display name
    // changed to "Hannah" (owner request, 2026-09-24).
    assert.equal(getTeamMember("anna").name, "Hannah");
    assert.equal(getTeamMember("denis").image, "/media/team/denis.webp");
    // @ts-expect-error - the point of the guard is the runtime case
    assert.throws(() => getTeamMember("nobody"), /Unknown team member/);
  });

  it("publishes no email until a real one exists", () => {
    for (const member of teamMembers) {
      assert.equal(member.email, null, `${member.id} has an email nobody supplied`);
      assert.equal(teamMemberEmailHref(member), null);
    }
  });

  it("but one edit in this file would publish them everywhere", () => {
    // The architecture requirement, expressed as a test: a member with
    // an address produces a mailto, and nothing else has to change.
    const withEmail = { ...teamMembers[0], email: "someone@example.test" };
    assert.equal(teamMemberEmailHref(withEmail), "mailto:someone@example.test");
  });

  it("names the whole team in one phrase, for copy that needs it", () => {
    assert.equal(teamMemberNames(), "Viktor, Hannah and Denis");
  });
});

describe("the portraits are one consistent, optimised set", () => {
  it("every member has a file, and they are all WebP", () => {
    for (const member of teamMembers) {
      const path = `public${member.image}`;
      assert.ok(existsSync(path), `${member.id}: ${path} is missing`);
      const header = readFileSync(path).subarray(0, 12);
      assert.equal(header.subarray(0, 4).toString("ascii"), "RIFF", `${member.id} is not WebP`);
      assert.equal(header.subarray(8, 12).toString("ascii"), "WEBP", `${member.id} is not WebP`);
    }
  });

  it("each stays small enough to ship three of them on one page", () => {
    let total = 0;
    for (const member of teamMembers) {
      const size = statSync(`public${member.image}`).size;
      total += size;
      assert.ok(size < 200_000, `${member.id} is ${(size / 1024).toFixed(0)} KB`);
    }
    assert.ok(total < 400_000, `the three portraits total ${(total / 1024).toFixed(0)} KB`);
  });

  it("keeps the originals out of public/ and in media-source/", () => {
    for (const member of teamMembers) {
      assert.ok(
        existsSync(`media-source/${member.id}.source.png`),
        `${member.id}: the untouched original is not archived`,
      );
      // The multi-megabyte PNG must never be the thing a visitor loads.
      assert.equal(existsSync(`public/media/team/${member.id}.png`), false);
    }
  });

  it("is produced by a script, from the archived originals", () => {
    const script = read("scripts/derive-team-portraits.mjs");
    assert.ok(script.includes("media-source/"));
    assert.ok(script.includes("public/media/team/"));
    // A pure downscale: the guard that stops it cropping a face.
    assert.ok(script.includes("4:5"));
    assert.ok(script.includes(String(TEAM_PORTRAIT_WIDTH)));
    assert.ok(script.includes(String(TEAM_PORTRAIT_HEIGHT)));
  });
});

describe("the /about team block", () => {
  const about = read("src/app/about/page.tsx");
  const section = read("src/components/sections/TeamSection.tsx");

  it("is on the page, and reads from the central model", () => {
    assert.ok(about.includes("<TeamSection />"));
    assert.ok(section.includes('from "@/lib/team"'));
    // No second copy of a person anywhere in the markup.
    for (const name of ["Viktor", "Hannah", "Denis"]) {
      assert.equal(
        section.includes(`>${name}<`),
        false,
        `${name} is hard-coded in the markup instead of coming from the data`,
      );
    }
  });

  it("carries the approved heading and copy", () => {
    const copy = section.replace(/\s+/g, " ");
    assert.ok(copy.includes("Our team"));
    assert.ok(copy.includes("Meet the team"));
    assert.ok(copy.includes("A small, hands-on team you can reach directly"));
  });

  it("shows names only — no invented titles, bios or social links", () => {
    for (const banned of ["Founder", "Director", "Manager", "CEO", "Operations Lead", "linkedin", "twitter", "instagram"]) {
      assert.equal(
        section.toLowerCase().includes(banned.toLowerCase()),
        false,
        `the team cards carry "${banned}", which nobody supplied`,
      );
    }
  });

  it("uses next/image with responsive sizes, never a raw <img>", () => {
    assert.ok(section.includes("<Image"));
    assert.ok(section.includes("sizes="));
    assert.equal(/<img\b/.test(section), false);
  });

  it("gives each portrait a name-bearing alt", () => {
    assert.ok(section.includes("alt={`Portrait of ${member.name}`}"));
  });

  it("is NOT a <figure>, so the illustrative caption rule still holds", () => {
    // /about has exactly one figure and it carries the "illustrative
    // imagery" caption. A real person must never end up inside it.
    // Comments stripped: the one explaining this rule quotes the tag.
    const markup = section
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "");
    assert.equal(markup.includes("<figure"), false);
    assert.equal((about.match(/<figure/g) ?? []).length, 1);
  });

  it("is three equal cards on desktop and one column on a phone", () => {
    assert.ok(section.includes("grid-cols-1"));
    assert.ok(section.includes("sm:grid-cols-3"));
    // One ratio for all three: same box, no per-card height drift.
    assert.ok(section.includes("aspect-[4/5]"));
  });
});

describe("no page claims one person answers everything", () => {
  const SURFACES = [
    "src/app/about/page.tsx",
    "src/app/page.tsx",
    "src/app/contact/page.tsx",
    "src/components/sections/WhyDockentra.tsx",
    "src/components/sections/ContactSection.tsx",
  ];

  /** Copy only: the comments explaining the change quote the old wording. */
  const copyOf = (path: string) =>
    read(path)
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
      .replace(/^\s*\/\/.*$/gm, "");

  it("the old single-person lines are gone from every surface", () => {
    for (const path of SURFACES) {
      const copy = copyOf(path).replace(/\s+/g, " ");
      for (const banned of [
        "He&apos;s the one who answers",
        "He's the one who answers",
        "One named person",
        "His name is Viktor",
        "he&apos;s the one who reads your message",
        "he's the one who reads your message",
      ]) {
        assert.equal(copy.includes(banned), false, `${path} still says "${banned}"`);
      }
    }
  });

  it("Why Dockentra promises a team instead of a named man", () => {
    const why = read("src/components/sections/WhyDockentra.tsx");
    assert.ok(why.includes("A real team, not a ticket queue"));
    assert.ok(
      why.includes("You'll deal directly with the people looking after your account"),
    );
  });

  it("the headcount on /about and in the FAQ matches the published team", () => {
    // Three portraits beside "there are two of us" is a contradiction a
    // visitor can see without leaving the page.
    const count = teamMembers.length;
    const word = ["zero", "one", "two", "three", "four"][count];
    for (const path of ["src/app/about/page.tsx", "src/lib/faq.ts"]) {
      const copy = copyOf(path);
      assert.ok(
        copy.includes(`${word} of us`),
        `${path} does not say "${word} of us" for a team of ${count}`,
      );
      assert.equal(copy.includes("two of us"), count === 2);
    }
  });
});
