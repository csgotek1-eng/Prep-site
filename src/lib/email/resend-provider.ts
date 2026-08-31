import {
  buildPricingEmailHtml,
  buildPricingEmailSubject,
  buildPricingEmailText,
} from "./message.ts";
import type {
  EmailSendResult,
  PricingEmailProvider,
  PricingEmailRequest,
} from "./types";

/**
 * Resend transactional email provider.
 *
 * An HTTPS API with an API key — no SMTP credentials, no mailbox
 * password, nothing that could impersonate a person's personal
 * account. The FROM address must be on a domain verified in Resend;
 * an unverified sender is a provider-side rejection and is reported
 * truthfully as FAILED, never pretended to have been sent.
 *
 * Secret hygiene: the API key lives only in the Authorization header
 * of this server-side request. It is never logged, never sent to the
 * browser, and the codes recorded on the lead are short status codes —
 * never response bodies, which can echo the customer's address.
 */

export interface ResendConfig {
  apiKey: string;
  /** Verified sender, e.g. "Dockentra <pricing@dockentra.ie>". */
  from: string;
  /** Optional Reply-To — this MAY be the owner's own mailbox. */
  replyTo: string | null;
}

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const SEND_TIMEOUT_MS = 10_000;

export class ResendPricingEmailProvider implements PricingEmailProvider {
  readonly name = "resend";
  private readonly config: ResendConfig;

  constructor(config: ResendConfig) {
    this.config = config;
  }

  async sendPricingResult(
    request: PricingEmailRequest,
  ): Promise<EmailSendResult> {
    const body: Record<string, unknown> = {
      from: this.config.from,
      to: [request.to],
      subject: buildPricingEmailSubject(request.reference),
      text: buildPricingEmailText(request.estimate, request.reference),
      html: buildPricingEmailHtml(request.estimate, request.reference),
    };
    if (this.config.replyTo) {
      body.reply_to = this.config.replyTo;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);
    let response: Response;
    try {
      response = await fetch(RESEND_ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch {
      console.error("Resend pricing email failed with a network error.");
      return this.failure("RESEND_NETWORK");
    } finally {
      clearTimeout(timer);
    }

    let payload: unknown = null;
    try {
      payload = await response.json();
    } catch {
      // A non-JSON body still resolves below from the HTTP status.
    }

    if (!response.ok) {
      const errorCode = `RESEND_HTTP_${response.status}`;
      console.error(`Resend pricing email rejected (${errorCode}).`);
      return this.failure(errorCode);
    }

    const messageId = extractResendMessageId(payload);
    if (!messageId) {
      console.error("Resend pricing email returned no message id.");
      return this.failure("RESEND_NO_MESSAGE_ID");
    }
    return {
      outcome: "ACCEPTED",
      provider: this.name,
      providerMessageId: messageId,
      errorCode: null,
    };
  }

  private failure(errorCode: string): EmailSendResult {
    return {
      outcome: "FAILED",
      provider: this.name,
      providerMessageId: null,
      errorCode,
    };
  }
}

export function extractResendMessageId(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const id = (payload as { id?: unknown }).id;
  return typeof id === "string" && id.length > 0 ? id : null;
}
