import QRCode from "qrcode";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/rbac";
import { generateTotpSecret, openTotpSecret, otpauthUrl, sealTotpSecret } from "@/lib/totp";
import { TwoStepDisableForm, TwoStepSetupForm } from "@/components/two-step-forms";

export const metadata = { title: "Two-step login", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function TwoStepPage({ searchParams }: { searchParams: Promise<{ required?: string }> }) {
  const user = await requireUser("/security/two-step");
  const { required } = await searchParams;
  const isAdmin = user.role === "ADMIN";

  if (user.totpEnabledAt) {
    return (
      <div className="shell max-w-xl py-14">
        <h1 className="text-[30px]">Two-step login is on</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">
          When you sign in we ask for the 6-digit code from your authenticator app. Lost your phone? Use one of the recovery codes you saved.
        </p>
        {isAdmin ? (
          <p className="mt-5 rounded-[10px] border border-line bg-paper-sunk p-4 text-[14px] text-ink-soft">
            Two-step login is required for admin accounts. If you lose your phone and your recovery codes, ask another admin to reset it.
          </p>
        ) : (
          <TwoStepDisableForm />
        )}
      </div>
    );
  }

  // A secret waiting to be confirmed; made once and reused until confirmed.
  let secret = user.totpSecret ? openTotpSecret(user.totpSecret) : null;
  if (!secret) {
    secret = generateTotpSecret();
    await db.user.update({ where: { id: user.id }, data: { totpSecret: sealTotpSecret(secret) } });
  }
  const qr = await QRCode.toDataURL(otpauthUrl(secret, user.email), { margin: 1, width: 220 });

  return (
    <div className="shell max-w-xl py-14">
      <h1 className="text-[30px]">Set up two-step login</h1>
      {(required || isAdmin) && (
        <p className="mt-4 rounded-[10px] border border-pine/25 bg-pine-light/40 p-4 text-[14px] text-ink">
          Admin accounts can see sensitive information, so two-step login is required before you can use the admin area.
        </p>
      )}
      <ol className="mt-6 list-decimal space-y-4 pl-5 text-[15px] leading-relaxed">
        <li>Install an authenticator app on your phone, such as Google Authenticator, Microsoft Authenticator or 1Password.</li>
        <li>
          In the app, add an account and scan this code.
          <span className="mt-3 block w-fit rounded-[12px] bg-white p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr} alt="QR code for your authenticator app" width={220} height={220} />
          </span>
          <span className="mt-3 block text-[13px] text-ink-soft">
            Can&apos;t scan it? Enter this key instead:{" "}
            <code className="select-all break-all rounded bg-paper-sunk px-1.5 py-0.5 font-mono text-ink">{secret.match(/.{1,4}/g)?.join(" ")}</code>
          </span>
        </li>
        <li>Type the 6-digit code the app shows to finish.</li>
      </ol>
      <TwoStepSetupForm />
    </div>
  );
}
