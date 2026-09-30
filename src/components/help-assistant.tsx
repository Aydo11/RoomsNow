"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { ADVERT_STARTERS, SEARCH_STARTERS, STARTERS } from "@/lib/assistant/knowledge";
import type { AssistantReply, AssistantState } from "@/lib/assistant/engine";

type Turn =
  | { id: string; role: "user"; text: string }
  | { id: string; role: "assistant"; reply: AssistantReply }
  | { id: string; role: "error"; text: string; retry: string };

const MAX_CHARS = 600;
const SUPPORT_EMAIL = "info@roomsnow.co.uk";
let counter = 0;
const nextId = () => `t${Date.now().toString(36)}${(counter++).toString(36)}`;

/** Pages where the floating button would get in the way of the page's own controls. */
function hiddenOn(path: string) {
  return path.startsWith("/admin") || /^\/messages\/.+/.test(path) || /^\/listings\/[^/]+\/request/.test(path);
}

function listingIdFrom(path: string) {
  const match = path.match(/^\/listings\/([a-z0-9]+)\/?$/i);
  return match?.[1];
}

/**
 * RoomsNow Help Assistant: a floating button that opens a small chat panel.
 * The conversation lives only in this browser tab (nothing is saved on the
 * server). Answers come from /api/assistant; see src/lib/assistant.
 */
