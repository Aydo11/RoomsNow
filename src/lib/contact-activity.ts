export type SenderActivity = {
  senderId: string;
  firstAt: Date | null;
  messageCount: number;
};

/** Only sender IDs and timestamps are needed to describe a conversation's progress. */
export function contactProgress(senders: SenderActivity[], providerUserIds: Set<string>) {
  const ordered = [...senders].filter((sender) => sender.firstAt).sort((a, b) =>
    a.firstAt!.getTime() - b.firstAt!.getTime() || a.senderId.localeCompare(b.senderId),
  );
  const first = ordered[0];
  const providerStarted = first ? providerUserIds.has(first.senderId) : false;
  const providerMessaged = ordered.some((sender) => providerUserIds.has(sender.senderId));
  const otherPersonMessaged = ordered.some((sender) => !providerUserIds.has(sender.senderId));

  return {
    firstSenderId: first?.senderId ?? null,
    providerStarted,
    label: !first
      ? "No messages"
      : providerStarted
        ? otherPersonMessaged ? "Person replied" : "Awaiting person"
        : providerMessaged ? "Provider replied" : "Awaiting provider",
    messageCount: senders.reduce((sum, sender) => sum + sender.messageCount, 0),
  };
}
