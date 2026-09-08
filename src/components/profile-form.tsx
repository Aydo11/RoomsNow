"use client";
import { useActionState, useEffect, useState } from "react";

import { updateProfileAction } from "@/server/actions/profile";
import { CheckGroup, Field, FormError, FormSuccess, SubmitButton, Toggle } from "./ui";
import { ACCOMMODATION_TYPES, GENDER_ARRANGEMENTS, SUPPORT_TYPES } from "@/lib/taxonomy";

export function ProfileForm({
  user,
  profile,
}: {
  user: { firstName: string; lastName: string; locationLabel: string };
  profile: {
    photoUrl: string | null;
    about: string;
    accommodationNeeds: string;
    supportNeeds: string;
    accessibilityNeeds: string;
    otherRequirements: string;
    preferredLocations: string[];
    preferredTypes: string[];
    supportTypes: string[];
    genderArrangement: string;
    dateOfBirth: string;
    availableFrom: string;
    publicProfile: boolean;
    showPhoto: boolean;
    showAge: boolean;
    showLocation: boolean;
    discoverable: boolean;
  };
}) {
  const [state, action] = useActionState(updateProfileAction, { ok: false });
  const [photoPreview, setPhotoPreview] = useState(profile.photoUrl);

  useEffect(() => {
    return () => {
      if (photoPreview?.startsWith("blob:")) URL.revokeObjectURL(photoPreview);
    };
  }, [photoPreview]);

  return (
    <form action={action} className="space-y-6">
      <FormError message={state.errors?.form} />
      <FormSuccess message={state.ok ? state.message : undefined} />

      <section className="card space-y-4 p-6">
        <h2 className="text-[20px]">About you</h2>
        <div className="flex items-center gap-4">
          {photoPreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoPreview} alt="Profile picture preview" className="h-24 w-24 rounded-full border-4 border-white object-cover shadow-raise" />
          ) : (
            <span className="grid h-24 w-24 place-items-center rounded-full bg-paper-sunk text-[13px] text-ink-faint">
              No photo
            </span>
          )}
          <div className="flex-1">
            <Field label="Profile photo" name="photo" hint="Optional." error={state.errors?.photo}>
              <input
                id="photo"
                name="photo"
                type="file"
                accept="image/*"
                className="field"
                onChange={(event) => {
                  const file = event.currentTarget.files?.[0];
                  if (file) setPhotoPreview(URL.createObjectURL(file));
                }}
              />
            </Field>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="First name" name="firstName">
            <input id="firstName" name="firstName" defaultValue={user.firstName} className="field" />
          </Field>
          <Field label="Last name" name="lastName">
            <input id="lastName" name="lastName" defaultValue={user.lastName} className="field" />
          </Field>
          <Field label="Where you are now" name="locationLabel">
            <input id="locationLabel" name="locationLabel" defaultValue={user.locationLabel} className="field" />
          </Field>
          <Field label="Date of birth" name="dateOfBirth" hint="Used for age criteria only.">
            <input id="dateOfBirth" name="dateOfBirth" type="date" defaultValue={profile.dateOfBirth} className="field" />
          </Field>
        </div>

        <Field label="About me" name="about">
          <textarea id="about" name="about" rows={5} defaultValue={profile.about} className="field" />
        </Field>
      </section>

      <section className="card space-y-4 p-6">
        <h2 className="text-[20px]">What you need</h2>
        <Field label="Accommodation requirements" name="accommodationNeeds">
          <textarea id="accommodationNeeds" name="accommodationNeeds" rows={4} defaultValue={profile.accommodationNeeds} className="field" />
        </Field>
        <Field label="Support requirements" name="supportNeeds">
          <textarea id="supportNeeds" name="supportNeeds" rows={4} defaultValue={profile.supportNeeds} className="field" />
        </Field>
        <Field label="Support categories" name="supportTypes">
          <CheckGroup
            name="supportTypes"
            selected={profile.supportTypes}
            options={SUPPORT_TYPES.map((t) => ({ value: t.slug, label: t.label }))}
            columns={3}
          />
        </Field>
        <Field label="Preferred accommodation" name="preferredTypes">
          <CheckGroup
            name="preferredTypes"
            selected={profile.preferredTypes}
            options={Object.entries(ACCOMMODATION_TYPES).map(([value, label]) => ({ value, label }))}
            columns={3}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Preferred locations" name="preferredLocations" hint="Separate with commas.">
            <input
              id="preferredLocations"
              name="preferredLocations"
              defaultValue={profile.preferredLocations.join(", ")}
              className="field"
            />
          </Field>
          <Field label="Household preference" name="genderArrangement">
            <select id="genderArrangement" name="genderArrangement" defaultValue={profile.genderArrangement} className="field">
              {Object.entries(GENDER_ARRANGEMENTS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </Field>
          <Field label="Available from" name="availableFrom">
            <input id="availableFrom" name="availableFrom" type="date" defaultValue={profile.availableFrom} className="field" />
          </Field>
          <Field label="Access needs" name="accessibilityNeeds">
            <input id="accessibilityNeeds" name="accessibilityNeeds" defaultValue={profile.accessibilityNeeds} className="field" />
          </Field>
        </div>
        <Field label="Anything else" name="otherRequirements">
          <textarea id="otherRequirements" name="otherRequirements" rows={3} defaultValue={profile.otherRequirements} className="field" />
        </Field>
      </section>

      <section className="card space-y-3 p-6">
        <h2 className="text-[20px]">What other people can see</h2>
        <p className="text-[15px] leading-relaxed text-ink-soft">
          Nothing here is public unless you switch it on. Providers never see your date of birth,
          phone number or email.
        </p>
        <Toggle
          name="discoverable"
          label="Let providers find me"
          description="Your advert appears in the provider people search."
          defaultChecked={profile.discoverable}
        />
        <Toggle name="publicProfile" label="Show my profile publicly" defaultChecked={profile.publicProfile} />
        <Toggle name="showPhoto" label="Show my photo" defaultChecked={profile.showPhoto} />
        <Toggle name="showAge" label="Show my age" defaultChecked={profile.showAge} />
        <Toggle name="showLocation" label="Show the area I'm in" defaultChecked={profile.showLocation} />
      </section>

      <SubmitButton pendingLabel="Saving…">Save profile</SubmitButton>
    </form>
  );
}