export function HelpAssistant() {
  const pathname = usePathname() ?? "/";
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"chat" | "contact">("chat");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [state, setState] = useState<AssistantState | undefined>();
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [speaking, setSpeaking] = useState<string | null>(null);
  const [canSpeak, setCanSpeak] = useState(false);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const listingId = listingIdFrom(pathname);
  const starters = listingId ? ADVERT_STARTERS : pathname.startsWith("/search") ? SEARCH_STARTERS : STARTERS;

  useEffect(() => setCanSpeak(typeof window !== "undefined" && "speechSynthesis" in window), []);

  const close = useCallback(() => {
    setOpen(false);
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    setSpeaking(null);
    requestAnimationFrame(() => launcherRef.current?.focus());
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  useEffect(() => {
    if (open && view === "chat") requestAnimationFrame(() => inputRef.current?.focus());
  }, [open, view]);

  // Other parts of the site can open the assistant with a question ready.
  useEffect(() => {
    const onOpen = (event: Event) => {
      setOpen(true);
      setView("chat");
      const question = (event as CustomEvent<{ question?: string }>).detail?.question;
      if (question) void send(question);
    };
    window.addEventListener("roomsnow:assistant", onOpen);
    return () => window.removeEventListener("roomsnow:assistant", onOpen);
  });

  useEffect(() => {
    const log = logRef.current;
    if (log) log.scrollTo({ top: log.scrollHeight, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }, [turns, busy]);

  async function send(raw: string, retry = false) {
    const text = raw.trim().slice(0, MAX_CHARS);
    if (!text || busy) return;
    // A retry replaces the failed attempt instead of repeating the question.
    let base = turns.filter((turn) => turn.role !== "error");
    if (retry && base[base.length - 1]?.role === "user") base = base.slice(0, -1);
    const userTurn: Turn = { id: nextId(), role: "user", text };
    const history = [...base, userTurn]
      .flatMap<{ role: "user" | "assistant"; content: string }>((turn) =>
        turn.role === "user"
          ? [{ role: "user" as const, content: turn.text }]
          : turn.role === "assistant"
            ? [{ role: "assistant" as const, content: turn.reply.text }]
            : [],
      )
      .slice(-10);
    setTurns([...base, userTurn]);
    setDraft("");
    setBusy(true);
    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: history, state, listingId }),
      });
      const data = (await response.json().catch(() => ({}))) as { reply?: AssistantReply; error?: string };
      if (!response.ok || !data.reply) throw new Error(data.error || "I couldn't get an answer just now.");
      setTurns((current) => [...current, { id: nextId(), role: "assistant", reply: data.reply! }]);
      setState(data.reply.state ?? (data.reply.kind === "search" ? state : state?.search ? { search: state.search } : undefined));
    } catch (error) {
      const message = error instanceof Error && error.message !== "Failed to fetch" ? error.message : "I couldn't connect. Check your internet connection and try again.";
      setTurns((current) => [...current, { id: nextId(), role: "error", text: message, retry: text }]);
    } finally {
      setBusy(false);
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void send(draft);
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void send(draft);
    }
  }

  function speak(id: string, text: string) {
    const synth = window.speechSynthesis;
    synth.cancel();
    if (speaking === id) return setSpeaking(null);
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-GB";
    utterance.rate = 0.95;
    utterance.onend = () => setSpeaking(null);
    utterance.onerror = () => setSpeaking(null);
    setSpeaking(id);
    synth.speak(utterance);
  }

  function startOver() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    setTurns([]);
    setState(undefined);
    setDraft("");
    setView("chat");
    setSpeaking(null);
  }

  const lastAssistant = [...turns].reverse().find((turn) => turn.role === "assistant") as Extract<Turn, { role: "assistant" }> | undefined;
  const lastTurn = turns[turns.length - 1];
  const lastUserText = (() => {
    for (let index = turns.length - 1; index >= 0; index -= 1) {
      const turn = turns[index];
      if (turn.role === "user") return turn.text;
    }
    return "";
  })();

  if (hiddenOn(pathname)) return null;

  return (
    <div className="assist-root print:hidden">
      <button
        ref={launcherRef}
        type="button"
        onClick={() => (open ? close() : setOpen(true))}
        aria-expanded={open}
        aria-controls="roomsnow-assistant"
        aria-label={open ? "Close RoomsNow Help" : "Open RoomsNow Help, an automated assistant"}
        className="assist-launcher"
        data-open={open || undefined}
      >
        <span className="assist-launcher-icon" aria-hidden="true">
          {open ? <CloseIcon /> : <ChatIcon />}
        </span>
        <span className="hidden sm:inline">{open ? "Close" : "Help"}</span>
      </button>

      <section
        id="roomsnow-assistant"
        role="dialog"
        aria-modal="false"
        aria-labelledby={titleId}
        className="assist-panel"
        data-open={open || undefined}
        aria-hidden={!open}
      >
        <header className="assist-header">
          <span className="assist-avatar" aria-hidden="true">
            <ChatIcon />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-[16px] font-semibold leading-tight text-white">
              RoomsNow Help
            </h2>
            <p className="text-[12px] leading-snug text-white/75">Automated assistant</p>
          </div>
          {turns.length > 0 && view === "chat" && (
            <button type="button" onClick={startOver} className="assist-header-btn" aria-label="Start a new conversation">
              <RestartIcon />
            </button>
          )}
          <button type="button" onClick={close} className="assist-header-btn" aria-label="Close RoomsNow Help">
            <CloseIcon />
          </button>
        </header>

        {view === "contact" ? (
          <ContactSupport
            onBack={() => setView("chat")}
            chat={turns.flatMap<{ role: "user" | "assistant"; content: string }>((turn) =>
              turn.role === "user" ? [{ role: "user" as const, content: turn.text }] : turn.role === "assistant" ? [{ role: "assistant" as const, content: turn.reply.text }] : [],
            )}
            lastQuestion={lastUserText}
          />
        ) : (
          <>
            <div ref={logRef} className="assist-log" role="log" aria-live="polite" aria-relevant="additions" aria-label="Conversation">
              <div className="assist-row">
                <div className="assist-bubble assist-bubble-bot">
                  <p>
                    Hi, I&apos;m the RoomsNow Help assistant. I can help you search for a room, understand an advert, contact a provider and use your account.
                  </p>
                  <p className="assist-note">
                    I&apos;m automated, so I can&apos;t see your account or promise a room is available. Please don&apos;t share personal details like
                    ID or bank numbers. In an emergency, call 999.
                  </p>
                </div>
              </div>

              {turns.length === 0 && (
                <div className="assist-starters" role="group" aria-label="Suggested questions">
                  {starters.map((question) => (
                    <button key={question} type="button" className="assist-chip" onClick={() => void send(question)}>
                      {question}
                    </button>
                  ))}
                </div>
              )}

              {turns.map((turn) =>
                turn.role === "user" ? (
                  <div key={turn.id} className="assist-row assist-row-user assist-enter">
                    <p className="assist-bubble assist-bubble-user">
                      <span className="sr-only">You said: </span>
                      {turn.text}
                    </p>
                  </div>
                ) : turn.role === "error" ? (
                  <div key={turn.id} className="assist-row assist-enter" role="alert">
                    <div className="assist-bubble assist-bubble-error">
                      <p>{turn.text}</p>
                      <button type="button" className="assist-link-btn mt-2" onClick={() => void send(turn.retry, true)}>
                        Try again
                      </button>
                    </div>
                  </div>
                ) : (
                  <div key={turn.id} className="assist-row assist-enter">
                    <div className={`assist-bubble assist-bubble-bot${turn.reply.kind === "safety" ? " assist-bubble-safety" : ""}`}>
                      <span className="sr-only">Assistant: </span>
                      <p>{turn.reply.text}</p>
                      {turn.reply.links.length > 0 && (
                        <ul className="assist-links">
                          {turn.reply.links.map((link) => (
                            <li key={link.href}>
                              {link.href.startsWith("/") ? (
                                <Link href={link.href} className="assist-link" onClick={() => matchMedia("(max-width: 639px)").matches && setOpen(false)}>
                                  {link.label}
                                  <ArrowIcon />
                                </Link>
                              ) : (
                                <a href={link.href} target="_blank" rel="noopener noreferrer" className="assist-link">
                                  {link.label}
                                  <span className="sr-only"> (opens in a new tab)</span>
                                  <ExternalIcon />
                                </a>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                        {turn.reply.handoff && (
                          <button type="button" className="assist-link-btn" onClick={() => setView("contact")}>
                            Contact RoomsNow support
                          </button>
                        )}
                        {canSpeak && (
                          <button
                            type="button"
                            className="assist-link-btn assist-quiet"
                            aria-pressed={speaking === turn.id}
                            onClick={() => speak(turn.id, turn.reply.text)}
                          >
                            <SpeakerIcon />
                            {speaking === turn.id ? "Stop" : "Listen"}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ),
              )}

              {busy && (
                <div className="assist-row assist-enter">
                  <div className="assist-bubble assist-bubble-bot assist-typing" role="status" aria-label="The assistant is typing">
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
              )}

              {!busy && lastTurn?.role === "assistant" && lastAssistant && lastAssistant.reply.suggestions.length > 0 && (
                <div className="assist-starters" role="group" aria-label="Suggested follow-up questions">
                  {lastAssistant.reply.suggestions.map((question) => (
                    <button key={question} type="button" className="assist-chip" onClick={() => void send(question)}>
                      {question}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <form onSubmit={onSubmit} className="assist-composer">
              <label htmlFor="roomsnow-assistant-input" className="sr-only">
                Type your question
              </label>
              <textarea
                id="roomsnow-assistant-input"
                ref={inputRef}
                rows={1}
                value={draft}
                maxLength={MAX_CHARS}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Ask a question…"
                className="assist-input"
                aria-describedby="roomsnow-assistant-hint"
              />
              <button type="submit" className="assist-send" disabled={!draft.trim() || busy} aria-label="Send message">
                <SendIcon />
              </button>
              <p id="roomsnow-assistant-hint" className="assist-hint">
                {draft.length > MAX_CHARS - 80 ? `${MAX_CHARS - draft.length} characters left. ` : ""}
                Automated answers from RoomsNow help.{" "}
                <button type="button" className="underline underline-offset-2 hover:text-ink" onClick={() => setView("contact")}>
                  Contact support
                </button>
              </p>
            </form>
          </>
        )}
      </section>
    </div>
  );
}

function ContactSupport({ onBack, chat, lastQuestion }: { onBack: () => void; chat: { role: "user" | "assistant"; content: string }[]; lastQuestion: string }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState(lastQuestion);
  const [includeChat, setIncludeChat] = useState(false);
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState("");
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => headingRef.current?.focus(), [status]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setStatus("sending");
    setError("");
    try {
      const response = await fetch("/api/assistant/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, email, message, includeChat, chat: includeChat ? chat.slice(-12) : [], page: window.location.pathname }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(data.error || "We couldn't send that just now.");
      setStatus("sent");
    } catch (caught) {
      setError(caught instanceof Error && caught.message !== "Failed to fetch" ? caught.message : `We couldn't send that just now. You can email us at ${SUPPORT_EMAIL}.`);
      setStatus("idle");
    }
  }

  if (status === "sent") {
    return (
      <div className="assist-contact">
        <h3 ref={headingRef} tabIndex={-1} className="text-[17px] font-semibold text-ink outline-none">
          Message sent
        </h3>
        <p className="mt-2 text-[14px] leading-relaxed text-ink-soft">
          Thank you. The RoomsNow team will reply to <strong className="text-ink">{email}</strong>. If you need to add anything, you can email {SUPPORT_EMAIL}.
        </p>
        <button type="button" className="btn-secondary mt-5" onClick={onBack}>
          Back to the assistant
        </button>
      </div>
    );
  }

  return (
    <form className="assist-contact" onSubmit={submit} noValidate={false}>
      <button type="button" className="assist-link-btn assist-quiet -ml-1 mb-2" onClick={onBack}>
        <span aria-hidden="true">←</span> Back to the assistant
      </button>
      <h3 ref={headingRef} tabIndex={-1} className="text-[17px] font-semibold text-ink outline-none">
        Contact RoomsNow support
      </h3>
      <div className="assist-what">
        <p className="font-semibold text-ink">What happens when you send this</p>
        <ul>
          <li>Your message is emailed to the RoomsNow team at {SUPPORT_EMAIL}.</li>
          <li>They&apos;ll reply to the email address you give. It&apos;s used only to answer you.</li>
          <li>We don&apos;t save it on the website. The chat is only included if you tick the box.</li>
          <li>Please don&apos;t include health details, ID or bank numbers.</li>
        </ul>
        <p>This isn&apos;t an emergency service. If you&apos;re in danger, call 999.</p>
      </div>
      {error && (
        <p role="alert" className="mt-3 rounded-[10px] border border-clay/40 bg-clay-light p-3 text-[13px] text-ink">
          {error}
        </p>
      )}
      <label className="assist-label" htmlFor="assist-contact-name">
        Your name <span className="font-normal text-ink-faint">(optional)</span>
      </label>
      <input id="assist-contact-name" className="field" value={name} onChange={(event) => setName(event.target.value)} maxLength={80} autoComplete="name" />
      <label className="assist-label" htmlFor="assist-contact-email">
        Email for our reply
      </label>
      <input id="assist-contact-email" className="field" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} maxLength={200} autoComplete="email" inputMode="email" />
      <label className="assist-label" htmlFor="assist-contact-message">
        How can we help?
      </label>
      <textarea id="assist-contact-message" className="field" required minLength={5} rows={4} maxLength={1500} value={message} onChange={(event) => setMessage(event.target.value)} />
      {chat.length > 0 && (
        <label className="mt-3 flex items-start gap-2 text-[13px] leading-snug text-ink-soft" htmlFor="assist-contact-chat">
          <input id="assist-contact-chat" type="checkbox" className="mt-0.5 h-4 w-4 shrink-0 accent-[rgb(var(--color-pine))]" checked={includeChat} onChange={(event) => setIncludeChat(event.target.checked)} />
          Include this chat so the team can see what you&apos;ve already asked
        </label>
      )}
      <button type="submit" className="btn-primary mt-4 w-full" disabled={status === "sending"}>
        {status === "sending" ? "Sending…" : "Send to RoomsNow support"}
      </button>
    </form>
  );
}

/** Opens the assistant from anywhere, optionally asking a question straight away. */
export function openHelpAssistant(question?: string) {
  window.dispatchEvent(new CustomEvent("roomsnow:assistant", { detail: { question } }));
}

function ChatIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-4.5 4v-4h0A1.5 1.5 0 0 1 4 14.5z" />
      <path d="M8.5 8.5h7M8.5 11.5h4.5" />
    </svg>
  );
}
function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  );
}
function RestartIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12a8 8 0 1 0 2.3-5.6M4 4v4.5h4.5" />
    </svg>
  );
}
function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h13M13 6l6 6-6 6" />
    </svg>
  );
}
function ArrowIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 10h11M11 6l4 4-4 4" />
    </svg>
  );
}
function ExternalIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 4H4v12h12v-4M11 4h5v5M16 4l-7 7" />
    </svg>
  );
}
function SpeakerIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 8v4h3l4 3V5L6 8zM13.5 7.5a3.5 3.5 0 0 1 0 5M15.5 5.5a6.5 6.5 0 0 1 0 9" />
    </svg>
  );
}
