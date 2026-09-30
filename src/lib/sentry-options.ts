import type { ErrorEvent } from "@sentry/nextjs";

/**
 * Errors only: no replay, tracing, user identity, request bodies, cookies or
 * breadcrumbs. What is kept is what's needed to fix a crash without holding
 * anyone's personal details:
 * - the page path (no query string), browser, operating system and device model;
 * - the error message, with anything that looks like an email address, phone
 *   number or long number blanked out. Server-side messages are still
 *   redacted completely, because database and validation errors can quote
 *   what someone typed into a form.
 */
const EMAIL = /[\w.+-]+@[\w-]+\.[\w.-]+/g;
const LONG_NUMBER = /\+?\d[\d\s-]{6,}\d/g;

export function scrubText(text: string) {
  return text.replace(EMAIL, "[email]").replace(LONG_NUMBER, "[number]").slice(0, 300);
}

export function sanitiseError(event: ErrorEvent): ErrorEvent {
  const isBrowser = typeof window !== "undefined";
  delete event.user;
  delete event.breadcrumbs;
  delete event.extra;
  delete event.message;

  // Keep only the page it happened on, never query strings, headers or bodies.
  const url = event.request?.url ? event.request.url.split(/[?#]/)[0] : undefined;
  delete event.request;
  if (url) event.request = { url };

  // Browser / OS / device say which phones are affected; nothing personal.
  const contexts = event.contexts;
  delete event.contexts;
  for (const key of ["browser", "os", "device", "runtime"] as const) {
    const context = contexts?.[key] as { name?: string; version?: string; model?: string } | undefined;
    if (!context) continue;
    event.contexts ??= {};
    event.contexts[key] = { name: context.name, version: context.version, model: context.model } as never;
  }

  if (event.exception?.values) {
    for (const exception of event.exception.values) {
      exception.value = isBrowser && exception.value ? scrubText(exception.value) : "Application error (message redacted)";
      for (const frame of exception.stacktrace?.frames ?? []) {
        delete frame.vars;
        if (frame.filename) frame.filename = frame.filename.split(/[?#]/)[0];
      }
    }
  }
  return event;
}

export const privateErrorOptions = {
  sendDefaultPii: false,
  tracesSampleRate: 0,
  maxBreadcrumbs: 0,
  beforeSend: sanitiseError,
};
