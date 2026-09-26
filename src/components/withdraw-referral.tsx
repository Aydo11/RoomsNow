"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateReferralStatusAction } from "@/server/actions/referrals";

export function WithdrawReferral({ id }: { id: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      className="btn-ghost text-clay"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await updateReferralStatusAction(id, "WITHDRAWN", "Withdrawn by the referrer.");
          router.refresh();
        })
      }
    >
      {pending ? "Withdrawing…" : "Withdraw referral"}
    </button>
  );
}
