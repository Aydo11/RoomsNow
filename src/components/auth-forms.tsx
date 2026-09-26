"use client";

import { useSearchParams } from "next/navigation";
import { useState, useActionState } from "react";
import Link from "next/link";
import { forgotPasswordAction, loginAction, registerAction, resendVerificationAction, resetPasswordAction } from "@/server/actions/auth";
import { Field, FormError, FormSuccess, SubmitButton } from "./ui";
import { ORG_TYPES } from "@/lib/taxonomy";

export function LoginForm({ googleEnabled = false }: { googleEnabled?: boolean }) {
  const params = useSearchParams();
  const [state, action] = useActionState(loginAction, { ok: false });

  return (
    <form action={action} className="mt-7 space-y-4">
      <input type="hidden" name="next" value={params.get("next") ?? ""} />
      <FormError message={state.errors?.form} />
      <Field label="Email" name="email" error={state.errors?.email}>
        <input id="email" name="email" type="email" autoComplete="email" required className="field" />
      </Field>
      <Field label="Password" name="password" error={state.errors?.password}>
        <input id="password" name="password" type="password" autoComplete="current-password" required className="field" />
      </Field>
      <SubmitButton className="btn-primary w-full" pendingLabel="Signing in…">Sign in</SubmitButton>
      <div className="flex items-center justify-between gap-3 text-[14px]">
        <Link href="/forgot-password" className="text-pine-dark hover:underline">Forgot password?</Link>
      </div>
      {googleEnabled && (
        <>
          <div className="flex items-center gap-3 text-[12px] text-ink-faint"><span className="h-px flex-1 bg-line" />or<span className="h-px flex-1 bg-line" /></div>
          <a href={`/api/auth/google?next=${encodeURIComponent(params.get("next") ?? "")}`} className="btn-secondary w-full">
            <GoogleMark /> Continue with Google
          </a>
        </>
      )}
    </form>
  );
}

function GoogleMark() {
  return <span aria-hidden="true" className="grid h-5 w-5 place-items-center rounded-full bg-white text-[14px] font-bold text-[#4285F4]">G</span>;
}

export function ForgotPasswordForm() {
  const [state, action] = useActionState(forgotPasswordAction, { ok: false });
  return (
    <form action={action} className="card mt-7 space-y-4 p-5 sm:p-6">
      <FormError message={state.errors?.form} />
      <FormSuccess message={state.ok ? state.message : undefined} />
      {!state.ok && (
        <>
          <Field label="Email" name="email" error={state.errors?.email}>
            <input id="email" name="email" type="email" autoComplete="email" required className="field" />
          </Field>
          <SubmitButton className="btn-primary w-full" pendingLabel="Sending…">Send reset link</SubmitButton>
        </>
      )}
    </form>
  );
}

export function ResendVerificationForm({ initialEmail = "" }: { initialEmail?: string }) {
  const [state, action] = useActionState(resendVerificationAction, { ok: false });
  return (
    <form action={action} className="mt-6 space-y-4">
      <FormError message={state.errors?.form} />
      <FormSuccess message={state.ok ? state.message : undefined} />
      <Field label="Email address" name="email" error={state.errors?.email}>
        <input id="verification-email" name="email" type="email" defaultValue={initialEmail} autoComplete="email" required className="field" />
      </Field>
      <SubmitButton className="btn-secondary w-full" pendingLabel="Sending…">Send a new verification link</SubmitButton>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action] = useActionState(resetPasswordAction, { ok: false });
  return (
    <form action={action} className="card mt-7 space-y-4 p-5 sm:p-6">
      <input type="hidden" name="token" value={token} />
      <FormError message={state.errors?.form} />
      <Field label="New password" name="password" hint="At least 8 characters, including a letter and number." error={state.errors?.password}>
        <input id="password" name="password" type="password" minLength={8} autoComplete="new-password" required className="field" />
      </Field>
      <Field label="Confirm new password" name="confirmPassword" error={state.errors?.confirmPassword}>
        <input id="confirmPassword" name="confirmPassword" type="password" minLength={8} autoComplete="new-password" required className="field" />
      </Field>
      <SubmitButton className="btn-primary w-full" pendingLabel="Updating…">Update password</SubmitButton>
    </form>
  );
}

const ACCOUNT_TYPES = [
  {
    value: "USER",
    title: "I'm looking for accommodation",
    body: "Search rooms, message providers and post what you need.",
  },
  {
    value: "PROVIDER",
    title: "I'm advertising accommodation",
    body: "List rooms, manage availability, receive requests and referrals.",
  },
  {
    value: "REFERRER",
    title: "I'm a professional referrer",
    body: "Refer people you support and track referrals to move-in.",
  },
  {
    value: "SERVICE_PROVIDER",
    title: "I offer services to housing providers",
    body: "Trades, cleaning, compliance, furniture and more. Advertise to paying accommodation providers.",
  },
] as const;

