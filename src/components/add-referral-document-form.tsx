"use client";

import { useActionState } from "react";

import { addReferralDocumentAction } from "@/server/actions/referrals";
import { Dropzone } from "./dropzone";
import { FormError, FormSuccess, SubmitButton } from "./ui";
import type { FormState } from "@/lib/validation";

export function AddReferralDocumentForm({ referralId }: { referralId: string }) {
  const initialState: FormState = { ok: false };
  const [state, action] = useActionState(addReferralDocumentAction, initialState);

  return (
    <form action={action} className="mt-3 space-y-3">
      <input type="hidden" name="referralId" value={referralId} />
      <FormError message={state.errors?.form ?? state.errors?.documents} />
      <FormSuccess message={state.ok ? state.message : undefined} />
      <Dropzone name="documents" accept="application/pdf,image/*" hint="PDF or image, up to 15MB each" />
      <SubmitButton className="btn-secondary" pendingLabel="Uploading…">
        Add document
      </SubmitButton>
    </form>
  );
}
