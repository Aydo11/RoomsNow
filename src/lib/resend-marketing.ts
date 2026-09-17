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

function marketingConfig() {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.MARKETING_EMAIL_FROM;
  if (!apiKey || !from) {
    throw new Error("RESEND_API_KEY and MARKETING_EMAIL_FROM are required for marketing broadcasts.");
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
    throw new Error(`Resend rejected the marketing request with status ${response.status}.`);
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
}): Promise<PreparedMarketingBroadcast> {
  const { from } = marketingConfig();
  const suffix = new Date().toISOString().replace(/[:.]/g, "-");
  const campaignReference = `${params.campaignName.slice(0, 70)} — ${suffix}`;
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
