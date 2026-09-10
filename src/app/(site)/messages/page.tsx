export const metadata = { title: "Messages" };
export const dynamic = "force-dynamic";

export default function MessagesIndexPage() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-10 text-center">
      <p className="text-[17px] text-ink">Select a conversation</p>
      <p className="max-w-xs text-[14px] text-ink-soft">
        Pick a conversation on the left to read it, or search, archive and delete from your inbox.
      </p>
    </div>
  );
}
