"use client";
import { useActionState } from "react";

import { updateReferrerProfileAction } from "@/server/actions/referrer-profile";
import { AvatarDropzone } from "./avatar-dropzone";
import { SocialLinksField, type SocialLink } from "./social-links-field";
import { Field, FormError, FormSuccess, SubmitButton } from "./ui";

export function ReferrerProfileForm({
  user,
}: {
  user: {
    firstName: string;
    lastName: string;
    phone: string;
    locationLabel: string;
    organisation: string;
    jobTitle: string;
    avatarUrl: string | null;
    socialLinks: SocialLink[];
  };
}) {
  const [state, action] = useActionState(updateReferrerProfileAction, { ok: false });
  const initials = `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`.toUpperCase();

  return (
    <form action={action} className="space-y-6">
      <FormError message={state.errors?.form} />
      <FormSuccess message={state.ok ? state.message : undefined} />

      <section className="card space-y-4 p-6">
        <h2 className="text-[20px]">About you</h2>
        <AvatarDropzone
          id="avatar"
          name="avatar"
          initialPreview={user.avatarUrl}
          fallback={initials || "?"}
          error={state.errors?.avatar}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="First name" name="firstName" error={state.errors?.firstName}>
            <input id="firstName" name="firstName" defaultValue={user.firstName} className="field" />
          </Field>
          <Field label="Last name" name="lastName" error={state.errors?.lastName}>
            <input id="lastName" name="lastName" defaultValue={user.lastName} className="field" />
          </Field>
          <Field label="Organisation" name="organisation" error={state.errors?.organisation}>
            <input id="organisation" name="organisation" defaultValue={user.organisation} className="field" />
          </Field>
          <Field label="Job title" name="jobTitle" error={state.errors?.jobTitle}>
            <input id="jobTitle" name="jobTitle" defaultValue={user.jobTitle} className="field" />
          </Field>
          <Field label="Phone" name="phone" error={state.errors?.phone}>
            <input id="phone" name="phone" defaultValue={user.phone} className="field" />
          </Field>
          <Field label="Location" name="locationLabel" error={state.errors?.locationLabel}>
            <input id="locationLabel" name="locationLabel" defaultValue={user.locationLabel} className="field" />
          </Field>
        </div>
      </section>

      <section className="card space-y-3 p-6">
        <h2 className="text-[20px]">Social media</h2>
        <p className="text-[15px] leading-relaxed text-ink-soft">
          Optional. Shown to providers and clients you work with on RoomsNow.
        </p>
        <SocialLinksField initial={user.socialLinks} error={state.errors?.socialUrl} />
      </section>

      <SubmitButton pendingLabel="Saving…">Save profile</SubmitButton>
    </form>
  );
}