const ACQUISITION_SOURCES = [
  { value: "", label: "Prefer not to say" },
  { value: "SOCIAL_MEDIA", label: "Social media" },
  { value: "EMAIL", label: "Email" },
  { value: "SEARCH_ENGINE", label: "Search engine" },
  { value: "REFERRAL", label: "A referral or invite code" },
  { value: "WORD_OF_MOUTH", label: "Word of mouth" },
  { value: "PRESS", label: "Press or news" },
  { value: "OTHER", label: "Other" },
] as const;
const VALID_ACQUISITION_SOURCES = new Set<string>(ACQUISITION_SOURCES.map((s) => s.value).filter(Boolean));
/** Lets a campaign link use a friendly `?src=facebook` etc. instead of the raw enum value. */
const ACQUISITION_SOURCE_ALIASES: Record<string, string> = {
  facebook: "SOCIAL_MEDIA",
  instagram: "SOCIAL_MEDIA",
  linkedin: "SOCIAL_MEDIA",
  tiktok: "SOCIAL_MEDIA",
  twitter: "SOCIAL_MEDIA",
  x: "SOCIAL_MEDIA",
  google: "SEARCH_ENGINE",
  bing: "SEARCH_ENGINE",
  mailshot: "EMAIL",
  newsletter: "EMAIL",
  referral: "REFERRAL",
  friend: "WORD_OF_MOUTH",
  "word-of-mouth": "WORD_OF_MOUTH",
  press: "PRESS",
  news: "PRESS",
};
/** `?src=` from a campaign link, resolved to a valid enum value — falls back to
 * REFERRAL when an invite code is present but no source was tagged, otherwise blank. */
function resolveAcquisitionSource(raw: string | null, hasReferralCode: boolean): string {
  const key = (raw ?? "").trim().toLowerCase();
  if (!key) return hasReferralCode ? "REFERRAL" : "";
  const upper = key.toUpperCase();
  if (VALID_ACQUISITION_SOURCES.has(upper)) return upper;
  return ACQUISITION_SOURCE_ALIASES[key] ?? "";
}

