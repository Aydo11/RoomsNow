import "server-only";

const RESEND_API_URL = "https://api.resend.com";

type ResendIdResponse = { id: string };
type ContactImportResponse = ResendIdResponse & { object: "contact_import" };
type ContactImportStatus = {
  id: string;
  status: "pending" | "processing" | "completed" | "failed";
  counts?: { total: number; created: number; updated: number; skipped: number; failed: number };
};

export type PreparedMarketingBroadcast = {
  broadcastId: string;
  importId: string;
  segmentId: string;
};

function cleanEnvValue(value: string | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return "";
  const first = trimmed.at(0);
  const last = trimmed.at(-1);
  return (first === '"' && last === '"') || (first === "'" && last === "'")
    ? trimmed.slice(1, -1).trim()
    : trimmed;
}

function marketingConfig() {
  // Render values are entered without quotes, but accepting matching wrapping
  // quotes prevents a common copy/paste mistake from becoming an opaque 401.
  const apiKey = cleanEnvValue(process.env.RESEND_API_KEY);
  const from = cleanEnvValue(process.env.MARKETING_EMAIL_FROM);
  if (!apiKey || !from) {
    throw new Error("RESEND_API_KEY and MARKETING_EMAIL_FROM are required for marketing broadcasts.");
  }
  if (!apiKey.startsWith("re_")) {
    throw new Error("RESEND_API_KEY does not look like a Resend API key. Copy the full re_ key from Resend into Render, then redeploy.");
  }
  return {
    apiKey,
    from,
  };
}

/** Carries the raw status and body so callers can recognise a specific failure. */
export class ResendApiError extends Error {
  constructor(message: string, readonly status: number, readonly detail: string) {
    super(message);
    this.name = "ResendApiError";
  }
}

/**
 * Resend caps how many segments an account may hold at once, by plan. Every
 * campaign here creates its own segment (so a new batch is never mailed to an
 * earlier batch's contacts), which means that ceiling is reached after a
 * handful of campaigns and every later one fails at the first step. Spotting
 * it by status and body rather than message text lets prepareMarketingBroadcast
 * clear out spent segments and carry on — see createCampaignSegment.
 */
function isSegmentLimitError(error: unknown): error is ResendApiError {
  return (
    error instanceof ResendApiError &&
    error.status === 400 &&
    /segments?/i.test(error.detail) &&
    /upgrade|limit|includes/i.test(error.detail)
  );
}

