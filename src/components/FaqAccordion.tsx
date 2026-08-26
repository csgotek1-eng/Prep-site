"use client";

import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { FaqItem } from "@/lib/faq";

/**
 * Accessible disclosure list. Each question is a real <button> with
 * aria-expanded/aria-controls; answers are plain content, not hidden
 * from assistive tech behind display:none tricks that also hide from
 * find-in-page — multiple items may be open at once.
 */
export default function FaqAccordion({ items }: { items: FaqItem[] }) {
  const [open, setOpen] = useState<Set<number>>(new Set());
  // The FAQ page renders one accordion per category, so a plain index
  // would repeat ids across instances and leave aria-controls pointing
  // at an ambiguous target.
  const instanceId = useId();

  function toggle(index: number) {
    setOpen((current) => {
      const next = new Set(current);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }

  return (
    <ul className="divide-y divide-brand-border rounded-xl border border-brand-border bg-white">
      {items.map((item, index) => {
        const expanded = open.has(index);
        const panelId = `faq-panel-${instanceId}-${index}`;
        const buttonId = `faq-button-${instanceId}-${index}`;
        return (
          <li key={item.question}>
            <h3>
              <button
                type="button"
                id={buttonId}
                aria-expanded={expanded}
                aria-controls={panelId}
                onClick={() => toggle(index)}
                className="flex min-h-14 w-full items-center justify-between gap-4 px-5 py-4 text-left text-base font-semibold text-brand-navy transition-colors hover:bg-brand-surface-soft"
              >
                {item.question}
                <ChevronDown
                  aria-hidden="true"
                  className={`h-5 w-5 shrink-0 text-slate-500 transition-transform motion-safe:duration-200 ${
                    expanded ? "rotate-180" : ""
                  }`}
                />
              </button>
            </h3>
            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              hidden={!expanded}
              className="px-5 pb-5 text-sm leading-6 text-slate-600 sm:text-base sm:leading-7"
            >
              {item.answer}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
