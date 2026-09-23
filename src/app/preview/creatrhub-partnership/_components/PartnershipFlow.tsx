import { ArrowDown, ArrowRight } from "lucide-react";

/**
 * The joint journey as one chain: horizontal on desktop, vertical on
 * mobile. Stages belonging to each partner are tinted so the hand-over
 * from growth to fulfilment is visible at a glance.
 */
const STAGES: { label: string; owner: "brand" | "creatrhub" | "dockentra" | "carrier" | "customer" }[] = [
  { label: "Brand", owner: "brand" },
  { label: "CreatrHub", owner: "creatrhub" },
  { label: "Creators / Content", owner: "creatrhub" },
  { label: "Orders", owner: "brand" },
  { label: "Dockentra", owner: "dockentra" },
  { label: "Pick & Pack", owner: "dockentra" },
  { label: "Carrier", owner: "carrier" },
  { label: "Customer", owner: "customer" },
];

const TONE: Record<(typeof STAGES)[number]["owner"], string> = {
  brand: "border-brand-border bg-white text-brand-navy",
  creatrhub: "border-brand-navy/30 bg-brand-navy text-white",
  dockentra: "border-brand-green bg-brand-green text-white",
  carrier: "border-brand-border bg-white text-brand-navy",
  customer: "border-brand-mint bg-brand-mint-soft text-brand-green-dark",
};

export default function PartnershipFlow() {
  return (
    <ol className="flex flex-col items-stretch gap-2 lg:flex-row lg:items-center lg:gap-1.5">
      {STAGES.map((stage, index) => (
        <li key={stage.label} className="contents">
          <span
            className={`flex min-h-12 flex-1 items-center justify-center rounded-lg border px-3 py-2.5 text-center text-sm font-semibold shadow-sm lg:min-w-0 ${TONE[stage.owner]}`}
          >
            {stage.label}
          </span>
          {index < STAGES.length - 1 && (
            <span
              aria-hidden="true"
              className="flex shrink-0 items-center justify-center text-brand-teal"
            >
              <ArrowDown className="h-4 w-4 lg:hidden" />
              <ArrowRight className="hidden h-4 w-4 lg:block" />
            </span>
          )}
        </li>
      ))}
    </ol>
  );
}
