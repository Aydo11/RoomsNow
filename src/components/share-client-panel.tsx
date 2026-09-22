"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import {
  allocateClientAction,
  deleteClientShareAction,
  revokeClientShareAction,
  searchCompaniesAction,
  type AllocateState,
} from "@/server/actions/clients";
import { FormError, SubmitButton } from "./ui";
import { toast } from "./toast";
import { shortDate } from "@/lib/format";
import { clsx } from "@/lib/clsx";

type CompanyResult = { id: string; name: string; city: string | null; verification: string };
export type ProviderSuggestion = CompanyResult & { matchingAdverts: number; reason: string };
type ActiveShare = { id: string; companyName: string; note: string | null; createdAt: string };

/**
 * Allocating a client to a provider, in one place: pick a provider (from
 * suggestions that fit the client's area and needs, or by searching), then
 * share the profile and — optionally — message them on the client's behalf
 * with the profile card attached. Existing shares are listed underneath.
 */
export function ShareClientPanel({
  clientId,
  firstName,
  activeShares,
  revokedShares = [],
  suggestions = [],
}: {
  clientId: string;
  /** Kept for callers that still pass it; the panel addresses the client by first name. */
  clientName?: string;
  firstName: string;
  activeShares: ActiveShare[];
  revokedShares?: ActiveShare[];
  suggestions?: ProviderSuggestion[];
}) {
  const [state, action] = useActionState<AllocateState, FormData>(allocateClientAction, { ok: false });
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CompanyResult[]>([]);
  const [selected, setSelected] = useState<CompanyResult | null>(null);
  const [sendMessage, setSendMessage] = useState(true);
  const [searching, startSearch] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

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

  useEffect(() => {
    if (!state.ok) return;
    toast.success(state.message ?? "Done.");
    setSelected(null);
    setQuery("");
    formRef.current?.reset();
    router.refresh();
  }, [state, router]);

  const choose = (company: CompanyResult) => {
    setSelected(company);
    setResults([]);
    setQuery("");
  };

  const defaultMessage = selected
    ? `Hi ${selected.name} — I'm supporting ${firstName} and think your accommodation could be a good fit. I've attached their profile with their needs. Do you have anything suitable at the moment, and what would you need from me to take this forward?`
    : "";

  return (
    <div className="card p-6">
      <h2 className="text-[20px]">Send to a provider</h2>
      <p className="mt-2 max-w-[65ch] text-[14px] leading-relaxed text-ink-soft">
        Share {firstName}&apos;s profile with a provider and message them on {firstName}&apos;s behalf. They see the
        profile and needs — never your private notes — and you can revoke access any time.
      </p>

      {state.ok && state.conversationId && (
        <p className="mt-3 rounded-[10px] bg-pine-light px-3.5 py-2.5 text-[14px] text-pine-dark">
          Message sent.{" "}
          <Link href={`/messages/${state.conversationId}`} className="font-medium underline">
            Open the conversation
          </Link>
        </p>
      )}

      {suggestions.length > 0 && !selected && (
        <div className="mt-4">
          <h3 className="text-[13px] font-medium uppercase tracking-[0.06em] text-ink-faint">Suggested for {firstName}</h3>
          <ul className="mt-2 space-y-1.5">
            {suggestions.map((company) => (
              <li key={company.id}>
                <button
                  type="button"
                  onClick={() => choose(company)}
                  className="flex w-full items-center justify-between gap-3 rounded-[10px] border border-line px-3.5 py-2.5 text-left transition-colors hover:border-pine/40 hover:bg-pine-light/40"
                >
                  <span className="min-w-0">
                    <span className="flex items-center gap-2 text-[14px] font-medium text-ink">
                      <span className="truncate">{company.name}</span>
                      {company.verification === "APPROVED" && (
                        <span className="shrink-0 rounded-pill bg-pine-light px-2 py-0.5 text-[11px] font-semibold text-pine-dark">Verified</span>
                      )}
                    </span>
                    <span className="block truncate text-[12.5px] text-ink-faint">{company.reason}</span>
                  </span>
                  <span className="shrink-0 text-[13px] text-pine-dark">Choose</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <form ref={formRef} action={action} className="mt-4 space-y-3">
        <input type="hidden" name="clientId" value={clientId} />
        <input type="hidden" name="companyId" value={selected?.id ?? ""} />
        <FormError message={state.errors?.form} />

        {selected ? (
          <div className="flex items-center justify-between gap-3 rounded-[10px] border border-pine/40 bg-pine-light/50 px-3.5 py-2.5">
            <div className="min-w-0">
              <p className="text-[12px] text-ink-faint">Sending to</p>
              <p className="truncate text-[15px] font-medium text-ink">
                {selected.name}
                {selected.city ? <span className="font-normal text-ink-faint"> · {selected.city}</span> : null}
              </p>
            </div>
            <button type="button" className="shrink-0 text-[13px] text-pine-dark underline" onClick={() => setSelected(null)}>
              Change
            </button>
          </div>
        ) : (
          <div className="relative">
            <label className="label" htmlFor="company-search">
              {suggestions.length > 0 ? "Or search all providers" : "Provider"}
            </label>
            <input
              id="company-search"
              className="field"
              placeholder="Search by provider name or town"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              autoComplete="off"
            />
            {query.trim().length >= 2 && (
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
                        onClick={() => choose(company)}
                      >
                        <span>
                          {company.name}
                          {company.city ? <span className="text-ink-faint"> · {company.city}</span> : null}
                        </span>
                        {company.verification === "APPROVED" && <span className="shrink-0 text-[12px] text-pine-dark">Verified</span>}
                      </button>
                    </li>
                  ))
                )}
              </ul>
            )}
          </div>
        )}

        {selected && (
          <>
            <label className="flex items-start gap-2.5 text-[14px] text-ink">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 accent-pine"
                checked={sendMessage}
                onChange={(event) => setSendMessage(event.target.checked)}
              />
              <span>
                Message {selected.name} on {firstName}&apos;s behalf
                <span className="block text-[12.5px] text-ink-faint">Their profile card is attached to the message.</span>
              </span>
            </label>

            {sendMessage ? (
              <div>
                <label className="label" htmlFor="allocate-body">Message</label>
                <textarea
                  key={selected.id}
                  id="allocate-body"
                  name="body"
                  rows={5}
                  className="field"
                  defaultValue={defaultMessage}
                  required
                />
              </div>
            ) : (
              <div>
                <label className="label" htmlFor="share-note">Note on the profile (optional)</label>
                <textarea id="share-note" name="note" rows={2} className="field" placeholder="Anything you want them to see straight away" />
              </div>
            )}

            <SubmitButton pendingLabel="Sending…">
              {sendMessage ? `Share & message ${selected.name}` : `Share with ${selected.name}`}
            </SubmitButton>
          </>
        )}
      </form>

      {activeShares.length > 0 && (
        <div className="mt-6 border-t border-line pt-5">
          <h3 className="text-[15px] font-medium">Currently shared with</h3>
          <ul className="mt-3 space-y-2">
            {activeShares.map((share) => (
              <ShareRow key={share.id} share={share} />
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
              <ShareRow key={share.id} share={share} revoked />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function ShareRow({ share, revoked = false }: { share: ActiveShare; revoked?: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <li
      className={clsx(
        "flex items-center justify-between gap-3 rounded-[10px] border border-line px-3.5 py-2.5",
        revoked && "bg-paper-sunk",
      )}
    >
      <div className="min-w-0">
        <p className={clsx("truncate text-[14px]", revoked && "text-ink-soft")}>{share.companyName}</p>
        <p className="truncate text-[12px] text-ink-faint">
          Shared {shortDate(new Date(share.createdAt))}
          {revoked ? " · revoked" : ""}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        {!revoked && (
          <button
            className="text-[13px] text-clay underline hover:text-clay"
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
        )}
        <button
          className="text-[13px] text-ink-faint underline hover:text-clay"
          disabled={pending}
          onClick={() => {
            if (!window.confirm(`Delete this share record for ${share.companyName}? This can't be undone.`)) return;
            startTransition(async () => {
              await deleteClientShareAction(share.id);
              toast.success(`Deleted the record for ${share.companyName}.`);
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
