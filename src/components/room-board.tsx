"use client";

import { useTransition } from "react";
import { addRoomAction, updateRoomStatusAction } from "@/server/actions/listings";
import { ROOM_STATUSES } from "@/lib/taxonomy";
import { money } from "@/lib/format";
import type { RoomStatus } from "@prisma/client";

type Room = {
  id: string;
  name: string;
  status: string;
  weeklyRent: number | null;
  ensuite: boolean;
};

export function RoomBoard({ listingId, rooms }: { listingId: string; rooms: Room[] }) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="card divide-y divide-line">
      {rooms.map((room) => (
        <div key={room.id} className="flex flex-wrap items-center gap-4 px-4 py-3">
          <div className="min-w-0 flex-1 basis-[15rem]">
            <p className="text-[15px]">{room.name}</p>
            <p className="text-[13px] text-ink-faint">
              {room.weeklyRent ? `${money(room.weeklyRent)} per week` : "No rent set"}
              {room.ensuite ? " · en-suite" : ""}
            </p>
          </div>
          <label className="sr-only" htmlFor={`status-${room.id}`}>Status for {room.name}</label>
          <select
            id={`status-${room.id}`}
            className="field w-auto"
            defaultValue={room.status}
            disabled={pending}
            onChange={(event) =>
              startTransition(() => updateRoomStatusAction(room.id, event.target.value as RoomStatus))
            }
          >
            {Object.entries(ROOM_STATUSES).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
      ))}

      <div className="px-4 py-3">
        <button
          className="btn-ghost"
          disabled={pending}
          onClick={() =>
            startTransition(() => addRoomAction(listingId, `Room ${rooms.length + 1}`))
          }
        >
          Add another room
        </button>
      </div>
    </div>
  );
}
