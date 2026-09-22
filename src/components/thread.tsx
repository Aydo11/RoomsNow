"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useActionState } from "react";
import { sendMessageAction } from "@/server/actions/engagement";
import { parseClientCard, type ClientCard } from "@/lib/client-card";
import { ClientAvatar } from "./client-avatar";
import { SubmitButton } from "./ui";
import { clsx } from "@/lib/clsx";

type ThreadMessage = {
  id: string;
  senderId: string;
  body: string;
  createdAt: string;
  readAt: string | null;
  clientId?: string | null;
  clientCard?: ClientCard | null;
};

export type AttachableClient = { id: string; name: string; photo: string | null; detail: string };

/**
 * Near-real-time via short polling — no websocket infrastructure needed to run
 * the app. Swap `poll()` for a subscription when you add Pusher/Ably/socket.io.
 */
export function Thread({
  conversationId,
  currentUserId,
  initialMessages,
  attachableClients,
  viewerIsProvider = false,
  withProvider = false,
}: {
  conversationId: string;
  currentUserId: string;
  initialMessages: ThreadMessage[];
  /** A referrer's own clients, offered in the "attach a profile" picker. */
  attachableClients?: AttachableClient[];
  viewerIsProvider?: boolean;
  /** The other side is a provider, so attaching a profile also shares it with them. */
  withProvider?: boolean;
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [state, action] = useActionState(sendMessageAction, { ok: false });
  const endRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [online, setOnline] = useState(true);
  const [attached, setAttached] = useState<AttachableClient | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerQuery, setPickerQuery] = useState("");

  const refreshMessages = useCallback(async () => {
    try {
      const response = await fetch(`/api/conversations/${conversationId}/messages`, { cache: "no-store" });
      if (!response.ok) return;
      const data = (await response.json()) as { messages: (Omit<ThreadMessage, "clientCard"> & { clientCard?: unknown })[] };
      setOnline(true);
      setMessages((current) => {
        const currentVersion = current.map((message) => `${message.id}:${message.readAt ?? ""}`).join("|");
        const nextVersion = data.messages.map((message) => `${message.id}:${message.readAt ?? ""}`).join("|");
        return currentVersion === nextVersion
          ? current
          : data.messages.map((message) => ({ ...message, clientCard: parseClientCard(message.clientCard) }));
      });
    } catch {
      setOnline(false);
    }
  }, [conversationId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      setAttached(null);
      void refreshMessages();
    }
  }, [state, refreshMessages]);

  useEffect(() => {
    const timer = setInterval(() => void refreshMessages(), 2500);
    const onVisible = () => { if (document.visibilityState === "visible") void refreshMessages(); };
    window.addEventListener("focus", refreshMessages);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", refreshMessages);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refreshMessages]);

  const filteredClients = useMemo(() => {
    const q = pickerQuery.trim().toLowerCase();
    const list = attachableClients ?? [];
    return (q ? list.filter((c) => c.name.toLowerCase().includes(q)) : list).slice(0, 30);
  }, [attachableClients, pickerQuery]);

  const canAttach = Boolean(attachableClients && attachableClients.length > 0);

  return (
    <>
      <ol className="mt-6 space-y-3 pb-4" aria-live="polite" aria-relevant="additions">
        {messages.map((message) => {
          const mine = message.senderId === currentUserId;
          const cardHref = message.clientId
            ? mine
              ? `/referrals/clients/${message.clientId}`
              : viewerIsProvider
                ? `/provider/clients/${message.clientId}`
                : null
            : null;
          return (
            <li key={message.id} className={mine ? "flex justify-end" : "flex justify-start"}>
              <div
                className={`max-w-[85%] rounded-card px-4 py-2.5 sm:max-w-[80%] ${
                  mine ? "bg-ink text-white" : "border border-line bg-white text-ink"
                }`}
              >
                {message.clientCard && (
                  <ClientCardView card={message.clientCard} clientId={message.clientId ?? null} href={cardHref} />
                )}
                <p className="whitespace-pre-line text-[15px] leading-relaxed">{message.body}</p>
                <p className={`mt-1 text-[12px] ${mine ? "text-white/60" : "text-ink-faint"}`}>
                  {new Date(message.createdAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                  {mine && message.readAt ? " · Read" : ""}
                </p>
              </div>
            </li>
          );
        })}
        <div ref={endRef} />
      </ol>

      <form
        ref={formRef}
        action={action}
        className="sticky bottom-20 rounded-card border border-line bg-white p-2 lg:bottom-4"
      >
        <input type="hidden" name="conversationId" value={conversationId} />
        <input type="hidden" name="clientId" value={attached?.id ?? ""} />

        {attached && (
          <div className="mb-2 flex items-center gap-2.5 rounded-[10px] bg-pine-light px-2.5 py-2">
            <ClientAvatar name={attached.name} src={attached.photo} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] font-medium text-pine-dark">{attached.name}&apos;s profile attached</p>
              <p className="truncate text-[12px] text-ink-soft">
                {withProvider ? "Sending shares this profile with the provider." : "Shows their needs in the message."}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setAttached(null)}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-ink-soft hover:bg-white"
              aria-label="Remove attached profile"
            >
              <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <path d="m6 6 8 8M14 6l-8 8" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        )}

        <div className="relative flex gap-2">
          {canAttach && (
            <button
              type="button"
              onClick={() => setPickerOpen((open) => !open)}
              aria-expanded={pickerOpen}
              aria-haspopup="listbox"
              className={clsx(
                "grid h-[46px] w-[46px] shrink-0 place-items-center rounded-[10px] border transition-colors",
                pickerOpen ? "border-pine bg-pine-light text-pine-dark" : "border-line text-ink-soft hover:border-pine/40 hover:text-pine-dark",
              )}
              title="Attach a client's profile"
            >
              <span className="sr-only">Attach a client&apos;s profile</span>
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
                <circle cx="10" cy="8" r="3.5" />
                <path d="M3.5 19a6.5 6.5 0 0 1 11.3-4.4M18 14v6M15 17h6" strokeLinecap="round" />
              </svg>
            </button>
          )}

          <label className="sr-only" htmlFor="body">Message</label>
          <textarea
            id="body"
            name="body"
            rows={1}
            required={!attached}
            placeholder={attached ? `Add a note about ${attached.name.split(" ")[0]} (optional)` : "Write a message"}
            className="min-h-[46px] flex-1 resize-none rounded-[10px] border-0 px-3 py-3 text-[15px] focus:ring-0"
            onInput={(event) => {
              event.currentTarget.style.height = "46px";
              event.currentTarget.style.height = `${Math.min(event.currentTarget.scrollHeight, 144)}px`;
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                formRef.current?.requestSubmit();
              }
            }}
          />
          <SubmitButton className="btn-primary" pendingLabel="Sending">Send</SubmitButton>

          {pickerOpen && canAttach && (
            <div className="absolute bottom-full left-0 z-30 mb-2 w-[min(360px,calc(100vw-48px))] animate-fade-in-up rounded-card border border-line bg-white p-2 shadow-float">
              <label className="sr-only" htmlFor="attach-client-search">Find a client</label>
              <input
                id="attach-client-search"
                className="field"
                placeholder="Find one of your clients"
                value={pickerQuery}
                onChange={(event) => setPickerQuery(event.target.value)}
                autoFocus
              />
              <ul role="listbox" aria-label="Your clients" className="mt-1 max-h-64 overflow-y-auto">
                {filteredClients.length === 0 ? (
                  <li className="px-2 py-3 text-[14px] text-ink-faint">No clients match.</li>
                ) : (
                  filteredClients.map((client) => (
                    <li key={client.id}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={attached?.id === client.id}
                        onClick={() => {
                          setAttached(client);
                          setPickerOpen(false);
                          setPickerQuery("");
                        }}
                        className="flex w-full items-center gap-2.5 rounded-[8px] px-2 py-2 text-left hover:bg-paper-sunk"
                      >
                        <ClientAvatar name={client.name} src={client.photo} size="sm" />
                        <span className="min-w-0">
                          <span className="block truncate text-[14px] text-ink">{client.name}</span>
                          <span className="block truncate text-[12px] text-ink-faint">{client.detail}</span>
                        </span>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </div>
          )}
        </div>
      </form>
      {!online && <p className="mt-2 text-[13px] text-clay">Connection interrupted. Your messages will refresh when you are back online.</p>}
      {(state.errors?.form || state.errors?.body) && (
        <p className="mt-2 text-[13px] text-clay">{state.errors?.form ?? state.errors?.body}</p>
      )}
    </>
  );
}

/** A client profile dropped into the conversation — who, where, and what they need. */
function ClientCardView({ card, clientId, href }: { card: ClientCard; clientId: string | null; href: string | null }) {
  const photo = card.hasPhoto && clientId ? `/api/clients/${clientId}/photo` : null;
  const body = (
    <>
      <div className="flex items-center gap-3">
        <ClientAvatar name={card.name} src={photo} />
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-pine-dark">Client profile</p>
          <p className="truncate text-[16px] font-semibold text-ink">{card.name}</p>
          <p className="truncate text-[13px] text-ink-soft">
            {[card.age ? `Age ${card.age}` : null, card.preferredLocation].filter(Boolean).join(" · ") || "No area given"}
          </p>
        </div>
      </div>
      {card.supportTypes.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1">
          {card.supportTypes.map((label) => (
            <span key={label} className="rounded-pill bg-pine-light px-2 py-0.5 text-[12px] text-pine-dark">{label}</span>
          ))}
        </div>
      )}
      {card.accommodationNeeds && (
        <p className="mt-2.5 text-[13.5px] leading-relaxed text-ink">
          <span className="font-medium">Needs: </span>
          {card.accommodationNeeds}
        </p>
      )}
      {card.supportNeeds && (
        <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink">
          <span className="font-medium">Support: </span>
          {card.supportNeeds}
        </p>
      )}
      {href && <p className="mt-2.5 text-[13px] font-medium text-pine-dark">View full profile →</p>}
    </>
  );

  const className = "mb-2 block rounded-[12px] border border-line bg-paper-card p-3 text-left text-ink";
  return href ? (
    <Link href={href} className={clsx(className, "transition-colors hover:border-pine/40")}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}
