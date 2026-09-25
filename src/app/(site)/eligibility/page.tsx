import { pageMetadata } from "@/lib/seo";
import { EligibilityCheck } from "@/components/eligibility-check";
import { smsEnabled } from "@/lib/room-alerts";

export const metadata = pageMetadata({
  title: "Am I Eligible? Find Supported Accommodation That Fits",
  description:
    "Answer five quick questions about where you want to live, your age, the support you need and how you'll pay rent, and see the rooms that fit you.",
  path: "/eligibility",
});

export default function EligibilityPage() {
  return (
    <div className="min-h-[calc(100dvh-4rem)] bg-paper">
      <div className="shell py-8 sm:py-12">
        <div className="mx-auto mb-6 max-w-[560px] text-center sm:mb-8">
          <span className="eyebrow">Takes about a minute</span>
          <h1 className="mt-3 text-[30px] font-bold leading-tight [text-wrap:balance] sm:text-[36px]">Am I eligible?</h1>
          <p className="mt-2 text-[16px] leading-relaxed text-ink-soft">
            Answer five quick questions and we&apos;ll show you the rooms that fit you.
          </p>
        </div>
        <EligibilityCheck smsEnabled={smsEnabled()} />
      </div>
    </div>
  );
}
