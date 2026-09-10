"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import {
  deleteClientShareAction,
  revokeClientShareAction,
  searchCompaniesAction,
  shareClientAction,
} from "@/server/actions/clients";
import { FormError, FormSuccess, SubmitButton } from "./ui";
import { DirectMessageForm } from "./direct-message-form";
import { toast } from "./toast";
import { shortDate } from "@/lib/format";

type CompanyResult = { id: string; name: string; city: string | null; verification: string };
type ActiveShare = { id: string; companyName: string; note: string | null; createdAt: string };

export function ShareClientPanel({
  clientId,
  clientName,
  activeShares,
  revokedShares = [],
}: {
  clientId: string;
  clientName: string;
  activeShares: ActiveShare[];
  revokedShares?: ActiveShare[];
}) {
  const [state, action] = useActionState(shareClientAction, { ok: false });
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CompanyResult[]>([]);
  const [selected, setSelected] = useState<CompanyResult | null>(null);
  const [searching, startSearch] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (selected) return;
    clearTimeout(debounceRef.current);
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(() => {
      startSearch(async () => setResults(await searchCompaniesAction(query)));
    }, 250);
    return () => clearTimeout(debounceRef.current);
  }, [query, selected]);

  return (
    <div className="card p-6">
      <h2 className="text-[20px]">Share this profile</h2>
      <p className="mt-2 max-w-[65ch] text-[14px] leading-relaxed text-ink-soft">
        Gives a provider read access to this profile — not documents, not your private notes, just
        who you're trying to place. They&apos;re notified straight away. Revoke it any time.
      </p>

      <form action={action} className="mt-4 space-y-3">
        <input type="hidden" name="clientId" value={clientId} />
        <input type="hidden" name="companyId" value={selected?.id ?? ""} />
        <FormError message={state.errors?.form ?? state.errors?.companyId} />
        <FormSuccess message={state.ok ? state.message : undefined} />

        <div className="relative">
          <label className="label" htmlFor="company-search">Provider</label>
          <input
            id="company-search"
            className="field"
            placeholder="Search providers by name"
            value={selected ? selected.name : query}
            onChange={(event) => {
              setSelected(null);
              setQuery(event.target.value);
            }}
            autoComplete="off"
          />
          {!selected && (query.trim().length >= 2) && (
            <ul className="absolute inset-x-0 top-full z-10 mt-1 max-h-64 animate-fade-in-down overflow-y-auto rounded-card border border-line bg-white py-1 shadow-float">
              {searching ? (
                <li className="px-3 py-2 text-[14px] text-ink-faint">Searching…</li>
              ) : results.length === 0 ? (
                <li className="px-3 py-2 text-[14px] text-ink-faint">No providers matched.</li>
              ) : (
                results.map((company) => (
                  <li key={company.id}>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-[14px] hover:bg-paper-sunk"
                      onClick={() => {
                        setSelected(company);
                        setResults([]);
                      }}
                    >
                      <span>
                        {company.name}
                        {company.city ? <span className="text-ink-faint"> · {company.city}</span> : null}
                      </span>
                      {company.verification === "APPROVED" && (
                        <span className="shrink-0 text-[12px] text-pine-dark">Verified</span>
                      )}
                    </button>
                  </li>
                ))
              )}
            </ul>
          )}
        </div>

        <div>
          <label className="label" htmlFor="share-note">Note (optional)</label>
          <textarea id="share-note" name="note" rows={2} className="field" placeholder="Anything you want them to see straight away" />
        </div>

        <SubmitButton pendingLabel="Sharing…" disabled={!selected}>
          Share profile
        </SubmitButton>
      </form>

      {selected && (
        <div className="mt-4 border-t border-line pt-4">
          <h3 className="text-[14px] font-medium">Or just message them first</h3>
          <p className="mt-1 text-[13px] text-ink-soft">
            Ask whether {clientName}&apos;s needs would be a fit before sharing the full profile.
          </p>
          <div className="mt-2">
            <DirectMessageForm
              companyId={selected.id}
              subject={`A potential client — ${clientName}`}
              label={`Message ${selected.name}`}
              placeholder={`Hi — I have a client, ${clientName}, who might be a good fit for you. Do you take referrals like this at the moment?`}
              compact
            />
          </div>
        </div>
      )}

      {activeShares.length > 0 && (
        <div className="mt-6 border-t border-line pt-5">
          <h3 className="text-[15px] font-medium">Currently shared with</h3>
          <ul className="mt-3 space-y-2">
            {activeShares.map((share) => (
              <ActiveShareRow key={share.id} share={share} />
            ))}
          </ul>
        </div>
      )}

      {revokedShares.length > 0 && (
        <div className="mt-6 border-t border-line pt-5">
          <h3 className="text-[15px] font-medium text-ink-soft">Previously shared</h3>
          <p className="mt-1 text-[12.5px] text-ink-faint">
            Access was revoked — the provider can no longer see this profile. Delete removes the record entirely.
          </p>
          <ul className="mt-3 space-y-2">
            {revokedShares.map((share) => (
              <RevokedShareRow key={share.id} share={share} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function ActiveShareRow({ share }: { share: ActiveShare }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <li className="flex items-center justify-between gap-3 rounded-[10px] border border-line px-3.5 py-2.5">
      <div className="min-w-0">
        <p className="truncate text-[14px]">{share.companyName}</p>
        <p className="truncate text-[12px] text-ink-faint">Shared {shortDate(new Date(share.createdAt))}</p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <button
          className="text-[13px] text-clay-dark underline hover:text-clay"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await revokeClientShareAction(share.id);
              toast.success(`Revoked ${share.companyName}'s access.`);
              router.refresh();
            })
          }
        >
          Revoke
        </button>
        <button
          className="text-[13px] text-ink-faint underline hover:text-clay-dark"
          disabled={pending}
          onClick={() => {
            if (!window.confirm(`Delete this share with ${share.companyName}? This can't be undone.`)) return;
            startTransition(async () => {
              await deleteClientShareAction(share.id);
              toast.success(`Deleted the share with ${share.companyName}.`);
              router.refresh();
            });
          }}
        >
          Delete
        </button>
      </div>
    </li>
  );
}

function RevokedShareRow({ share }: { share: ActiveShare }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <li className="flex items-center justify-between gap-3 rounded-[10px] border border-line bg-paper-sunk px-3.5 py-2.5">
      <div className="min-w-0">
        <p className="truncate text-[14px] text-ink-soft">{share.companyName}</p>
        <p className="truncate text-[12px] text-ink-faint">Shared {shortDate(new Date(share.createdAt))} · revoked</p>
      </div>
      <button
        className="shrink-0 text-[13px] text-clay-dark underline hover:text-clay"
        disabled={pending}
        onClick={() => {
          if (!window.confirm(`Permanently delete this record for ${share.companyName}?`)) return;
          startTransition(async () => {
            await deleteClientShareAction(share.id);
            toast.success(`Deleted the record for ${share.companyName}.`);
            router.refresh();
          });
        }}
      >
        Delete
      </button>
    </li>
  );
}
