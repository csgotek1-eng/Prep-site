import { findPlaceholders } from "./templates.ts";
import {
  EMPTY_PLACEMENTS,
  isPromotionAudience,
  isPromotionTemplateId,
  isStoredPromotionStatus,
  PROMOTION_PLACEMENTS,
  type PromotionInput,
  type PromotionPlacements,
} from "./types.ts";

/**
 * SERVER-SIDE validation for everything an admin submits. The admin UI
 * validates for comfort; this is the only check that counts.
 *
 * Two rules matter beyond field lengths:
 *
 *  1. Text is stored as PLAIN TEXT. Control characters are stripped
 *     and angle brackets are removed, so no promotion can smuggle
 *     markup into a public page. Nothing on the public side renders
 *     promotion text as HTML either — this is the belt to that braces.
 *
 *  2. A promotion may not be published while it still carries a
 *     template placeholder like "[number]", or with an end date that
 *     is not after its start. Draft freely; publish deliberately.
 */

const LIMITS = {
  internalName: 120,
  publicTitle: 90,
  shortText: 180,
  longDescription: 4000,
  promotionType: 40,
  ctaLabel: 40,
  ctaUrl: 200,
  termsText: 600,
} as const;

/** Everything unprintable except newline and tab. */
const CONTROL_CHARACTERS =
  /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

export function sanitizePromotionText(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value
    // Angle brackets can never be part of a legitimate offer sentence,
    // and removing them here means no downstream renderer has to be
    // trusted to escape them.
    .replace(/[<>]/g, "")
    .replace(CONTROL_CHARACTERS, "")
    .replace(/\r\n?/g, "\n")
    .trim()
    .slice(0, max);
}

/** Site-relative destinations only: no javascript:, no other origin. */
export function sanitizeCtaUrl(value: unknown): string | null {
  const raw = sanitizePromotionText(value, LIMITS.ctaUrl);
  if (!raw.startsWith("/") || raw.startsWith("//")) return null;
  if (/\s/.test(raw)) return null;
  return raw;
}

function readPlacements(value: unknown): PromotionPlacements {
  const source =
    typeof value === "object" && value !== null
      ? (value as Record<string, unknown>)
      : {};
  const placements = { ...EMPTY_PLACEMENTS };
  for (const key of PROMOTION_PLACEMENTS) {
    placements[key] = source[key] === true;
  }
  return placements;
}

function readInstant(value: unknown): string | null | undefined {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") return undefined;
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return undefined;
  return new Date(parsed).toISOString();
}

export function validatePromotionInput(
  data: unknown,
):
  | { promotion: PromotionInput; error?: never }
  | { promotion?: never; error: string } {
  if (typeof data !== "object" || data === null) {
    return { error: "Invalid request body." };
  }
  const body = data as Record<string, unknown>;

  const internalName = sanitizePromotionText(
    body.internalName,
    LIMITS.internalName,
  );
  if (!internalName) {
    return { error: "Give the promotion an internal name." };
  }
  const publicTitle = sanitizePromotionText(body.publicTitle, LIMITS.publicTitle);
  if (!publicTitle) {
    return { error: "Give the promotion a public headline." };
  }
  const shortText = sanitizePromotionText(body.shortText, LIMITS.shortText);
  if (!shortText) {
    return { error: "Add one short line explaining the offer." };
  }

  const status = isStoredPromotionStatus(body.status) ? body.status : "DRAFT";
  const audience = isPromotionAudience(body.audience)
    ? body.audience
    : "NEW_CLIENTS";

  const startAt = readInstant(body.startAt);
  if (startAt === undefined) return { error: "That start date is not valid." };
  const endAt = readInstant(body.endAt);
  if (endAt === undefined) return { error: "That end date is not valid." };
  if (startAt && endAt && Date.parse(endAt) <= Date.parse(startAt)) {
    return { error: "The end date must be after the start date." };
  }

  const ctaLabel = sanitizePromotionText(body.ctaLabel, LIMITS.ctaLabel);
  if (!ctaLabel) return { error: "Give the offer a button label." };
  const ctaUrl = sanitizeCtaUrl(body.ctaUrl);
  if (!ctaUrl) {
    return {
      error:
        "The button must link to a page on this site, e.g. /become-a-client.",
    };
  }

  const rawPriority = Number(body.priority);
  const priority =
    Number.isFinite(rawPriority) && rawPriority >= 0 && rawPriority <= 1000
      ? Math.round(rawPriority)
      : 10;

  const promotion: PromotionInput = {
    internalName,
    publicTitle,
    shortText,
    longDescription: sanitizePromotionText(
      body.longDescription,
      LIMITS.longDescription,
    ),
    promotionType:
      sanitizePromotionText(body.promotionType, LIMITS.promotionType) ||
      "welcome",
    templateId: isPromotionTemplateId(body.templateId) ? body.templateId : null,
    status,
    audience,
    startAt: startAt ?? null,
    endAt: endAt ?? null,
    ctaLabel,
    ctaUrl,
    placements: readPlacements(body.placements),
    priority,
    termsText: sanitizePromotionText(body.termsText, LIMITS.termsText),
  };

  if (promotion.status === "ACTIVE") {
    const placeholders = findPlaceholders(
      promotion.publicTitle,
      promotion.shortText,
      promotion.longDescription,
      promotion.termsText,
    );
    if (placeholders.length > 0) {
      return {
        error: `Replace ${placeholders.join(", ")} with real wording before publishing.`,
      };
    }
    if (!PROMOTION_PLACEMENTS.some((key) => promotion.placements[key])) {
      return {
        error: "Choose at least one place to show the offer before publishing.",
      };
    }
  }

  return { promotion };
}
