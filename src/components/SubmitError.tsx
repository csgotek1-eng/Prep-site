import { siteContact } from "@/lib/site-contact";

/**
 * The message a visitor sees when a form submission fails.
 *
 * WHY THIS EXISTS. Capturing enquiries is the only job this site has,
 * and the failure path is where that job is lost. The forms already
 * behave correctly on failure — no false confirmation, the typed text
 * is kept, the button re-enables, and the message is announced through
 * role="alert". What they said was "Something went wrong. Please try
 * again." During an outage that is advice which fails again, and the
 * visitor is left with no way through.
 *
 * So when the failure is OURS — a 5xx, or a request that never reached
 * the server at all — the alert also offers the channel that does not
 * depend on this site being up. WhatsApp and the phone number are the
 * two contact routes that are always configured (the email address is
 * deliberately null until the owner supplies one), so they are what is
 * offered here.
 *
 * A validation failure is not offered a fallback: "please enter a
 * valid email" needs correcting, not a different channel.
 */
export default function SubmitError({
  message,
  /** True only when the failure is ours: a 5xx, or the request never landed. */
  showFallback,
  className,
}: {
  message: string;
  showFallback: boolean;
  className: string;
}) {
  return (
    <p role="alert" className={className}>
      {message}
      {showFallback ? (
        <>
          {" "}
          You can also{" "}
          <a
            href={siteContact.whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold underline underline-offset-2"
          >
            message us on WhatsApp
          </a>{" "}
          or call{" "}
          <a href={siteContact.phoneHref} className="font-semibold underline underline-offset-2">
            {siteContact.phone}
          </a>
          {" — nothing you typed is lost."}
        </>
      ) : null}
    </p>
  );
}
