import { shortDate } from "./format";

export type RequestSummary = {
  listingTitle: string;
  moveInDate?: Date | null;
  accommodationNeeds?: string | null;
  supportNeeds?: string | null;
  additionalInfo?: string | null;
};

/** The first message in the thread, written as the applicant. */
export function requestMessageBody(summary: RequestSummary): string {
  const lines = [`Hi, I've sent an accommodation request for ${summary.listingTitle}.`];
  const details: string[] = [];
  if (summary.moveInDate) details.push(`Move-in date: ${shortDate(summary.moveInDate)}`);
  if (summary.accommodationNeeds?.trim()) details.push(`Accommodation needs: ${summary.accommodationNeeds.trim()}`);
  if (summary.supportNeeds?.trim()) details.push(`Support needs: ${summary.supportNeeds.trim()}`);
  if (details.length) lines.push("", ...details);
  if (summary.additionalInfo?.trim()) lines.push("", summary.additionalInfo.trim());
  return lines.join("\n");
}

export const requestThreadKey = (listingId: string, applicantId: string) => `${listingId}:${applicantId}`;
