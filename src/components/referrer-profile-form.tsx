"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { updateReferrerProfileAction } from "@/server/actions/referrer-profile";
import { AvatarDropzone } from "./avatar-dropzone";
import { SocialLinksField, type SocialLink } from "./social-links-field";
import { CheckGroup, Field, FormError, FormSuccess, SubmitButton } from "./ui";
import { AGENCY_TYPES } from "@/lib/agency";
import { SUPPORT_TYPES } from "@/lib/taxonomy";

export type ReferrerProfileDefaults = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  locationLabel: string;
  organisation: string;
  jobTitle: string;
  avatarUrl: string | null;
  socialLinks: SocialLink[];
  agencyType: string;
  about: string;
  website: string;
  publicEmail: string;
  publicPhone: string;
  areasCovered: string[];
  specialisms: string[];
  bannerUrl: string | null;
  logoUrl: string | null;
};

export function ReferrerProfileForm({
  user,
  agencyLocked = false,
  inOrganisation = false,
}: {
  user: ReferrerProfileDefaults;
  /** A team member who isn't an owner/admin sees the shared agency details read-only. */
  agencyLocked?: boolean;
  /** The organisation name is managed on the Team page. */
  inOrganisation?: boolean;
}) {
  const [state, action] = useActionState(updateReferrerProfileAction, { ok: false });
  const [bannerPreview, setBannerPreview] = useState(user.bannerUrl);
  const initials = `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`.toUpperCase();
  const agencyInitials =
    (user.organisation || `${user.firstName} ${user.lastName}`)
      .split(/\s+/)
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase() ?? "")
      .join("") || "?";

  useEffect(() => {
    return () => {
      if (bannerPreview?.startsWith("blob:")) URL.revokeObjectURL(bannerPreview);
    };
  }, [bannerPreview]);

  return (
    <form action={action} className="space-y-6">
      <FormError message={state.errors?.form} />
      <FormSuccess message={state.ok ? state.message : undefined} />

      {agencyLocked && (
        <p className="rounded-[10px] border border-line bg-paper-sunk px-4 py-3 text-[14px] text-ink-soft">
          Your organisation&apos;s owners and admins manage the agency details below. You can update your own details further down.
        </p>
      )}
      <fieldset disabled={agencyLocked} className="m-0 min-w-0 border-0 p-0">
      <section className="card overflow-hidden">
        <div className="relative h-40 bg-gradient-to-br from-pine-dark via-pine to-pine-light sm:h-48">
          {bannerPreview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={bannerPreview} alt="Agency banner preview" className="h-full w-full object-cover" />
          )}
          {!agencyLocked && (
            <label htmlFor="banner" className="btn absolute bottom-3 right-3 cursor-pointer bg-white/95 text-pine-dark shadow-raise hover:bg-white">
              {bannerPreview ? "Change banner" : "Add a banner"}
            </label>
          )}
          <input
            id="banner"
            name="banner"
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              if (file) setBannerPreview(URL.createObjectURL(file));
            }}
          />
        </div>
        {state.errors?.banner && <p className="px-6 pt-2 text-[13px] text-clay" role="alert">{state.errors.banner}</p>}

        <div className="space-y-4 px-6 pb-6">
          <div className="relative -mt-10">
            <AvatarDropzone id="logo" name="logo" initialPreview={user.logoUrl} fallback={agencyInitials} error={state.errors?.logo} />
          </div>

          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-[20px]">Your agency</h2>
            <Link href={`/agencies/${user.id}`} className="text-[14px] text-pine-dark hover:underline">
              Preview how providers see it →
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Agency or organisation name"
              name="organisation"
              error={state.errors?.organisation}
              hint={inOrganisation ? "Rename your organisation from the Team page." : undefined}
            >
              <input id="organisation" name="organisation" defaultValue={user.organisation} readOnly={inOrganisation} className="field" />
            </Field>
            <Field label="Type of agency" name="agencyType" error={state.errors?.agencyType}>
              <select id="agencyType" name="agencyType" defaultValue={user.agencyType} className="field">
                <option value="">Choose…</option>
                {Object.entries(AGENCY_TYPES).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </Field>
            <Field label="Location" name="locationLabel" error={state.errors?.locationLabel}>
              <input id="locationLabel" name="locationLabel" defaultValue={user.locationLabel} className="field" placeholder="e.g. Birmingham" />
            </Field>
            <Field label="Website" name="website" error={state.errors?.website}>
              <input id="website" name="website" type="url" defaultValue={user.website} className="field" placeholder="https://" />
            </Field>
            <Field label="Contact email for providers" name="publicEmail" error={state.errors?.publicEmail}>
              <input id="publicEmail" name="publicEmail" type="email" defaultValue={user.publicEmail} className="field" />
            </Field>
            <Field label="Contact phone for providers" name="publicPhone" error={state.errors?.publicPhone}>
              <input id="publicPhone" name="publicPhone" defaultValue={user.publicPhone} className="field" />
            </Field>
          </div>

          <Field label="About your agency" name="about" error={state.errors?.about}>
            <textarea
              id="about"
              name="about"
              rows={5}
              defaultValue={user.about}
              className="field"
              placeholder="Who you support, how you work with providers, and what a good placement looks like for you."
            />
          </Field>

          <Field label="Areas you cover" name="areasCovered" error={state.errors?.areasCovered}>
            <input
              id="areasCovered"
              name="areasCovered"
              defaultValue={user.areasCovered.join(", ")}
              className="field"
              placeholder="Birmingham, Solihull, Sandwell"
            />
          </Field>
          <p className="-mt-2 text-[12.5px] text-ink-faint">Separate areas with commas.</p>

          <Field label="Who you mainly refer" name="specialisms">
            <CheckGroup
              name="specialisms"
              selected={user.specialisms}
              options={SUPPORT_TYPES.map((t) => ({ value: t.slug, label: t.label }))}
              columns={3}
            />
          </Field>
        </div>
      </section>
      </fieldset>

      <section className="card space-y-4 p-6">
        <h2 className="text-[20px]">About you</h2>
        <AvatarDropzone id="avatar" name="avatar" initialPreview={user.avatarUrl} fallback={initials || "?"} error={state.errors?.avatar} />

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="First name" name="firstName" error={state.errors?.firstName}>
            <input id="firstName" name="firstName" defaultValue={user.firstName} className="field" />
          </Field>
          <Field label="Last name" name="lastName" error={state.errors?.lastName}>
            <input id="lastName" name="lastName" defaultValue={user.lastName} className="field" />
          </Field>
          <Field label="Job title" name="jobTitle" error={state.errors?.jobTitle}>
            <input id="jobTitle" name="jobTitle" defaultValue={user.jobTitle} className="field" />
          </Field>
          <Field label="Your phone" name="phone" error={state.errors?.phone}>
            <input id="phone" name="phone" defaultValue={user.phone} className="field" />
          </Field>
        </div>
      </section>

      <section className="card space-y-3 p-6">
        <h2 className="text-[20px]">Social media</h2>
        <p className="text-[15px] leading-relaxed text-ink-soft">
          Optional. Shown on your agency profile to providers you work with on RoomsNow.
        </p>
        <SocialLinksField initial={user.socialLinks} error={state.errors?.socialUrl} />
      </section>

      <SubmitButton pendingLabel="Saving…">Save profile</SubmitButton>
    </form>
  );
}
