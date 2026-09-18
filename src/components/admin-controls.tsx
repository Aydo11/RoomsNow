"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  approveListingAction,
  archiveReportAction,
  rejectListingAction,
  resolveReportAction,
  reviewVerificationAction,
  setCompanyStatusAction,
  setUserRoleAction,
  setUserStatusAction,
  takedownListingAction,
  toggleFeaturedAction,
} from "@/server/actions/admin";
import type { ReportStatus } from "@prisma/client";
import type { VerificationChecks } from "@/lib/verification";
import { TAKEDOWN_REASONS } from "@/lib/taxonomy";

export function ListingModeration({
  id,
  status,
  featured,
}: {
  id: string;
  status: string;
  featured: boolean;
}) {
  const router = useRouter();
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState("");
  const [takingDown, setTakingDown] = useState(false);
  const [takedownReason, setTakedownReason] = useState("");
  const [takedownDetail, setTakedownDetail] = useState("");
  const [pending, startTransition] = useTransition();
  const run = (fn: () => Promise<void>) => startTransition(async () => { await fn(); router.refresh(); });

  const takedownMessage = takedownDetail.trim()
    ? `${takedownReason}: ${takedownDetail.trim()}`
    : takedownReason;

  function submitTakedown() {
    startTransition(async () => {
      const result = await takedownListingAction(id, takedownMessage);
      if (result?.ok) {
        setTakingDown(false);
        setTakedownReason("");
        setTakedownDetail("");
      }
      router.refresh();
    });
  }

  return (
    <div className="w-full shrink-0 sm:w-[260px]">
      {status === "PENDING_REVIEW" && !rejecting && (
        <div className="flex flex-wrap gap-2">
          <button className="btn-primary" disabled={pending} onClick={() => run(() => approveListingAction(id))}>
            Approve
          </button>
          <button className="btn-ghost text-clay-dark" onClick={() => setRejecting(true)}>
            Needs changes
          </button>
        </div>
      )}

      {rejecting && (
        <div className="space-y-2">
          <label className="sr-only" htmlFor={`note-${id}`}>Reason</label>
          <textarea
            id={`note-${id}`}
            rows={3}
            className="field"
            placeholder="What needs to change? This is sent to the provider."
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
          <div className="flex gap-2">
            <button
              className="btn-danger"
              disabled={pending || note.trim().length < 4}
              onClick={() => run(() => rejectListingAction(id, note.trim()))}
            >
              Send back
            </button>
            <button className="btn-ghost" onClick={() => setRejecting(false)}>Cancel</button>
          </div>
        </div>
      )}

      {(status === "ACTIVE" || status === "PAUSED") && !takingDown && (
        <div className="flex flex-wrap gap-2">
          {status === "ACTIVE" && (
            <button
              className="btn-secondary"
              disabled={pending}
              onClick={() => run(() => toggleFeaturedAction(id, !featured))}
            >
              {featured ? "Remove promotion" : "Promote for 30 days"}
            </button>
          )}
          <button className="btn-ghost text-clay-dark" disabled={pending} onClick={() => setTakingDown(true)}>
            Take down
          </button>
        </div>
      )}

      {takingDown && (
        <div className="space-y-2 rounded-[10px] border border-clay/30 bg-clay-light/40 p-3">
          <label className="block text-[12px] font-medium text-ink-soft" htmlFor={`takedown-reason-${id}`}>
            Reason for removal
          </label>
          <select
            id={`takedown-reason-${id}`}
            className="field"
            value={takedownReason}
            onChange={(event) => setTakedownReason(event.target.value)}
          >
            <option value="">Select a reason…</option>
            {TAKEDOWN_REASONS.map((reason) => (
              <option key={reason} value={reason}>{reason}</option>
            ))}
          </select>
          <label className="sr-only" htmlFor={`takedown-detail-${id}`}>Extra detail (optional)</label>
          <textarea
            id={`takedown-detail-${id}`}
            rows={2}
            className="field"
            placeholder="Optional extra detail sent to the provider"
            value={takedownDetail}
            onChange={(event) => setTakedownDetail(event.target.value)}
          />
          <div className="flex gap-2">
            <button
              className="btn-danger"
              disabled={pending || !takedownReason}
              onClick={submitTakedown}
            >
              Remove advert
            </button>
            <button className="btn-ghost" disabled={pending} onClick={() => setTakingDown(false)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

export function VerificationDecision({ id, requiredDocumentsPresent }: { id: string; requiredDocumentsPresent: boolean }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [checks, setChecks] = useState<VerificationChecks>({ register: false, insurance: false, governance: false, safeguarding: false, identity: false });
  const [pending, startTransition] = useTransition();
  const allChecked = requiredDocumentsPresent && Object.values(checks).every(Boolean);
  const run = (approve: boolean) =>
    startTransition(async () => {
      await reviewVerificationAction(id, approve, note.trim() || undefined, checks);
      router.refresh();
    });

  return (
    <div className="space-y-2">
      <fieldset className="space-y-2 rounded-[10px] border border-line bg-paper p-3">
        <legend className="px-1 text-[13px] font-semibold text-ink">Reviewer checks</legend>
        {([
          ["register", "Registration and Companies House or charity record match"],
          ["insurance", "Insurance is valid and appropriate"],
          ["governance", "Governance and accountable roles are clear"],
          ["safeguarding", "Safeguarding policy and escalation route reviewed"],
          ["identity", "Submitting organisation and contact identity are consistent"],
        ] as const).map(([key, label]) => (
          <label key={key} className="flex items-start gap-2 text-[12px] leading-snug text-ink-soft">
            <input type="checkbox" checked={checks[key]} onChange={(event) => setChecks((current) => ({ ...current, [key]: event.target.checked }))} className="mt-0.5 h-4 w-4 accent-pine" />
            <span>{label}</span>
          </label>
        ))}
      </fieldset>
      {!requiredDocumentsPresent && <p className="text-[12px] text-clay-dark">Required evidence is missing. Reject and request a complete pack.</p>}
      <label className="sr-only" htmlFor={`vnote-${id}`}>Note</label>
      <input
        id={`vnote-${id}`}
        className="field"
        placeholder="Note to the provider (optional)"
        value={note}
        onChange={(event) => setNote(event.target.value)}
      />
      <div className="flex gap-2">
        <button className="btn-primary" disabled={pending || !allChecked} onClick={() => run(true)}>Approve verification</button>
        <button className="btn-ghost text-clay-dark" disabled={pending} onClick={() => run(false)}>Reject</button>
      </div>
    </div>
  );
}

export function AccountToggle({
  kind,
  id,
  status,
}: {
  kind: "user" | "company";
  id: string;
  status: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const next = status === "SUSPENDED" ? "ACTIVE" : "SUSPENDED";

  return (
    <button
      className={next === "SUSPENDED" ? "btn-ghost text-clay-dark" : "btn-secondary"}
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          if (kind === "user") await setUserStatusAction(id, next);
          else await setCompanyStatusAction(id, next);
          router.refresh();
        })
      }
    >
      {next === "SUSPENDED" ? "Suspend" : "Reinstate"}
    </button>
  );
}

const ACCOUNT_TYPES = ["USER", "PROVIDER", "REFERRER"] as const;

/** Fixes an account that picked the wrong type at signup — most often someone who meant to register as a job-seeker or case worker but selected "Provider". */
export function RoleSelect({ id, role }: { id: string; role: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <select
      aria-label="Account type"
      className="field !w-auto py-1 text-[13px] capitalize"
      defaultValue={role}
      disabled={pending}
      onChange={(event) => {
        const next = event.target.value as (typeof ACCOUNT_TYPES)[number];
        if (next === role) return;
        const warning =
          role === "PROVIDER"
            ? " They'll lose access to their provider company (the company itself is kept, so this can be undone)."
            : "";
        if (!window.confirm(`Change this account to ${next.toLowerCase()}?${warning}`)) {
          event.target.value = role;
          return;
        }
        startTransition(async () => {
          await setUserRoleAction(id, next);
          router.refresh();
        });
      }}
    >
      {ACCOUNT_TYPES.map((value) => (
        <option key={value} value={value}>
          {value === "USER" ? "User" : value === "PROVIDER" ? "Provider" : "Referrer"}
        </option>
      ))}
    </select>
  );
}

export function ReportDecision({ id, initialResolution = "", archived = false }: { id: string; initialResolution?: string; archived?: boolean }) {
  const router = useRouter();
  const [resolution, setResolution] = useState(initialResolution);
  const [pending, startTransition] = useTransition();
  const run = (status: ReportStatus) =>
    startTransition(async () => {
      await resolveReportAction(id, status, resolution.trim() || undefined);
      router.refresh();
    });

  return (
    <div className="space-y-2">
      <label className="sr-only" htmlFor={`rnote-${id}`}>Resolution</label>
      <input
        id={`rnote-${id}`}
        className="field"
        placeholder="What did you do about it?"
        value={resolution}
        onChange={(event) => setResolution(event.target.value)}
      />
      <div className="flex flex-wrap gap-2">
        <button className="btn-secondary" disabled={pending} onClick={() => run("REVIEWING")}>Reviewing</button>
        <button className="btn-primary" disabled={pending} onClick={() => run("ACTIONED")}>Actioned</button>
        <button className="btn-ghost" disabled={pending} onClick={() => run("DISMISSED")}>Dismiss</button>
        <button className="btn-ghost text-clay-dark" disabled={pending} onClick={() => startTransition(async () => {
          await archiveReportAction(id, !archived);
          router.refresh();
        })}>{archived ? "Restore from archive" : "Archive case"}</button>
      </div>
    </div>
  );
}
