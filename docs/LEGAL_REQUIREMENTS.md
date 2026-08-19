# LEGAL / PRIVACY READINESS

Status: **INPUT REQUIRED — no legal pages exist yet, and none should be
published until the facts below are provided.** No legal text has been
invented; publishing incomplete or false legal statements is worse than
launching without the pages, so this stage documents requirements instead
of creating placeholder routes.

## Current state of the site (audited)

- No phone numbers, postal addresses, warehouse addresses, email
  addresses, company registration numbers or VAT numbers appear anywhere
  on the site — none have been invented.
- No client testimonials, client counts, trust badges or partnership
  claims exist.
- The quote form collects personal data (name, email, phone, business
  details, free-text message) and currently ships without a privacy
  notice — acceptable for a preview, but a privacy policy + a short
  notice at the form should exist before real marketing traffic.
- No analytics or marketing cookies are set (ANALYTICS: NOT CONFIGURED),
  so a cookie-consent banner is **not** currently required. This changes
  the moment any tracking pixel/analytics is added.

## Pages needed before/at launch

1. **Privacy Policy** (GDPR — Ireland/EU, priority: high because the
   quote form collects personal data)
2. **Website Terms of Use** (priority: medium)
3. **Cookie Policy** (priority: low while no non-essential cookies are
   set; required as soon as analytics/marketing tags are added)
4. **Privacy notice at the quote form** — one or two sentences linking to
   the Privacy Policy (added once the policy exists)

## Inputs required from the user (do not guess any of these)

- Legal entity name exactly as registered, and legal form (Ltd / sole
  trader / etc.)
- Registered address (and trading address if different)
- Company registration number (CRO) and VAT number, if applicable
- Contact email for privacy requests (and phone if it should be listed)
- Data-processing facts for the Privacy Policy:
  - where quote submissions are delivered/stored once webhook/email/CRM
    delivery is live (which providers, in which region)
  - how long submissions are retained
  - who has access
- Hosting disclosure: Vercel (and any future email/CRM provider) as data
  processors
- Whether a solicitor will review the drafts (recommended) or template
  text is acceptable

Once these inputs exist, the pages can be drafted, added to the footer
navigation, and included in the sitemap in a small follow-up stage.
