import { buildPricingTemplateParameters } from "./message.ts";
import type {
  PricingWhatsAppRequest,
  WhatsAppProvider,
  WhatsAppSendResult,
} from "./types";

/**
 * OFFICIAL Meta WhatsApp Cloud API provider.
 *
 * Sends the private pricing result as an approved TEMPLATE message —
 * business-initiated WhatsApp conversations REQUIRE a template that
 * Meta has reviewed and approved; free-form text is only allowed
 * inside an already-open 24-hour customer-service window. The template
 * contract (3 body parameters) is documented in
 * docs/WHATSAPP_PRICING_DELIVERY.md; an unapproved template is a
 * provider-side rejection and is reported truthfully as FAILED, never
 * pretended to be active.
 *
 * Secret hygiene: the access token lives only in the Authorization
 * header of the server-side request; it is never logged, never sent to
 * the browser, and error codes recorded on the lead are short numeric
 * codes — never response bodies.
 */

interface MetaConfig {
  accessToken: string;
  phoneNumberId: string;
  templateName: string;
  templateLanguage: string;
}

const GRAPH_BASE_URL = "https://graph.facebook.com/v23.0";
const SEND_TIMEOUT_MS = 10_000;

export class MetaWhatsAppProvider implements WhatsAppProvider {
  readonly name = "meta";
  private readonly config: MetaConfig;

  constructor(config: MetaConfig) {
    this.config = config;
  }

  async sendPricingResult(
    request: PricingWhatsAppRequest,
  ): Promise<WhatsAppSendResult> {
    const [reference, services, pricing] = buildPricingTemplateParameters(
      request.estimate,
      request.reference,
    );

    const body = {
      messaging_product: "whatsapp",
      // Meta expects the international number; the leading "+" is
      // accepted but not required.
      to: request.toE164.replace(/^\+/, ""),
      type: "template",
      template: {
        name: this.config.templateName,
        language: { code: this.config.templateLanguage },
        components: [
          {
            type: "body",
            parameters: [
              { type: "text", text: reference },
              { type: "text", text: services },
              { type: "text", text: pricing },
            ],
          },
        ],
      },
    };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);
    let response: Response;
    try {
      response = await fetch(
        `${GRAPH_BASE_URL}/${encodeURIComponent(this.config.phoneNumberId)}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.config.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        },
      );
    } catch {
      console.error("Meta WhatsApp send failed with a network error.");
      return this.failure("META_NETWORK");
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
      // Log/record the numeric code only — never the body, which can
      // echo message content, and never the token.
      const errorCode = extractMetaErrorCode(payload, response.status);
      console.error(`Meta WhatsApp send rejected (${errorCode}).`);
      return this.failure(errorCode);
    }

    const messageId = extractMessageId(payload);
    if (!messageId) {
      console.error("Meta WhatsApp send returned no message id.");
      return this.failure("META_NO_MESSAGE_ID");
    }
    return {
      outcome: "ACCEPTED",
      provider: this.name,
      providerMessageId: messageId,
      errorCode: null,
    };
  }

  private failure(errorCode: string): WhatsAppSendResult {
    return {
      outcome: "FAILED",
      provider: this.name,
      providerMessageId: null,
      errorCode,
    };
  }
}

function extractMessageId(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const messages = (payload as { messages?: unknown }).messages;
  if (!Array.isArray(messages) || messages.length === 0) return null;
  const id = (messages[0] as { id?: unknown })?.id;
  return typeof id === "string" && id.length > 0 ? id : null;
}

export function extractMetaErrorCode(
  payload: unknown,
  httpStatus: number,
): string {
  if (payload && typeof payload === "object") {
    const error = (payload as { error?: unknown }).error;
    if (error && typeof error === "object") {
      const code = (error as { code?: unknown }).code;
      if (typeof code === "number" && Number.isFinite(code)) {
        return `META_${code}`;
      }
    }
  }
  return `META_HTTP_${httpStatus}`;
}
