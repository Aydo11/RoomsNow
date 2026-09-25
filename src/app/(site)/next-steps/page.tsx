import Link from "next/link";
import { JsonLd, absoluteUrl, pageMetadata } from "@/lib/seo";
import { NextStepsGuide } from "@/components/next-steps-guide";
import { NEXT_STEP_IDS, NEXT_STEPS, type NextStepId } from "@/lib/next-steps";

export const metadata = pageMetadata({
  title: "What Happens After You Apply for Supported Housing",
  description:
    "Step by step: what happens after you ask for a room, how Housing Benefit pays the rent, what to bring on move-in day and your first week. In English, Urdu, Punjabi, Polish, Arabic and Romanian.",
  path: "/next-steps",
});

export default async function NextStepsPage({ searchParams }: { searchParams: Promise<{ step?: string }> }) {
  const { step } = await searchParams;
  const current = NEXT_STEP_IDS.includes(step as NextStepId) ? (step as NextStepId) : null;
  const en = NEXT_STEPS.en;

  return (
    <div className="bg-paper">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "HowTo",
          name: "What happens after you apply for supported housing",
          url: absoluteUrl("/next-steps"),
          step: en.steps.map((item, index) => ({
            "@type": "HowToStep",
            position: index + 1,
            name: item.title,
            text: item.points.join(" "),
          })),
        }}
      />
      <div className="shell max-w-[760px] py-8 sm:py-12">
        <NextStepsGuide current={current} />
        <div className="mt-8 flex flex-wrap gap-2">
          <Link href="/dashboard/requests" className="btn-secondary">
            Track my requests
          </Link>
          <Link href="/eligibility" className="btn-ghost">
            Am I eligible?
          </Link>
          <Link href="/search" className="btn-ghost">
            Search rooms
          </Link>
        </div>
      </div>
    </div>
  );
}