export function RegisterForm() {
  const params = useSearchParams();
  type AccountType = (typeof ACCOUNT_TYPES)[number]["value"];
  const requested = params.get("type");
  const initial: AccountType = ACCOUNT_TYPES.some((option) => option.value === requested) ? (requested as AccountType) : "USER";
  const [type, setType] = useState<AccountType>(initial);
  const referralCodeFromLink = params.get("ref") ?? "";
  const acquisitionSourceFromLink = resolveAcquisitionSource(params.get("src"), Boolean(referralCodeFromLink));
  const [state, action] = useActionState(registerAction, { ok: false });

  return (
    <form action={action} className="mt-8 space-y-6">
      <fieldset>
        <legend className="label">What kind of account do you need?</legend>
        <div className="grid gap-2.5">
          {ACCOUNT_TYPES.map((option) => (
            <label
              key={option.value}
              className={`flex cursor-pointer gap-3 rounded-card border p-4 ${
                type === option.value ? "border-pine bg-pine-light/40" : "border-line bg-white hover:border-line-strong"
              }`}
            >
              <input
                type="radio"
                name="accountType"
                value={option.value}
                checked={type === option.value}
                onChange={() => setType(option.value)}
                className="mt-1 h-4 w-4 border-line-strong text-pine focus:ring-pine"
              />
              <span>
                <span className="block text-[16px] text-ink">{option.title}</span>
                <span className="mt-0.5 block text-[14px] text-ink-soft">{option.body}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <FormError message={state.errors?.form} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="First name" name="firstName" required error={state.errors?.firstName}>
          <input id="firstName" name="firstName" required autoComplete="given-name" className="field" />
        </Field>
        <Field label="Last name" name="lastName" required error={state.errors?.lastName}>
          <input id="lastName" name="lastName" required autoComplete="family-name" className="field" />
        </Field>
        <Field label="Email" name="email" required error={state.errors?.email}>
          <input id="email" name="email" type="email" required autoComplete="email" className="field" />
        </Field>
        <Field label="Mobile number" name="phone" hint="Optional" error={state.errors?.phone}>
          <input id="phone" name="phone" type="tel" autoComplete="tel" className="field" />
        </Field>
        <Field
          label="Password"
          name="password"
          required
          hint="At least 8 characters, including a letter and number."
          error={state.errors?.password}
        >
          <input id="password" name="password" type="password" required autoComplete="new-password" className="field" />
        </Field>
        <Field label={type === "PROVIDER" || type === "SERVICE_PROVIDER" ? "Your location" : "Where are you looking?"} name="locationLabel" error={state.errors?.locationLabel}>
          <input id="locationLabel" name="locationLabel" placeholder="Birmingham" className="field" />
        </Field>
        <Field label="How did you hear about us?" name="acquisitionSource" hint="Optional" error={state.errors?.acquisitionSource}>
          <select id="acquisitionSource" name="acquisitionSource" defaultValue={acquisitionSourceFromLink} className="field">
            {ACQUISITION_SOURCES.map((source) => (
              <option key={source.value} value={source.value}>{source.label}</option>
            ))}
          </select>
        </Field>
      </div>

      {type === "USER" && (
        <Field label="Preferred way to be contacted" name="contactMethod">
          <select id="contactMethod" name="contactMethod" className="field">
            <option value="MESSAGE">Messages on the platform</option>
            <option value="EMAIL">Email</option>
            <option value="PHONE">Phone</option>
          </select>
        </Field>
      )}

      {type === "PROVIDER" && (
        <div className="grid gap-4 rounded-card border border-line bg-white p-5 sm:grid-cols-2">
          <h2 className="text-[18px] sm:col-span-2">Your organisation</h2>
          <Field label="Organisation name" name="companyName" required error={state.errors?.companyName}>
            <input id="companyName" name="companyName" className="field" />
          </Field>
          <Field label="Organisation type" name="orgType">
            <select id="orgType" name="orgType" className="field">
              {Object.entries(ORG_TYPES).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </Field>
          <Field label="Main operating town or city" name="companyCity">
            <input id="companyCity" name="companyCity" className="field" />
          </Field>
          <p className="text-[13px] leading-relaxed text-ink-faint sm:col-span-2">
            You&apos;ll add registration numbers, addresses and verification documents from your
            dashboard. Verification is reviewed manually by our team.
          </p>
          <Field
            label="Invite code"
            name="referralCode"
            hint="Optional — from another provider's invite link"
            error={state.errors?.referralCode}
          >
            <input
              id="referralCode"
              name="referralCode"
              defaultValue={referralCodeFromLink}
              className="field uppercase"
              autoCapitalize="characters"
            />
          </Field>
        </div>
      )}

      {type === "SERVICE_PROVIDER" && (
        <div className="grid gap-4 rounded-card border border-line bg-white p-5 sm:grid-cols-2">
          <h2 className="text-[18px] sm:col-span-2">Your business</h2>
          <Field label="Business name" name="companyName" required error={state.errors?.companyName}>
            <input id="companyName" name="companyName" autoComplete="organization" className="field" />
          </Field>
          <Field label="Main town or city you work in" name="companyCity">
            <input id="companyCity" name="companyCity" placeholder="Walsall" className="field" />
          </Field>
          <p className="text-[13px] leading-relaxed text-ink-faint sm:col-span-2">
            Next you&apos;ll add your services, areas and insurance. Our team checks every business before its adverts are shown, and only
            accommodation providers on a paid RoomsNow membership can see and contact you.
          </p>
        </div>
      )}

      {type === "REFERRER" && (
        <div className="grid gap-4 rounded-card border border-line bg-white p-5 sm:grid-cols-2">
          <h2 className="text-[18px] sm:col-span-2">Your organisation</h2>
          <Field label="Organisation" name="organisation" error={state.errors?.organisation}>
            <input id="organisation" name="organisation" placeholder="Birmingham City Council" className="field" />
          </Field>
          <Field label="Job title" name="jobTitle">
            <input id="jobTitle" name="jobTitle" placeholder="Housing support worker" className="field" />
          </Field>
        </div>
      )}

      <label className="flex items-start gap-3">
        <input type="checkbox" name="terms" required className="mt-1 h-4 w-4 rounded border-line-strong text-pine focus:ring-pine" />
        <span className="text-[15px] leading-relaxed text-ink-soft">
          I agree to the <Link href="/terms" target="_blank" className="font-medium text-pine-dark underline underline-offset-2">terms of use</Link> and confirm I have read the <Link href="/privacy" target="_blank" className="font-medium text-pine-dark underline underline-offset-2">privacy notice</Link>.
        </span>
      </label>
      {state.errors?.terms && <p className="text-[13px] text-clay">{state.errors.terms}</p>}

      <SubmitButton className="btn-primary w-full" pendingLabel="Creating your account…">
        Create account
      </SubmitButton>
    </form>
  );
}
