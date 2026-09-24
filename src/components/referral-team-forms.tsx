"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  changeMemberRoleAction,
  createOrganisationAction,
  inviteColleagueAction,
  leaveOrganisationAction,
  reassignClientAction,
  removeMemberAction,
  renameOrganisationAction,
  revokeInviteAction,
} from "@/server/actions/referral-team";
import { Field, FormError, FormSuccess, SubmitButton } from "./ui";

export function CreateOrganisationForm({ suggestedName }: { suggestedName: string }) {
  const [state, action] = useActionState(createOrganisationAction, { ok: false });
  return (
    <form action={action} className="space-y-4">
      <FormError message={state.errors?.form} />
      <FormSuccess message={state.ok ? state.message : undefined} />
      <Field label="Organisation name" name="name" error={state.errors?.name}>
        <input id="name" name="name" defaultValue={suggestedName} className="field" placeholder="e.g. Birmingham Housing Support Team" required />
      </Field>
      <SubmitButton pendingLabel="Setting up…">Create organisation</SubmitButton>
    </form>
  );
}

export function RenameOrganisationForm({ name }: { name: string }) {
  const [state, action] = useActionState(renameOrganisationAction, { ok: false });
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <div className="min-w-[220px] flex-1">
        <Field label="Organisation name" name="orgName" error={state.errors?.name ?? state.errors?.form}>
          <input id="orgName" name="name" defaultValue={name} className="field" required />
        </Field>
      </div>
      <SubmitButton className="btn-secondary h-[46px]" pendingLabel="Saving…">Rename</SubmitButton>
      {state.ok && <p className="w-full text-[13px] text-pine-dark" role="status">{state.message}</p>}
    </form>
  );
}

export function InviteColleagueForm() {
  const [state, action] = useActionState(inviteColleagueAction, { ok: false });
  const [copied, setCopied] = useState(false);
  return (
    <form action={action} className="space-y-4">
      <FormError message={state.errors?.form} />
      <FormSuccess message={state.ok ? state.message : undefined} />
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px_auto] sm:items-end">
        <Field label="Colleague's work email" name="inviteEmail" error={state.errors?.email}>
          <input id="inviteEmail" name="email" type="email" autoComplete="off" className="field" placeholder="name@organisation.org.uk" required />
        </Field>
        <Field label="Role" name="inviteRole">
          <select id="inviteRole" name="role" defaultValue="MEMBER" className="field">
            <option value="MEMBER">Member</option>
            <option value="ADMIN">Admin — can manage the team</option>
          </select>
        </Field>
        <SubmitButton className="btn-primary h-[46px]" pendingLabel="Sending…">Send invite</SubmitButton>
      </div>
      {state.ok && state.link && (
        <div className="flex flex-wrap items-center gap-2 rounded-[10px] border border-line bg-paper-sunk px-3 py-2">
          <code className="min-w-0 flex-1 truncate text-[12.5px] text-ink-soft">{state.link}</code>
          <button
            type="button"
            className="btn-secondary py-1.5 text-[13px]"
            onClick={() => {
              navigator.clipboard?.writeText(state.link!).then(() => setCopied(true)).catch(() => undefined);
            }}
          >
            {copied ? "Copied" : "Copy link"}
          </button>
        </div>
      )}
    </form>
  );
}

function useAction() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const run = (fn: () => Promise<{ ok: boolean; message: string } | void>) =>
    start(async () => {
      const result = await fn();
      if (result) setMessage(result.message);
      router.refresh();
    });
  return { pending, message, run };
}

export function MemberControls({ userId, role, name }: { userId: string; role: "ADMIN" | "MEMBER"; name: string }) {
  const { pending, message, run } = useAction();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="sr-only" htmlFor={`role-${userId}`}>Role for {name}</label>
      <select
        id={`role-${userId}`}
        defaultValue={role}
        disabled={pending}
        onChange={(e) => run(() => changeMemberRoleAction(userId, e.target.value as "ADMIN" | "MEMBER"))}
        className="field h-9 w-auto py-1 text-[13px]"
      >
        <option value="MEMBER">Member</option>
        <option value="ADMIN">Admin</option>
      </select>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (window.confirm(`Remove ${name}? Their clients and referrals will move to the organisation owner.`)) run(() => removeMemberAction(userId));
        }}
        className="btn-ghost py-1.5 text-[13px] text-clay"
      >
        Remove
      </button>
      {message && <span className="text-[12px] text-ink-faint" role="status">{message}</span>}
    </div>
  );
}

export function RevokeInviteButton({ inviteId }: { inviteId: string }) {
  const { pending, run } = useAction();
  return (
    <button type="button" disabled={pending} onClick={() => run(() => revokeInviteAction(inviteId))} className="btn-ghost py-1.5 text-[13px]">
      {pending ? "Cancelling…" : "Cancel invite"}
    </button>
  );
}

export function LeaveOrganisationButton({ orgName }: { orgName: string }) {
  const { pending, message, run } = useAction();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (window.confirm(`Leave ${orgName}? Your clients and referrals will stay with the organisation.`)) run(() => leaveOrganisationAction());
        }}
        className="btn-secondary text-clay"
      >
        Leave organisation
      </button>
      {message && <span className="text-[13px] text-ink-faint" role="status">{message}</span>}
    </div>
  );
}

export function CaseOwnerSelect({
  clientId,
  ownerId,
  colleagues,
  disabled,
}: {
  clientId: string;
  ownerId: string;
  colleagues: { id: string; name: string }[];
  disabled?: boolean;
}) {
  const { pending, message, run } = useAction();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="text-[13px] text-ink-faint" htmlFor={`owner-${clientId}`}>Case owner</label>
      <select
        id={`owner-${clientId}`}
        defaultValue={ownerId}
        disabled={pending || disabled}
        onChange={(e) => run(() => reassignClientAction(clientId, e.target.value))}
        className="field h-9 w-auto py-1 text-[13px]"
      >
        {colleagues.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>
      {message && <span className="text-[12px] text-ink-faint" role="status">{message}</span>}
    </div>
  );
}
