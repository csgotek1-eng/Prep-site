/**
 * The channel a visitor starts on in step 3 of the calculator.
 *
 * WhatsApp is offered again (owner, 2026-11-10), as a HANDOFF rather
 * than an automated message. From 2026-09-16 the calculator was
 * email-only: sending a price over WhatsApp needs the Meta Business
 * API, which is paid and not connected, so a visitor who chose WhatsApp
 * typed their number into a form that could never deliver.
 *
 * What WhatsApp means now, and why it can always be honoured:
 *   1. The request is saved and the owner is emailed exactly as for
 *      email, through /api/pricing/whatsapp, with the visitor's number.
 *   2. The confirmation then offers a button that opens WhatsApp with
 *      the request typed out to Denis (lib/whatsapp/handoff.ts). The visitor
 *      presses Send; Denis replies there with the price.
 * If the Meta API is ever connected, the server reports the price as
 * "sent" and the calculator says so instead of offering the handoff.
 * No build-time flag is needed for either case. Connecting Meta DOES
 * need a /privacy update, though: it would make Meta a processor of the
 * visitor's number, which that page does not say today.
 *
 * WhatsApp first because that is where the team answers fastest; email
 * stays one tap away.
 */
export const DEFAULT_PRICING_CHANNEL: "whatsapp" | "email" = "whatsapp";
