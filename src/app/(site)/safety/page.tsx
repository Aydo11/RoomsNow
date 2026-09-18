import { ProsePage, Section } from "@/components/prose-page";
import { brand } from "@/brand.config";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Staying Safe When Renting a Room or HMO Placement",
  description: "Practical safety advice for anyone finding a room, HMO or supported accommodation placement: keeping messages on the platform, avoiding upfront fees and what a verified badge means.",
  path: "/safety",
});

export default function SafetyPage() {
  return (
    <ProsePage
      title="Staying safe"
      intro={`${brand.name} is a place to find accommodation, not a substitute for advice from someone who knows your situation. A few things worth knowing.`}
    >
      <Section heading="Keep conversations on the site">
        <p>
          Messages sent here are kept, so if something goes wrong there&apos;s a record. If someone
          pushes you to move to another app straight away, that&apos;s worth being careful about.
        </p>
      </Section>

      <Section heading="Never pay before you&apos;ve seen a place">
        <p>
          You shouldn&apos;t be asked for a deposit, a holding fee or an &ldquo;admin fee&rdquo;
          before you have viewed the accommodation and been offered a place in writing. Anyone
          asking for money by bank transfer to hold a room you haven&apos;t seen is a warning sign.
        </p>
      </Section>

      <Section heading="What a verified badge means">
        <p>
          A verified badge means our team has manually checked documents the provider sent us to
          confirm who they are. It is not a regulatory registration, an inspection, or a judgement
          about the quality of care or support. Providers without a badge aren&apos;t necessarily
          worse — many simply haven&apos;t applied.
        </p>
      </Section>

      <Section heading="Take someone with you">
        <p>
          If you can, bring a support worker, family member or friend to a viewing, and tell someone
          where you&apos;re going and when you expect to be back.
        </p>
      </Section>

      <Section heading="Report anything that feels wrong">
        <p>
          Every advert and profile has a report link. Reports go to our team, and you can report
          anonymously to the provider concerned — they aren&apos;t told who flagged them.
        </p>
      </Section>

      <Section heading="If you&apos;re at risk right now">
        <p>
          This site can&apos;t help in an emergency. In the UK, call 999 if you&apos;re in immediate
          danger. If you&apos;re homeless tonight, contact your local council&apos;s housing options
          team, or Shelter&apos;s free helpline on 0808 800 4444.
        </p>
      </Section>
    </ProsePage>
  );
}
