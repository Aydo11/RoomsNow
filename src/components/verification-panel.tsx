import { shortDate } from "@/lib/format";
import { brand } from "@/brand.config";

type CheckField =
  | "registrationChecked"
  | "insuranceChecked"
  | "governanceChecked"
  | "safeguardingChecked"
  | "identityChecked";

const PUBLIC_CHECKS: { field: CheckField; label: string }[] = [
  { field: "registrationChecked", label: "Registration & legal status" },
  { field: "insuranceChecked", label: "Insurance cover" },
  { field: "governanceChecked", label: "Organisation & governance" },
  { field: "safeguardingChecked", label: "Safeguarding policy" },
  { field: "identityChecked", label: "Identity checks" },
];

export type VerificationPanelDetail = {
  insuranceExpiresAt: Date | null;
  registrationChecked: boolean;
  insuranceChecked: boolean;
  governanceChecked: boolean;
  safeguardingChecked: boolean;
  identityChecked: boolean;
};

/**
 * Public-facing due-diligence summary shown on an approved provider's
 * profile. Mirrors the checklist an admin completes in /admin/verification,
 * so a referrer can see *what* was checked rather than just a badge — this
 * is what a case worker needs to justify the choice to a manager.
 */
export function VerificationPanel({
  verifiedAt,
  detail,
}: {
  verifiedAt: Date | null;
  detail: VerificationPanelDetail | null;
}) {
  const checks = PUBLIC_CHECKS.filter((item) => detail?.[item.field]);

  return (
    <section className="mt-5 rounded-[14px] border border-line bg-paper p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-[16px] font-semibold text-ink">What RoomsNow has checked</h2>
        {verifiedAt && <span className="text-[12px] text-ink-faint">Verified since {shortDate(verifiedAt)}</span>}
      </div>
      <p className="mt-2 max-w-[62ch] text-[12.5px] leading-relaxed text-ink-soft">{brand.trustNote}</p>

      {checks.length > 0 && (
        <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {checks.map((item) => (
            <li
              key={item.field}
              className="flex items-center gap-2 rounded-[10px] border border-line bg-white px-3 py-2 text-[13px] text-ink"
            >
              <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0 text-pine-dark" aria-hidden="true" fill="currentColor">
                <path d="M13.7 3.7a1 1 0 0 1 0 1.4l-6.5 6.5a1 1 0 0 1-1.4 0L2.3 8.1a1 1 0 1 1 1.4-1.4l2.8 2.8 5.8-5.8a1 1 0 0 1 1.4 0Z" />
              </svg>
              {item.label}
            </li>
          ))}
        </ul>
      )}

      {detail?.insuranceExpiresAt && (
        <p className="mt-3 text-[12px] text-ink-faint">Insurance cover confirmed to {shortDate(detail.insuranceExpiresAt)}.</p>
      )}
    </section>
  );
}