async function resendRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { apiKey } = marketingConfig();
  const response = await fetch(`${RESEND_API_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "User-Agent": "RoomsNow/1.0",
      ...init.headers,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    console.error(`Resend marketing API failed (${response.status})`, detail.slice(0, 1000));
    const fail = (message: string) => new ResendApiError(message, response.status, detail);
    if (response.status === 400 && /segments?/i.test(detail) && /upgrade|limit|includes/i.test(detail)) {
      throw fail(
        "Resend won't hold any more segments on this plan. RoomsNow clears out the segments from campaigns it has already sent, so this means the remaining ones are still in use or were made outside RoomsNow — delete an old segment in Resend, or upgrade the plan, then try again.",
      );
    }
    if (response.status === 401) {
      throw fail(
        "Resend could not authenticate this campaign. Create a new Full access API key in Resend (a Sending access key cannot create segments or broadcasts), replace RESEND_API_KEY in Render without quote marks, and redeploy.",
      );
    }
    if (response.status === 403) {
      throw fail(
        "Resend authenticated the key but it cannot manage marketing campaigns. Replace it with a Full access Resend API key and redeploy.",
      );
    }
    if (response.status === 422) {
      throw fail(
        "Resend rejected the campaign details. Confirm roomsnow.co.uk is verified and MARKETING_EMAIL_FROM is exactly RoomsNow <info@roomsnow.co.uk>.",
      );
    }
    if (response.status === 429) {
      throw fail("Resend is rate-limiting these requests (its API allows about 10 requests a second). Wait a few seconds and press the button again.");
    }
    throw fail(`Resend could not prepare the campaign (status ${response.status}). Check the Render logs and Resend status, then try again.`);
  }
  // A DELETE may answer 204, or with an empty body: succeeding and then
  // throwing on the parse would read as a failure to the caller.
  const body = await response.text();
  return (body ? JSON.parse(body) : undefined) as T;
}

function csvCell(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

export function marketingContactsCsv(recipients: Array<{ email: string; firstName?: string; lastName?: string }>) {
  const rows = ["Email,First Name,Last Name"];
  for (const recipient of recipients) {
    rows.push([recipient.email, recipient.firstName ?? "", recipient.lastName ?? ""].map(csvCell).join(","));
  }
  return `${rows.join("\r\n")}\r\n`;
}

async function deleteSegment(id: string) {
  await resendRequest<unknown>(`/segments/${encodeURIComponent(id)}`, { method: "DELETE" });
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Creates this campaign's segment, reclaiming the segments of campaigns that
 * have already gone out if Resend says the account is at its plan's ceiling.
 *
 * Deleting a spent segment costs nothing: a contact is an account-level record
 * that segments merely group, and `unsubscribed` is a global flag on that
 * record, so an opt-out survives its segment being removed and is still
 * honoured by every later broadcast. Only segments whose broadcast the audit
 * log records as sent are offered up (see spentCampaignSegmentIds) — one that
 * is prepared but not yet confirmed is still needed by its draft.
 *
 * It clears them only when actually blocked rather than after each send, so
 * the segments stay visible in Resend for reporting for as long as the plan
 * has room for them.
 *
 * Two things learned the hard way from a real 500-recipient send: this only
 * ever needs to free ONE slot (one new segment is being created), so it stops
 * at the first successful delete instead of working through every spent id —
 * and every request here, deletes included, counts against Resend's own
 * account-wide "10 requests a second" ceiling. A long list of spent ids fired
 * back-to-back tripped that ceiling before the retry create() even ran, which
 * surfaced as an opaque 429 in place of the real, actionable segment-limit
 * message. A short pause between requests keeps this well under that limit.
 */
async function createCampaignSegment(name: string, spentSegmentIds: string[]): Promise<ResendIdResponse> {
  const create = () =>
    resendRequest<ResendIdResponse>("/segments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.slice(0, 70) }),
    });

  try {
    return await create();
  } catch (error) {
    if (!isSegmentLimitError(error) || spentSegmentIds.length === 0) throw error;

    let reclaimed = false;
    for (const id of spentSegmentIds) {
      try {
        await deleteSegment(id);
        reclaimed = true;
        break;
      } catch (deleteError) {
        // Already gone, or Resend refused it — try the next one. Still paced,
        // so a long run of refusals can't itself trip the rate limit.
        console.error("Could not reclaim a spent Resend segment", id, deleteError);
      }
      await sleep(250);
    }
    if (!reclaimed) throw error;
    console.info("Reclaimed a spent Resend segment to make room for a new campaign.");
    await sleep(250);
    return create();
  }
}

/**
 * Creates a campaign-specific segment, queues a CSV import and creates a draft
 * Broadcast. It deliberately does not send: the admin must confirm in a second
 * action after Resend reports that the asynchronous import has completed.
 */
export async function prepareMarketingBroadcast(params: {
  campaignName: string;
  recipients: Array<{ email: string; firstName?: string; lastName?: string }>;
  subject: string;
  html: string;
  text: string;
  /** Segments from campaigns already sent, free to delete if the plan is full. */
  spentSegmentIds?: string[];
}): Promise<PreparedMarketingBroadcast> {
  const { from } = marketingConfig();
  const suffix = new Date().toISOString().replace(/[:.]/g, "-");
  // Resend's own segment "name" field caps at 70 characters total. Truncating
  // campaignName to 70 first and then appending " — <suffix>" (~27 more
  // characters) left the assembled name over that cap whenever campaignName
  // ran long — which a long subject line folded into the name (as the
  // provider mailshot does) hits every time, and Resend rejects the whole
  // campaign with a 422 before a single email goes out. Reserve room for the
  // suffix up front instead, so the full timestamp (needed to keep campaign
  // names unique) always survives and the combined name still fits.
  const decoration = ` — ${suffix}`;
  const campaignReference = `${params.campaignName.slice(0, Math.max(0, 70 - decoration.length))}${decoration}`.slice(0, 70);
  const segment = await createCampaignSegment(campaignReference, params.spentSegmentIds ?? []);

  const form = new FormData();
  form.append(
    "file",
    new Blob([marketingContactsCsv(params.recipients)], { type: "text/csv;charset=utf-8" }),
    "roomsnow-marketing-contacts.csv",
  );
  form.append("column_map", JSON.stringify({ email: "Email", first_name: "First Name", last_name: "Last Name" }));
  // Omitting an unsubscribed column is intentional: an upsert must never
  // re-subscribe a contact who has already opted out in Resend.
  form.append("on_conflict", "upsert");
  form.append("segments", JSON.stringify([{ id: segment.id }]));
  const contactImport = await resendRequest<ContactImportResponse>("/contacts/imports", {
    method: "POST",
    body: form,
  });

  const broadcast = await resendRequest<ResendIdResponse>("/broadcasts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      segment_id: segment.id,
      name: campaignReference,
      from,
      subject: params.subject,
      html: params.html,
      text: params.text,
    }),
  });

  return { broadcastId: broadcast.id, importId: contactImport.id, segmentId: segment.id };
}

export async function sendPreparedMarketingBroadcast(params: { broadcastId: string; importId: string }) {
  const contactImport = await resendRequest<ContactImportStatus>(`/contacts/imports/${encodeURIComponent(params.importId)}`);
  if (contactImport.status === "failed") {
    throw new Error("The Resend contact import failed. Open Resend Contacts to review the rejected rows.");
  }
  if (contactImport.status !== "completed") {
    return { sent: false as const, status: contactImport.status };
  }

  await resendRequest<ResendIdResponse>(`/broadcasts/${encodeURIComponent(params.broadcastId)}/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  return { sent: true as const, counts: contactImport.counts };
}
