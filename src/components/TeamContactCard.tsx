import Image from "next/image";
import { Phone } from "lucide-react";
import { WhatsAppIcon } from "@/components/SocialIcons";
import type { TeamMember } from "@/lib/team";
import { siteConfig } from "@/lib/site";

/**
 * Compact contact card shown inside the phone/contact modal once a real,
 * owner-approved employee photo exists (see src/lib/team.ts). Call still
 * uses tel:, WhatsApp still uses wa.me — the card adds a face, it never
 * replaces the direct actions.
 */
export default function TeamContactCard({ member }: { member: TeamMember }) {
  return (
    <div>
      <div className="flex items-center gap-4">
        <Image
          src={member.photoUrl}
          alt={`${member.role}, Dockentra`}
          width={80}
          height={80}
          className="h-20 w-20 shrink-0 rounded-full object-cover shadow-sm"
        />
        <div>
          <p className="text-base font-semibold text-brand-navy">{member.name}</p>
          <p className="text-sm text-slate-600">{member.role}</p>
        </div>
      </div>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <a
          href={siteConfig.contact.phoneHref}
          className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-md bg-brand-navy px-6 text-base font-semibold text-white shadow-sm transition hover:bg-brand-navy-deep"
        >
          <Phone aria-hidden="true" className="h-5 w-5" />
          Call
        </a>
        <a
          href={siteConfig.social.whatsapp}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-md bg-brand-green px-6 text-base font-semibold text-white shadow-sm transition hover:bg-brand-green-dark"
        >
          <WhatsAppIcon aria-hidden="true" className="h-5 w-5" />
          WhatsApp
        </a>
      </div>
    </div>
  );
}
