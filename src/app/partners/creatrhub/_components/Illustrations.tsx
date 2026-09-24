/**
 * Line drawings for the CreatrHub partner page.
 *
 * WHY DRAWINGS, NOT PHOTOGRAPHS. Every still in public/media already
 * belongs to another page (one picture per subject, tested in
 * tests/media-assets.test.ts), this page is about CreatrHub's work
 * rather than our floor, and a stock "creator with ring light" or an
 * AI-made face would be exactly the fake proof the site refuses. So the
 * page draws the idea instead: a phone showing a clip, an order, a
 * carton. Strokes only, in the brand's navy, mint and green, no fills
 * beyond a tint and no gradients. The hero drawing shows from lg only;
 * below that the journey list says the same thing without pushing the
 * page down (design review, 2026-09-24).
 *
 * Decorative by contract: every drawing is aria-hidden and everything
 * it shows is also said in the text beside it.
 */

/** Hero: clip → order → carton, the whole partnership in one line. */
export function HeroFlowArt({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 420 300"
      className={className}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Phone with a clip playing */}
      <rect x="18" y="20" width="136" height="252" rx="20" stroke="rgba(255,255,255,0.45)" strokeWidth="2" />
      <rect x="30" y="40" width="112" height="176" rx="8" fill="rgba(134,231,174,0.08)" stroke="rgba(255,255,255,0.18)" />
      <path d="M76 108v40l32-20z" fill="#86e7ae" stroke="#86e7ae" strokeWidth="2" />
      {/* progress bar under the clip */}
      <path d="M36 204h100" stroke="rgba(255,255,255,0.2)" strokeWidth="3" />
      <path d="M36 204h58" stroke="#86e7ae" strokeWidth="3" />
      {/* caption lines */}
      <path d="M30 232h86M30 246h58" stroke="rgba(255,255,255,0.3)" strokeWidth="3" />
      <path d="M72 30h28" stroke="rgba(255,255,255,0.35)" strokeWidth="3" />

      {/* phone → order */}
      <path d="M164 146h40" stroke="#86e7ae" strokeWidth="2" strokeDasharray="4 6" />
      <path d="M198 140l7 6-7 6" stroke="#86e7ae" strokeWidth="2" />

      {/* Order slip */}
      <path d="M214 96h58v96l-7-5-7 5-7-5-7 5-7-5-7 5-7-5-9 5z" stroke="rgba(255,255,255,0.45)" strokeWidth="2" />
      <path d="M226 116h34M226 130h24M226 144h34M226 158h18" stroke="rgba(255,255,255,0.3)" strokeWidth="3" />

      {/* order → carton */}
      <path d="M282 146h32" stroke="#86e7ae" strokeWidth="2" strokeDasharray="4 6" />
      <path d="M308 140l7 6-7 6" stroke="#86e7ae" strokeWidth="2" />

      {/* Carton, front-on with a tape line */}
      <path d="M324 118l38-18 40 18v66l-40 18-38-18z" stroke="rgba(255,255,255,0.55)" strokeWidth="2" />
      <path d="M324 118l38 18 40-18M362 136v66" stroke="rgba(255,255,255,0.4)" strokeWidth="2" />
      <path d="M343 109l40 18" stroke="#86e7ae" strokeWidth="3" />

      {/* Labels */}
      <g fill="rgba(255,255,255,0.6)" fontFamily="var(--font-plex-mono), ui-monospace, monospace" fontSize="11" letterSpacing="1.2">
        <text x="86" y="292" textAnchor="middle">CONTENT</text>
        <text x="243" y="222" textAnchor="middle">ORDER</text>
        <text x="363" y="228" textAnchor="middle">DISPATCH</text>
      </g>
    </svg>
  );
}

/** A small carton, for the one journey step that is Dockentra's. */
export function CartonGlyph({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 7.5L12 3l9 4.5v9L12 21l-9-4.5z" />
      <path d="M3 7.5L12 12l9-4.5M12 12v9M7.5 5.25l9 4.5" />
    </svg>
  );
}

/** A check mark in the surrounding text colour, as on /services. */
export function CheckGlyph({ className = "text-brand-green" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 16 16"
      className={`mt-1.5 h-4 w-4 shrink-0 ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 8.5l3.2 3.2L13 5" />
    </svg>
  );
}
