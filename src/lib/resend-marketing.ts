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
    if (response.status === 401) {
      throw new Error(
        "Resend could not authenticate this campaign. Create a new Full access API key in Resend (a Sending access key cannot create segments or broadcasts), replace RESEND_API_KEY in Render without quote marks, and redeploy.",
      );
    }
    if (response.status === 403) {
      throw new Error(
        "Resend authenticated the key but it cannot manage marketing campaigns. Replace it with a Full access Resend API key and redeploy.",
      );
    }
    if (response.status === 422) {
      throw new Error(
        "Resend rejected the campaign details. Confirm roomsnow.co.uk is verified and MARKETING_EMAIL_FROM is exactly RoomsNow <info@roomsnow.co.uk>.",
      );
    }
    throw new Error(`Resend could not prepare the campaign (status ${response.status}). Check the Render logs and Resend status, then try again.`);
  }
  return (await response.json()) as T;
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
  /** Segments from broadcasts that have already been sent and can be reclaimed. */
  spentSegmentIds?: string[];
}): Promise<PreparedMarketingBroadcast> {
  const { from } = marketingConfig();
  const suffix = new Date().toISOString().replace(/[:.]/g, "-");
  const campaignReference = `${params.campaignName.slice(0, 70)} — ${suffix}`;

  // Resend plans cap the number of segments. Once a broadcast has been sent,
  // its one-campaign segment is no longer needed. Reclaim those before making
  // the new one; an already-deleted segment is harmless and must not prevent a
  // new campaign being prepared.
  if (params.spentSegmentIds?.length) {
    await Promise.allSettled(
      params.spentSegmentIds.map((id) =>
        resendRequest<ResendIdResponse>(`/segments/${encodeURIComponent(id)}`, { method: "DELETE" }),
      ),
    );
  }

  const segment = await resendRequest<ResendIdResponse>("/segments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: campaignReference }),
  });

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
