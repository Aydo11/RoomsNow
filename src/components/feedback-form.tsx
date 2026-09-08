"use client";

import { useActionState } from "react";
import { createFeedbackAction } from "@/server/actions/feedback";
import { Field, FormError, FormSuccess, SubmitButton } from "./ui";

export function FeedbackForm() {
  const [state, action] = useActionState(createFeedbackAction, { ok: false });
  return (
    <form action={action} className="card space-y-4 p-5 sm:p-6">
      <FormError message={state.errors?.form} />
      <FormSuccess message={state.ok ? state.message : undefined} />
      {!state.ok && <>
        <Field label="What is this about?" name="category" error={state.errors?.category} required>
          <select id="category" name="category" className="field" defaultValue="EXPERIENCE">
            <option value="BUG">Something is not working</option>
            <option value="FEATURE">Feature suggestion</option>
            <option value="EXPERIENCE">Ease of use</option>
            <option value="CONTENT">Information or wording</option>
            <option value="OTHER">Something else</option>
          </select>
        </Field>
        <Field label="Short title" name="title" error={state.errors?.title} required><input id="title" name="title" className="field" maxLength={100} /></Field>
        <Field label="Your feedback" name="message" error={state.errors?.message} hint="Please avoid including personal or sensitive information." required><textarea id="message" name="message" rows={7} className="field" maxLength={3000} /></Field>
        <Field label="Page address (optional)" name="pageUrl" error={state.errors?.pageUrl} hint="Paste the RoomsNow page where you noticed this."><input id="pageUrl" name="pageUrl" type="url" className="field" placeholder="https://www.roomsnow.co.uk/..." /></Field>
        <SubmitButton pendingLabel="Sending feedback…">Send feedback</SubmitButton>
      </>}
    </form>
  );
}
