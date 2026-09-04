"use client";

import Link from "next/link";
import { FileText, Handshake, Mail, UserPlus } from "lucide-react";
import Modal from "@/components/Modal";
import { WhatsAppIcon } from "@/components/SocialIcons";
import { contactEmailHref, contactEmailLabel } from "@/lib/site-contact";
import { siteConfig } from "@/lib/site";

/**
 * HELP — "How can we help?"
 *
 * A signpost, not a form. Help used to host a whole enquiry form with
 * seventeen topics, which made it a second front door to conversations
 * that already have proper pages of their own. It now does one job:
 * put the five things a visitor actually wants one tap away, and get
 * out of the way.
 *
 * PRICING IS NOT IN HERE. The Calculator has its own floating button,
 * its own header CTA and its own hero action, and it stays separate —
 * folding it into Help would hide the site's main action inside a menu.
 *
 * The panel is a Modal, so it inherits the behaviour already
 * settled once: a centred panel on desktop that never fills the screen,
 * a full-height sheet on a phone, Escape to close, a focus trap, safe
 * areas top and bottom, and a body that scrolls rather than overflows.
 */
interface HelpAction {
  id: string;
  label: string;
  description: string;
  href: string;
  Icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" }>;
  external?: boolean;
}

const ACTIONS: readonly HelpAction[] = [
  {
    id: "become-a-client",
    label: "Become a Client",
    description: "Start using Dockentra fulfilment",
    href: "/become-a-client",
    Icon: UserPlus,
  },
  {
    id: "partnerships",
    label: "Partner with Dockentra",
    description: "Explore partnership opportunities",
    href: "/partnerships",
    Icon: Handshake,
  },
  {
    id: "quote",
    label: "Send an enquiry",
    description: "Ask us anything in writing",
    href: "/contact#enquiry",
    Icon: FileText,
  },
  {
    id: "whatsapp",
    label: "WhatsApp us",
    description: "Message us and we'll pick it up",
    href: siteConfig.social.whatsapp,
    Icon: WhatsAppIcon,
    external: true,
  },
  {
    id: "email",
    label: contactEmailLabel,
    description: "Send us the details in writing",
    href: contactEmailHref,
    Icon: Mail,
  },
];

export default function HelpPanel({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
  /**
   * Kept for callers that still pass it. The "#contact-enquiry opens
   * the Help panel" convention is gone: that hash matched no element
   * on /contact, it was the dead fallback five "Email us" links
   * pointed at, and a link labelled "Contact Support" that opened a
   * MENU is exactly the "I clicked and got something else" the audit
   * reported. Every one of those links now goes to the real form
   * anchor instead.
   */
  onOpenRequest?: () => void;
}) {
  const close = onClose;

  return (
    <Modal
      open={open}
      onClose={close}
      title="How can we help?"
      description="Pick the one that fits — every route reaches a person."
    >
      <ul className="space-y-2">
        {ACTIONS.map(({ id, label, description, href, Icon, external }) => {
          const body = (
            <>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-mint-soft text-brand-green-dark">
                <Icon aria-hidden="true" className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-base font-semibold text-brand-navy">
                  {label}
                </span>
                <span className="mt-0.5 block text-sm leading-5 text-slate-600">
                  {description}
                </span>
              </span>
              <span
                aria-hidden="true"
                className="shrink-0 text-slate-300 transition-colors group-hover:text-brand-green-dark"
              >
                &rarr;
              </span>
            </>
          );
          const className =
            "group flex min-h-16 w-full items-center gap-3 rounded-xl border border-brand-border bg-white p-3 text-left transition-colors hover:border-brand-green hover:bg-brand-mint-soft/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green focus-visible:ring-offset-2";

          return (
            <li key={id}>
              {external ? (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={close}
                  className={className}
                >
                  {body}
                </a>
              ) : (
                <Link href={href} onClick={close} className={className}>
                  {body}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </Modal>
  );
}
