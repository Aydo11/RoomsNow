import Link from "next/link";
import { VoidCalculator } from "@/components/void-calculator";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Void Cost Calculator for HMO & Supported Housing Providers",
  description: "Work out what empty rooms are costing you in lost rent and bills each week, month and year, then list them free on RoomsNow.",
  path: "/void-cost-calculator",
});

export default function VoidCostCalculatorPage() {
  return (
    <main className="shell py-10 sm:py-14">
      <span className="eyebrow">For accommodation providers</span>
      <h1 className="mt-3 max-w-[24ch] text-[32px] leading-tight sm:text-[46px]">How much are your empty rooms costing you?</h1>
      <p className="mb-8 mt-4 max-w-[66ch] text-[17px] leading-relaxed text-ink-soft">
        Every week a room sits empty you lose the rent and still pay the bills. Put in your numbers to see the real cost of your voids.
      </p>
      <VoidCalculator />
      <p className="mt-6 text-[13px] text-ink-faint">
        An estimate only, using the figures you enter. Already listed? <Link href="/provider" className="font-semibold text-pine-dark underline">See your live void cost on your dashboard</Link>.
      </p>
    </main>
  );
}
