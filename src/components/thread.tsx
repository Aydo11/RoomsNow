"use client";

import Link from "next/link";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState, useActionState } from "react";
import { deleteMessageAction, sendMessageAction, togglePinnedMessageAction } from "@/server/actions/engagement";
import type { QuickReplyItem } from "@/server/actions/quick-replies";
import { QuickReplies } from "./quick-replies";
import { parseClientCard, type ClientCard } from "@/lib/client-card";
import { ClientAvatar } from "./client-avatar";
import { SubmitButton } from "./ui";
import { clsx } from "@/lib/clsx";
import { suggestedReplies, type ReplyViewer } from "@/lib/suggested-replies";

type ThreadMessage = {
  id: string;
  senderId: string;
  body: string;
  createdAt: string;
  readAt: string | null;
  clientId?: string | null;
  clientCard?: ClientCard | null;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  attachmentType?: string | null;
  isPinned?: boolean;
  isDeleted?: boolean;
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
  shareProfileUrl,
  quickReplies,
  replyViewer = "seeker",
}: {
  conversationId: string;
  currentUserId: string;
  initialMessages: ThreadMessage[];
  /** A referrer's own clients, offered in the "attach a profile" picker. */
  attachableClients?: AttachableClient[];
  viewerIsProvider?: boolean;
  /** The other side is a provider, so attaching a profile also shares it with them. */
  withProvider?: boolean;
  /** A shareable RoomsNow listing, client, agency or company profile URL. */
  shareProfileUrl?: string | null;
  /** The provider team's saved replies. Passing this (even empty) turns on the Quick replies menu. */
  quickReplies?: QuickReplyItem[];
  /** Who is writing, so the suggested messages fit (a provider answers, a seeker asks). */
  replyViewer?: ReplyViewer;
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [state, action] = useActionState(sendMessageAction, { ok: false });
  const endRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const [online, setOnline] = useState(true);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [attached, setAttached] = useState<AttachableClient | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerQuery, setPickerQuery] = useState("");
  const [recording, setRecording] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [selectedMedia, setSelectedMedia] = useState<File | null>(null);
  const [selectedMediaPreview, setSelectedMediaPreview] = useState<string | null>(null);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [hasText, setHasText] = useState(false);

  const refreshMessages = useCallback(async () => {
    try {
      const response = await fetch(`/api/conversations/${conversationId}/messages`, { cache: "no-store" });
      if (!response.ok) return;
      const data = (await response.json()) as { messages: (Omit<ThreadMessage, "clientCard"> & { clientCard?: unknown })[] };
      setOnline(true);
      setMessages((current) => {
        const currentVersion = current.map((message) => `${message.id}:${message.readAt ?? ""}:${message.isPinned ?? false}:${message.isDeleted ?? false}:${message.body}:${message.attachmentUrl ?? ""}`).join("|");
        const nextVersion = data.messages.map((message) => `${message.id}:${message.readAt ?? ""}:${message.isPinned ?? false}:${message.isDeleted ?? false}:${message.body}:${message.attachmentUrl ?? ""}`).join("|");
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
      setHasText(false);
      if (textareaRef.current) textareaRef.current.style.height = "40px";
      setAttached(null);
      setSelectedMedia(null);
      void refreshMessages();
    }
  }, [state, refreshMessages]);

  useEffect(() => {
    if (!selectedMedia) {
      setSelectedMediaPreview(null);
      return;
    }
    const url = URL.createObjectURL(selectedMedia);
    setSelectedMediaPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [selectedMedia]);

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

  useEffect(() => () => {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  }, []);

  const filteredClients = useMemo(() => {
    const q = pickerQuery.trim().toLowerCase();
    const list = attachableClients ?? [];
    return (q ? list.filter((c) => c.name.toLowerCase().includes(q)) : list).slice(0, 30);
  }, [attachableClients, pickerQuery]);

  const lastFromOther = [...messages].reverse().find((message) => message.senderId !== currentUserId && !message.isDeleted)?.body ?? null;
  const suggestions = useMemo(() => suggestedReplies(replyViewer, lastFromOther), [replyViewer, lastFromOther]);

  const canAttach = Boolean(attachableClients && attachableClients.length > 0);
  const pinnedMessages = messages.filter((message) => message.isPinned && !message.isDeleted);

  async function togglePin(messageId: string) {
    const result = await togglePinnedMessageAction(messageId);
    if (!result.ok) return;
    setMessages((current) => current.map((message) => message.id === messageId ? { ...message, isPinned: result.isPinned } : message));
  }

  async function deleteMessage(messageId: string) {
    if (!window.confirm("Delete this message for everyone in the conversation? This cannot be undone.")) return;
    setDeleteError(null);
    const result = await deleteMessageAction(messageId);
    if (!result.ok) {
      setDeleteError(result.message);
      return;
    }
    setMessages((current) => current.map((message) => message.id === messageId
      ? { ...message, body: "", clientId: null, clientCard: null, attachmentUrl: null, attachmentName: null, attachmentType: null, isPinned: false, isDeleted: true }
      : message));
  }

  function insertIntoMessage(value: string) {
    const input = textareaRef.current;
    if (!input) return;
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const next = `${input.value.slice(0, start)}${value}${input.value.slice(end)}`;
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
    setter?.call(input, next);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.focus();
    input.setSelectionRange(start + value.length, start + value.length);
  }

  async function toggleRecording() {
    setMediaError(null);
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop();
      setRecording(false);
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setMediaError("Voice recording isn't supported in this browser. You can attach an audio file instead.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => { if (event.data.size) chunksRef.current.push(event.data); };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        const extension = blob.type.includes("mp4") ? "m4a" : "webm";
          const file = new File([blob], `voice-note.${extension}`, { type: blob.type });
        const input = mediaInputRef.current;
        if (input) {
          const transfer = new DataTransfer();
          transfer.items.add(file);
          input.files = transfer.files;
          setSelectedMedia(file);
        }
      };
      recorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch {
      setMediaError("Microphone access was unavailable. Check your browser permissions and try again.");
    }
  }

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col">
      {pinnedMessages.length > 0 && <section aria-label="Pinned messages" className="mt-2 shrink-0 rounded-card border border-brand/20 bg-brand/5 px-3 py-2 sm:mt-3 sm:p-3">
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-brand sm:mb-2 sm:text-[12px]">Pinned in this conversation</p>
        <div className="space-y-1">{pinnedMessages.map((message) => <button key={message.id} type="button" onClick={() => document.getElementById(`message-${message.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" })} className="block max-w-full truncate text-left text-[13px] text-ink hover:underline">{message.body || (message.attachmentType?.startsWith("audio/") ? "Voice note" : "Photo")}</button>)}</div>
      </section>}
      <ol className="mt-2 min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain pb-3 sm:mt-4 sm:space-y-3 sm:pb-4" aria-live="polite" aria-relevant="additions">
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
              <div id={`message-${message.id}`}
                className={`max-w-[85%] rounded-[16px] px-3 py-2 sm:max-w-[80%] sm:rounded-card sm:px-4 sm:py-2.5 ${
                  message.isDeleted ? "border border-dashed border-line bg-paper-sunk/60 text-ink-faint" : mine ? "bg-ink text-white" : "border border-line bg-white text-ink"
                }`}
              >
                {message.isDeleted ? <p className="py-1 text-[14px] italic">This message was deleted.</p> : message.clientCard && (
                  <ClientCardView card={message.clientCard} clientId={message.clientId ?? null} href={cardHref} />
                )}
                {!message.isDeleted && message.body && <MessageBody body={message.body} />}
                {!message.isDeleted && message.attachmentUrl && message.attachmentType?.startsWith("image/") && <a href={message.attachmentUrl} target="_blank" rel="noreferrer"><img src={message.attachmentUrl} alt={message.attachmentName || "Image attachment"} className="mt-2 max-h-80 max-w-full rounded-[10px] object-contain" loading="lazy" /></a>}
                {!message.isDeleted && message.attachmentUrl && message.attachmentType?.startsWith("audio/") && <audio className="mt-2 max-w-full" controls preload="none" src={message.attachmentUrl}>Your browser cannot play this voice note.</audio>}
                {!message.isDeleted && message.attachmentUrl && message.attachmentType === "application/pdf" && <a href={message.attachmentUrl} target="_blank" rel="noreferrer" className="mt-2 flex max-w-full items-center gap-2 rounded-[10px] border border-current/20 px-2.5 py-2 text-[13px] underline-offset-2 hover:underline"><span aria-hidden="true" className="grid h-7 w-7 shrink-0 place-items-center rounded-[6px] bg-white/20 text-[10px] font-bold">PDF</span><span className="min-w-0 truncate">{message.attachmentName || "Document"}</span></a>}
                <div className="mt-0.5 flex items-center gap-2">
                <p className={`text-[11px] ${mine ? "text-white/60" : "text-ink-faint"}`}>
                  {new Date(message.createdAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                  {mine && message.readAt ? " · Read" : ""}
                </p>
                {!message.isDeleted && <button type="button" onClick={() => void togglePin(message.id)} className={`text-[11px] underline ${mine ? "text-white/70" : "text-ink-faint"}`}>{message.isPinned ? "Unpin" : "Pin"}</button>}
                {mine && !message.isDeleted && <button type="button" onClick={() => void deleteMessage(message.id)} className="text-[11px] text-clay underline underline-offset-2">Delete</button>}
                </div>
              </div>
            </li>
          );
        })}
        <li aria-hidden="true" className="list-none"><div ref={endRef} /></li>
      </ol>

      {deleteError && <p role="alert" className="mb-2 text-[13px] text-clay">{deleteError}</p>}
      <form
        ref={formRef}
        action={action}
        className="z-20 -mx-3 shrink-0 border-t border-line bg-white px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 sm:mx-0 sm:rounded-card sm:border sm:p-3 sm:shadow-[0_-8px_24px_rgba(20,45,72,0.07)]"
      >
        <input type="hidden" name="conversationId" value={conversationId} />
        <input type="hidden" name="clientId" value={attached?.id ?? ""} />
        <input ref={mediaInputRef} type="file" name="media" accept="image/jpeg,image/png,image/webp,image/avif,application/pdf,audio/webm,audio/mp4,audio/mpeg,audio/wav" className="sr-only" onChange={(event) => { setMediaError(null); setSelectedMedia(event.currentTarget.files?.[0] ?? null); setToolsOpen(false); }} />

        {attached && (
          <div className="mb-2 flex items-center gap-2 rounded-[10px] bg-pine-light px-2 py-1.5">
            <ClientAvatar name={attached.name} src={attached.photo} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium text-pine-dark">{attached.name}&apos;s profile attached</p>
              <p className="truncate text-[11.5px] text-ink-soft">
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

        {selectedMedia && <div className="mb-2 flex max-w-full items-center gap-2 rounded-[10px] border border-brand/15 bg-paper-card p-1.5">
          {selectedMedia.type.startsWith("image/") && selectedMediaPreview ? <img src={selectedMediaPreview} alt="Photo ready to send" className="h-10 w-10 rounded-[6px] object-cover" /> : selectedMedia.type.startsWith("audio/") && selectedMediaPreview ? <audio controls preload="metadata" src={selectedMediaPreview} className="h-9 min-w-0 max-w-[190px]" /> : <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[6px] bg-brand/10 text-[11px] font-bold text-brand" aria-hidden="true">{selectedMedia.type === "application/pdf" ? "PDF" : "♫"}</span>}
          <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-ink">{selectedMedia.name}</span>
          <button type="button" onClick={() => { if (mediaInputRef.current) mediaInputRef.current.value = ""; setSelectedMedia(null); setMediaError(null); }} className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-ink-soft hover:bg-white hover:text-clay" aria-label={`Remove ${selectedMedia.name}`} title="Remove attachment">×</button>
        </div>}

        {recording && (
          <div className="mb-2 flex items-center justify-between gap-2 rounded-[10px] bg-red-50 px-3 py-1.5 text-[13px] text-red-700" role="status">
            <span className="flex items-center gap-2"><span className="h-2 w-2 animate-pulse rounded-full bg-red-600" aria-hidden="true" />Recording a voice note…</span>
            <button type="button" onClick={() => void toggleRecording()} className="rounded-pill bg-white px-3 py-1 text-[12px] font-semibold">Stop</button>
          </div>
        )}

        {(mediaError || state.errors?.form || state.errors?.body) && <p className="mb-2 text-[13px] text-clay">{mediaError || state.errors?.form || state.errors?.body}</p>}

        {toolsOpen && (
          <div id="composer-tools" className="mb-2 rounded-[12px] bg-paper-sunk/70 p-2">
            <div className="flex flex-wrap items-center gap-1">
              <button type="button" className="rounded-pill px-2.5 py-1.5 text-[12.5px] font-medium text-brand hover:bg-white" onClick={() => mediaInputRef.current?.click()}>＋ Photo, PDF or audio</button>
              <button type="button" className="rounded-pill px-2.5 py-1.5 text-[12.5px] font-medium text-brand hover:bg-white" onClick={() => { setToolsOpen(false); void toggleRecording(); }}>◉ Voice note</button>
              {quickReplies && (
                <QuickReplies initial={quickReplies} onInsert={(text) => { insertIntoMessage(text); setToolsOpen(false); }} getDraft={() => textareaRef.current?.value ?? ""} />
              )}
              {shareProfileUrl && <button type="button" className="rounded-pill px-2.5 py-1.5 text-[12.5px] font-medium text-brand hover:bg-white" onClick={() => { insertIntoMessage(`${window.location.origin}${shareProfileUrl}`); setToolsOpen(false); }}>↗ Share profile</button>}
            </div>
            <p className="mt-1 px-2 text-[11px] leading-snug text-ink-faint">Photos and voice notes are private to this conversation. Avoid IDs and sensitive support or health documents.</p>
          </div>
        )}

        {!hasText && !recording && (
          <div className="-mx-2 mb-1.5 flex gap-1.5 overflow-x-auto px-2 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="group" aria-label="Suggested messages">
            {["🙂", "👍", "❤️"].map((emoji) => (
              <button key={emoji} type="button" aria-label={`Insert ${emoji}`} className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[14px] hover:bg-paper-sunk" onClick={() => insertIntoMessage(emoji)}>{emoji}</button>
            ))}
            {suggestions.map((text) => (
              <button
                key={text}
                type="button"
                onClick={() => insertIntoMessage(text)}
                className="shrink-0 whitespace-nowrap rounded-pill border border-line bg-paper px-2.5 py-1 text-[12.5px] text-ink-soft hover:border-brand/40 hover:text-ink"
              >
                {text}
              </button>
            ))}
          </div>
        )}

        <div className="relative flex items-end gap-1.5">
          <button
            type="button"
            onClick={() => setToolsOpen((open) => !open)}
            aria-expanded={toolsOpen}
            aria-controls="composer-tools"
            className={clsx(
              "grid h-10 w-10 shrink-0 place-items-center rounded-full border transition-colors",
              toolsOpen ? "border-brand bg-brand/10 text-brand" : "border-line text-ink-soft hover:text-brand",
            )}
            title="Photo, voice note and more"
          >
            <span className="sr-only">{toolsOpen ? "Close attachments" : "Add a photo, voice note or more"}</span>
            <svg viewBox="0 0 20 20" className={clsx("h-5 w-5 transition-transform", toolsOpen && "rotate-45")} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <path d="M10 4v12M4 10h12" strokeLinecap="round" />
            </svg>
          </button>
          {canAttach && (
            <button
              type="button"
              onClick={() => setPickerOpen((open) => !open)}
              aria-expanded={pickerOpen}
              aria-haspopup="listbox"
              className={clsx(
                "grid h-10 w-10 shrink-0 place-items-center rounded-full border transition-colors",
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
            ref={textareaRef}
            name="body"
            rows={1}
            required={!attached && !selectedMedia}
            placeholder={attached ? `Add a note about ${attached.name.split(" ")[0]} (optional)` : "Write a message"}
            className="max-h-32 min-h-[40px] min-w-0 flex-1 resize-none rounded-[20px] border border-line bg-paper px-3.5 py-2 text-[15px] leading-snug focus:border-brand focus:ring-0"
            onInput={(event) => {
              setHasText(event.currentTarget.value.trim().length > 0);
              event.currentTarget.style.height = "40px";
              event.currentTarget.style.height = `${Math.min(event.currentTarget.scrollHeight, 128)}px`;
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey && window.matchMedia("(min-width: 640px)").matches) {
                event.preventDefault();
                formRef.current?.requestSubmit();
              }
            }}
          />
          <SubmitButton className="btn-primary h-10 min-h-0 shrink-0 rounded-full px-3 py-0 sm:px-4" pendingLabel="">
            <svg viewBox="0 0 20 20" className="h-[18px] w-[18px] sm:hidden" fill="currentColor" aria-hidden="true">
              <path d="M3.4 16.6 17.5 10 3.4 3.4 3.3 8.6l9.2 1.4-9.2 1.4.1 5.2Z" />
            </svg>
            <span className="sr-only sm:not-sr-only">Send</span>
          </SubmitButton>

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
      </div>
      {!online && <p className="mt-2 text-[13px] text-clay">Connection interrupted. Your messages will refresh when you are back online.</p>}
    </>
  );
}

function MessageBody({ body }: { body: string }) {
  const parts = body.split(/(https?:\/\/[^\s<]+)/gi);
  return <p className="whitespace-pre-line break-words text-[14.5px] leading-snug sm:text-[15px] sm:leading-relaxed">{parts.map((part, index) => {
    if (!/^https?:\/\//i.test(part)) return part;
    const href = part.replace(/[),.!?]+$/, "");
    let label = "Open shared link";
    try {
      const url = new URL(href);
      if (url.pathname.startsWith("/listings/")) label = "View room advert";
      else if (url.pathname.startsWith("/people/")) label = "View accommodation profile";
      else if (url.pathname.startsWith("/companies/") || url.pathname.startsWith("/agencies/")) label = "View provider profile";
      else label = url.hostname.replace(/^www\./, "");
    } catch { /* Keep the generic link label for malformed URLs. */ }
    return <Fragment key={index}><a href={href} target="_blank" rel="noopener noreferrer nofollow" className="my-2 flex max-w-full items-center gap-3 rounded-[10px] border border-current/15 bg-black/[0.04] px-3 py-2.5 text-inherit no-underline transition-colors hover:bg-black/[0.08]">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand/10 text-brand" aria-hidden="true">↗</span>
      <span className="min-w-0"><span className="block text-[13px] font-semibold">{label}</span><span className="block truncate text-[11px] opacity-70">{href}</span></span>
    </a>{part.slice(href.length)}</Fragment>;
  })}</p>;
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
