/**
 * Whether the calculator may OFFER WhatsApp as a delivery channel.
 *
 * THE BUG THIS EXISTS TO CLOSE. Step 3 of the calculator asked "how
 * would you like to receive your pricing?" and offered WhatsApp beside
 * Email. Sending a price over WhatsApp needs the Meta Business API,
 * which is a paid, approved-template integration that is not connected:
 * production sets none of WHATSAPP_ACCESS_TOKEN,
 * WHATSAPP_PHONE_NUMBER_ID or WHATSAPP_PRICING_TEMPLATE_NAME, so
 * resolveWhatsAppDeliveryMode() returns "disabled".
 *
 * The server behaved correctly throughout: it saved the request and
 * said delivery was unavailable rather than claiming a message had been
 * sent. But a visitor who picked WhatsApp had already typed their
 * number into a form that could never deliver, and was told so only
 * afterwards. Offering a choice we cannot honour is a promise, and the
 * page kept it by accident rather than by design.
 *
 * So the offer now follows the capability. Until the API is connected
 * the calculator asks for an email address and says email; WhatsApp
 * remains everywhere else on the site as what it actually is, a way to
 * talk to a person.
 *
 * Deliberately a BUILD-TIME public flag rather than a runtime lookup.
 * The alternative is shipping the server's delivery mode to the browser
 * on every page, which exposes configuration state to anybody who
 * looks, to save a rebuild on the day the integration is switched on.
 *
 * Set NEXT_PUBLIC_WHATSAPP_PRICING_ENABLED=true in .env.production at
 * the same time as the Meta credentials, and not before: turning this
 * on without them puts the broken choice straight back.
 */
export const WHATSAPP_PRICING_ENABLED =
  process.env.NEXT_PUBLIC_WHATSAPP_PRICING_ENABLED === "true";

/**
 * The channel a visitor starts on.
 *
 * Email whenever WhatsApp delivery is unavailable, so the default is
 * always a channel that works.
 */
export const DEFAULT_PRICING_CHANNEL: "whatsapp" | "email" =
  WHATSAPP_PRICING_ENABLED ? "whatsapp" : "email";
