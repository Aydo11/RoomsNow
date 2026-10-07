type Participant = { userId: string; companyId: string | null };

/** Pick the person across the conversation, not another member of our own team. */
export function conversationCounterparty<T extends Participant>(
  others: T[],
  companyId: string | null,
  viewerIsProvider: boolean,
): T | undefined {
  if (!companyId) return others[0];
  return viewerIsProvider
    ? others.find((participant) => participant.companyId !== companyId) ?? others[0]
    : others.find((participant) => participant.companyId === companyId) ?? others[0];
}

export function counterpartyProfileUrl({
  viewerIsProvider,
  otherRole,
  otherUserId,
  lookingForAdId,
  providerSlug,
}: {
  viewerIsProvider: boolean;
  otherRole: string | null;
  otherUserId: string | null;
  lookingForAdId: string | null;
  providerSlug: string | null;
}): string | null {
  if (viewerIsProvider) {
    if (otherRole === "REFERRER" && otherUserId) return `/agencies/${otherUserId}`;
    return lookingForAdId ? `/people/${lookingForAdId}` : null;
  }
  if (providerSlug) return `/companies/${providerSlug}`;
  if (otherRole === "REFERRER" && otherUserId) return `/agencies/${otherUserId}`;
  return lookingForAdId ? `/people/${lookingForAdId}` : null;
}
