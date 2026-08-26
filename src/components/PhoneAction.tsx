"use client";

import { useState } from "react";
import { Phone } from "lucide-react";
import Modal from "@/components/Modal";
import TeamContactCard from "@/components/TeamContactCard";
import { teamMembers } from "@/lib/team";
import { siteConfig } from "@/lib/site";

/**
 * Phone contact action. Until the owner supplies a real, approved
 * employee photo (src/lib/team.ts), this renders EXACTLY the plain
 * tel: link it always has — least friction, one tap to call. Once a
 * photo exists, the same visible label/style instead opens a compact
 * card showing that person before the call, without removing the
 * ability to call directly (Call still uses tel:, WhatsApp still uses
 * wa.me, both inside the card).
 */
export default function PhoneAction({
  label,
  className,
  icon = <Phone aria-hidden="true" className="h-4 w-4 shrink-0" />,
}: {
  label: string;
  className: string;
  icon?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const member = teamMembers[0];

  if (!member) {
    return (
      <a href={siteConfig.contact.phoneHref} className={className}>
        {icon}
        {label}
      </a>
    );
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        {icon}
        {label}
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Talk to Dockentra">
        <TeamContactCard member={member} />
      </Modal>
    </>
  );
}
