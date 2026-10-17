"use client";
import { useActionState } from "react";
import { createTeamMember, resetTeamTwoStep, updateTeamMember } from "@/server/actions/team";
import { SubmitButton } from "./ui";

function PermissionSelect({ value = "MODERATION" }: { value?: string }) {
  return <label className="block text-sm">Access level<select name="permission" defaultValue={value} className="field mt-1">
    <option value="MODERATION">Moderator — adverts and reports</option>
    <option value="ALL">Full administrator — all admin areas</option>
  </select></label>;
}
function ConfirmPassword() {
  return <label className="block text-sm">Your current password<input name="currentPassword" type="password" autoComplete="current-password" required className="field mt-1" /></label>;
}
export function CreateTeamForm() {
  const [state, action] = useActionState(createTeamMember, { ok: false });
  return <form action={action} className="card space-y-4 p-5">
    <h2 className="text-xl">Add a colleague</h2>
    <div className="grid gap-4 sm:grid-cols-2">{["firstName", "lastName"].map((name) => <label key={name} className="block text-sm">{name === "firstName" ? "First name" : "Last name"}<input name={name} required maxLength={80} className="field mt-1" /></label>)}</div>
    <label className="block text-sm">Work email<input name="email" type="email" required className="field mt-1" /></label>
    <PermissionSelect /><ConfirmPassword />
    <p className="text-sm text-ink-soft">Full administrators can manage accounts, billing and sensitive referrals. Moderators can review adverts and reports only. Neither role grants access to private message conversations.</p>
    <SubmitButton pendingLabel="Creating account…">Create team account</SubmitButton>
    {state.message && <p role="status" className="text-sm">{state.message}</p>}
    {state.ok && state.redirect && <label className="block text-sm">Private setup link — copy and share securely<input readOnly className="field mt-1" value={`${typeof window !== "undefined" ? window.location.origin : ""}${state.redirect}`} onFocus={(event) => event.target.select()} /></label>}
  </form>;
}
export function TeamAccessForm({ userId, permission, status }: { userId: string; permission: string; status: string }) {
  const [state, action] = useActionState(updateTeamMember, { ok: false });
  return <details className="mt-3"><summary className="cursor-pointer text-sm text-pine-dark">Manage access</summary><form action={action} className="mt-4 grid gap-3">
    <input type="hidden" name="userId" value={userId} /><PermissionSelect value={permission} />
    <label className="text-sm">Account status<select name="status" defaultValue={status} className="field mt-1"><option value="ACTIVE">Active</option><option value="SUSPENDED">Suspended — no access</option></select></label>
    <ConfirmPassword /><SubmitButton pendingLabel="Saving…">Save permissions</SubmitButton>
    {state.message && <p role="status" className="text-sm">{state.message}</p>}
  </form></details>;
}

/** For a team member who has lost their phone and recovery codes. */
export function ResetTwoStepForm({ userId }: { userId: string }) {
  const [state, action] = useActionState(resetTeamTwoStep, { ok: false });
  return <details className="mt-3"><summary className="cursor-pointer text-sm text-pine-dark">Reset two-step login</summary><form action={action} className="mt-4 grid gap-3">
    <input type="hidden" name="userId" value={userId} />
    <p className="text-sm text-ink-soft">Only do this if they&apos;ve lost their phone and recovery codes, and you&apos;ve confirmed it&apos;s really them.</p>
    <ConfirmPassword /><SubmitButton pendingLabel="Resetting…">Reset two-step login</SubmitButton>
    {state.message && <p role="status" className="text-sm">{state.message}</p>}
  </form></details>;
}
