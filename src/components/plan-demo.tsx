"use client";

import type { CSSProperties, ReactNode } from "react";
import { Avatar, C, Chip, Cursor, DemoPlayer, Phone, Win, d, tick, type Scene } from "@/components/pro-demo";
import { PLAN_GUIDES, type PlanGuideKey } from "@/lib/plan-guides";

/**
 * Short tutorial demos for each plan and paid extra, drawn on the same
 * 960×540 stage as the Pro Services demos. All names, places and figures are
 * made-up sample data.
 */

const W = { left: 120, top: 34, width: 720, height: 370 } as const;
const bar = (delay: number): CSSProperties => ({ transformOrigin: "left", animation: `pd-bar 1.1s cubic-bezier(.22,1,.36,1) ${delay}s both` });

function Ad({ title, area, rent, tone = C.sky, badge, style }: { title: string; area: string; rent: string; tone?: string; badge?: ReactNode; style?: CSSProperties }) {
  return (
    <div className="flex items-center gap-3 rounded-[14px] bg-white p-3" style={{ border: `1.5px solid ${C.mist}`, ...style }}>
      <div className="h-[56px] w-[84px] shrink-0 rounded-[10px]" style={{ background: `linear-gradient(135deg, ${tone}, ${C.blue})` }} />
      <div className="min-w-0 flex-1">
        <p className="text-[16px] font-bold">{title}</p>
        <p className="text-[13px]" style={{ color: C.soft }}>{area}</p>
      </div>
      <div className="flex flex-col items-end gap-1">
        <p className="text-[16px] font-bold">{rent}</p>
        {badge}
      </div>
    </div>
  );
}

function Stat({ label, value, delay, tone = C.ink }: { label: string; value: string; delay: number; tone?: string }) {
  return (
    <div className="pd-pop rounded-[14px] bg-white p-4" style={{ border: `1.5px solid ${C.mist}`, ...d(delay) }}>
      <p className="text-[13px] font-semibold" style={{ color: C.soft }}>{label}</p>
      <p className="mt-1 text-[30px] font-extrabold" style={{ color: tone }}>{value}</p>
    </div>
  );
}

function Bubble({ children, me = false, delay }: { children: ReactNode; me?: boolean; delay: number }) {
  return (
    <div className={`pd-in mx-3 mt-3 max-w-[150px] rounded-[14px] px-3 py-2 text-[11.5px] leading-snug ${me ? "ml-auto" : ""}`} style={{ background: me ? "#D9FDD3" : "#fff", color: C.ink, ...d(delay) }}>
      {children}
    </div>
  );
}

const waBtn = (
  <span className="flex items-center justify-center gap-1.5 rounded-full py-2 text-[12px] font-bold text-white" style={{ background: C.wa }}>
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2z" /></svg> WhatsApp
  </span>
);

const ads = {
  maple: { title: "Maple House · 4 rooms", area: "Erdington, Birmingham", rent: "£140/wk", tone: "#549DE5" },
  rowan: { title: "Rowan Court · 6 rooms", area: "Handsworth, Birmingham", rent: "£155/wk", tone: "#2E9E6B" },
  cedar: { title: "12 Cedar Street · 3 rooms", area: "Aston, Birmingham", rent: "£130/wk", tone: "#F5B544" },
  birch: { title: "Birch Lodge · 5 rooms", area: "Perry Barr, Birmingham", rent: "£150/wk", tone: "#9C7BE0" },
};

const SCENES: Record<PlanGuideKey, Scene[]> = {
  FREE: [
    {
      render: () => (
        <Win title="New advert" style={W}>
          {[["Advert title", "Maple House, 4 rooms"], ["Area", "Erdington, Birmingham"], ["Weekly rent", "£140"]].map(([k, v], i) => (
            <div key={k} className="pd-in mb-3" style={d(0.2 + i * 0.5)}>
              <p className="text-[13px] font-semibold" style={{ color: C.soft }}>{k}</p>
              <p className="mt-1 rounded-[10px] bg-white px-3 py-2 text-[16px] font-semibold" style={{ border: `1.5px solid ${C.mist}` }}><span className="pd-type inline-block overflow-hidden whitespace-nowrap align-bottom" style={d(0.4 + i * 0.5)}>{v}</span></p>
            </div>
          ))}
          <div className="pd-in flex gap-2" style={d(1.9)}><Chip>Supported</Chip><Chip>HMO</Chip><Chip tone="green">Women only</Chip></div>
        </Win>
      ),
    },
    {
      render: () => (
        <Win title="Maple House · Rooms and photos" style={W}>
          <div className="grid grid-cols-2 gap-5">
            <div className="space-y-2">
              {["Room 1 · £140/wk", "Room 2 · £140/wk", "Room 3 · £135/wk", "Room 4 · £145/wk"].map((r, i) => (
                <div key={r} className="pd-in flex items-center justify-between rounded-[10px] bg-white px-3 py-2.5 text-[15px] font-semibold" style={{ border: `1.5px solid ${C.mist}`, ...d(0.2 + i * 0.25) }}>
                  {r}<Chip tone={i === 3 ? "grey" : "green"}>{i === 3 ? "Let" : "Available"}</Chip>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: 8 }, (_, i) => (
                <div key={i} className="pd-pop h-[62px] rounded-[10px]" style={{ background: `linear-gradient(135deg, ${[C.sky, C.green, C.amber, "#9C7BE0"][i % 4]}, ${C.blue})`, ...d(0.9 + i * 0.12) }} />
              ))}
              <p className="pd-in col-span-3 text-[13px] font-semibold" style={{ color: C.soft, ...d(2) }}>8 photos per advert</p>
            </div>
          </div>
        </Win>
      ),
    },
    {
      render: () => (
        <Win title="My adverts" style={W}>
          <div className="pd-in rounded-[12px] px-4 py-3 text-[15px] font-semibold" style={{ background: "#FDEFD3", color: "#8A5A00", ...d(0.2) }}>Checking your advert…</div>
          <div className="pd-in mt-4" style={d(1)}><Ad {...ads.maple} badge={<Chip tone="green" className="pd-pop" style={d(1.6)}>{tick}&nbsp;Live</Chip>} /></div>
          <p className="pd-in mt-4 text-[15px]" style={{ color: C.soft, ...d(2) }}>Your advert is now showing in search.</p>
        </Win>
      ),
    },
    {
      render: () => (
        <Win title="Inbox" style={W}>
          <div className="mb-3 flex items-center gap-2"><p className="text-[18px] font-bold">Enquiries</p><Chip tone="amber" className="pd-pop" style={d(1.6)}>3 new</Chip></div>
          {[["SH", "Sarah · Housing officer", "Referral for Room 2"], ["JM", "Jamal", "Can I view on Thursday at 2pm?"], ["RK", "Rita", "Is Room 1 still free?"]].map(([i0, n, m], i) => (
            <div key={n} className="pd-in mb-2 flex items-center gap-3 rounded-[12px] bg-white p-3" style={{ border: `1.5px solid ${C.mist}`, ...d(0.3 + i * 0.4) }}>
              <Avatar initials={i0} color={[C.blue, C.green, "#8A5A00"][i]} />
              <div><p className="text-[15px] font-bold">{n}</p><p className="text-[13px]" style={{ color: C.soft }}>{m}</p></div>
            </div>
          ))}
        </Win>
      ),
    },
  ],
  PROFESSIONAL: [
    {
      render: () => (
        <Win title="Maple House · Photos and video" style={W}>
          <div className="grid grid-cols-4 gap-3">
            <div className="pd-pop relative col-span-2 row-span-2 grid place-items-center rounded-[12px]" style={{ background: `linear-gradient(135deg, ${C.navy2}, ${C.blue})`, ...d(0.9) }}>
              <span className="grid h-14 w-14 place-items-center rounded-full bg-white/90"><svg viewBox="0 0 24 24" className="h-6 w-6" fill={C.blue}><path d="M8 5v14l11-7z" /></svg></span>
              <Chip className="absolute bottom-2 left-2">Walk-through video</Chip>
            </div>
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="pd-pop h-[66px] rounded-[10px]" style={{ background: `linear-gradient(135deg, ${[C.sky, C.green, C.amber, "#9C7BE0"][i % 4]}, ${C.blue})`, ...d(0.2 + i * 0.08) }} />
            ))}
          </div>
          <p className="pd-in mt-4 text-[15px] font-semibold" style={{ color: C.soft, ...d(1.6) }}>Up to 20 photos and a video on every advert</p>
        </Win>
      ),
    },
    {
      render: () => (
        <Phone>
          <p className="px-3 pt-2 text-[12px] font-bold">Rooms in Birmingham</p>
          <div className="flex gap-2 px-3 pt-2">
            {[C.sky, C.green, C.amber].map((c, i) => (
              <span key={c} className={`grid h-11 w-11 place-items-center rounded-full ${i === 0 ? "pd-ring" : ""}`} style={{ background: c, border: `2.5px solid ${i === 0 ? "#E5484D" : "#fff"}` }} />
            ))}
          </div>
          <div className="pd-pop mx-3 mt-3 rounded-[14px] p-3 text-white" style={{ background: `linear-gradient(160deg, ${C.blue}, ${C.navy})`, ...d(0.9) }}>
            <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">Story · Maple House</p>
            <p className="mt-10 text-[15px] font-extrabold leading-tight">New room ready this week</p>
            <p className="mt-1 text-[10px] opacity-80">Disappears in 24 hours</p>
          </div>
        </Phone>
      ),
    },
    {
      render: () => (
        <Win title="Analytics" style={W}>
          <div className="grid grid-cols-3 gap-3">
            <Stat label="Views per advert" value="186" delay={0.2} />
            <Stat label="Enquiry rate" value="7%" delay={0.4} tone={C.green} />
            <Stat label="Occupancy" value="92%" delay={0.6} tone={C.blue} />
          </div>
          <p className="mt-4 text-[13px] font-bold uppercase tracking-wider" style={{ color: C.soft }}>Enquiries by advert</p>
          {[["Maple House", 0.9], ["Rowan Court", 0.6], ["12 Cedar Street", 0.35]].map(([n, w], i) => (
            <div key={n as string} className="mt-2 flex items-center gap-3 text-[14px] font-semibold">
              <span className="w-[130px]">{n}</span>
              <span className="h-3 flex-1 rounded-full" style={{ background: C.mist }}><span className="block h-3 rounded-full" style={{ width: `${(w as number) * 100}%`, background: C.blue, ...bar(1 + i * 0.25) }} /></span>
            </div>
          ))}
        </Win>
      ),
    },
    {
      render: () => (
        <Win title="My adverts · Promotion" style={W}>
          <div className="flex items-center gap-3">
            <p className="text-[17px] font-bold">Included boosts this month</p>
            {[0, 1, 2].map((i) => (
              <span key={i} className="grid h-10 w-10 place-items-center rounded-full text-[18px] font-extrabold text-white" style={{ background: i === 0 ? "#B8C3D1" : C.amber, transition: "background .3s", ...(i === 0 ? { animation: "pd-pop .5s 2s both" } : {}) }}>⚡</span>
            ))}
            <Chip tone="amber" className="pd-pop ml-auto" style={d(2.2)}>2 left</Chip>
          </div>
          <div className="mt-5"><Ad {...ads.maple} badge={<span className="pd-press rounded-full px-3 py-1 text-[13px] font-bold text-white" style={{ background: C.amber, color: C.ink, ...d(1.4) }}>Boost</span>} /></div>
          <div className="pd-in mt-3"><Ad {...ads.rowan} badge={<Chip>Sponsored · 1 free slot</Chip>} /></div>
          <Cursor from={[300, 330]} to={[640, 120]} delay={0.6} />
        </Win>
      ),
    },
  ],
  BUSINESS: [
    {
      render: () => (
        <Win title="Search · Supported rooms in Birmingham" style={W}>
          <div className="space-y-2.5">
            <div className="pd-fly" style={{ ["--fy" as string]: "160px", ...d(0.6) }}><Ad {...ads.rowan} badge={<Chip tone="blue">Priority placement</Chip>} style={{ borderColor: C.sky }} /></div>
            <div className="pd-fly" style={{ ["--fy" as string]: "-80px", ...d(0.6) }}><Ad {...ads.cedar} /></div>
            <div className="pd-fly" style={{ ["--fy" as string]: "-80px", ...d(0.6) }}><Ad {...ads.birch} /></div>
          </div>
        </Win>
      ),
    },
    {
      render: () => (
        <>
          <Phone>
            <div className="mx-3 mt-2 h-[110px] rounded-[12px]" style={{ background: `linear-gradient(135deg, ${C.green}, ${C.blue})` }} />
            <p className="px-3 pt-2 text-[13px] font-bold">Rowan Court · 6 rooms</p>
            <p className="px-3 text-[11px]" style={{ color: C.soft }}>Handsworth · £155/wk</p>
            <div className="pd-press mx-3 mt-4" style={d(1.3)}>{waBtn}</div>
            <div className="mx-3 mt-2 rounded-full py-2 text-center text-[12px] font-bold" style={{ background: C.mist, color: C.blue }}>Message</div>
          </Phone>
          <Cursor from={[700, 420]} to={[470, 210]} delay={0.5} />
          <div className="pd-pop absolute rounded-[14px] bg-white px-4 py-3 text-[15px] font-bold shadow-xl" style={{ left: 620, top: 160, color: C.wa, ...d(1.9) }}>WhatsApp included</div>
        </>
      ),
    },
    {
      render: () => (
        <Win title="Search results" style={W}>
          <p className="text-[13px] font-bold uppercase tracking-wider" style={{ color: C.soft }}>Sponsored</p>
          <div className="mt-2 space-y-2">
            {[ads.rowan, ads.birch].map((a, i) => (
              <div key={a.title} className="pd-in" style={d(0.3 + i * 0.4)}><Ad {...a} style={{ background: "#FFFBF2", borderColor: C.amber }} badge={<Chip tone="amber">Sponsored</Chip>} /></div>
            ))}
          </div>
          <Chip tone="green" className="pd-pop mt-4" style={d(1.6)}>2 of 2 included placements running</Chip>
        </Win>
      ),
    },
    {
      render: () => (
        <Win title="Team · Shared inbox" style={W}>
          <div className="flex items-center gap-2">
            {["PS", "SO", "JL", "AK", "MN", "TB"].map((i0, i) => (
              <span key={i0} className="pd-pop" style={d(0.1 + i * 0.12)}><Avatar initials={i0} size={44} color={[C.blue, C.green, "#8A5A00", "#9C7BE0", C.sky, "#E5484D"][i]} /></span>
            ))}
            <Chip className="pd-in ml-2" style={d(1)}>Up to 25 staff accounts</Chip>
          </div>
          <div className="pd-in mt-5 rounded-[12px] bg-white p-4" style={{ border: `1.5px solid ${C.mist}`, ...d(1.3) }}>
            <p className="text-[15px] font-bold">Referral for Rowan Court · Room 4</p>
            <p className="mt-1 text-[13px]" style={{ color: C.soft }}>From Birmingham support team</p>
            <Chip tone="green" className="pd-pop mt-2" style={d(2)}>Priya replied in 6 minutes</Chip>
          </div>
        </Win>
      ),
    },
  ],
  BOOST: [
    {
      render: () => (
        <>
          <Win title="My adverts" style={W}>
            <div className="space-y-3">
              <Ad {...ads.maple} badge={<span className="pd-press rounded-full px-3 py-1 text-[13px] font-bold" style={{ background: C.amber, color: C.ink, ...d(1.2) }}>⚡ Boost</span>} />
              <Ad {...ads.cedar} badge={<span className="rounded-full px-3 py-1 text-[13px] font-bold" style={{ background: C.mist, color: C.blue }}>⚡ Boost</span>} />
            </div>
          </Win>
          <Cursor from={[400, 380]} to={[740, 104]} delay={0.4} />
          <div className="pd-pop absolute rounded-[16px] bg-white p-5 shadow-2xl" style={{ left: 300, top: 220, width: 360, color: C.ink, ...d(1.8) }}>
            <p className="text-[18px] font-bold">Boost Maple House for 24 hours?</p>
            <p className="mt-1 text-[14px]" style={{ color: C.soft }}>Uses 1 boost credit</p>
            <span className="mt-3 inline-block rounded-full px-4 py-2 text-[14px] font-bold text-white" style={{ background: C.blue }}>Boost now</span>
          </div>
        </>
      ),
    },
    {
      render: () => (
        <Win title="Search · Rooms in Birmingham" style={W}>
          <div className="space-y-2.5">
            <div className="pd-fly" style={{ ["--fy" as string]: "160px", ...d(0.5) }}><Ad {...ads.maple} style={{ borderColor: C.amber, boxShadow: `0 0 0 3px ${C.amber}55` }} badge={<Chip tone="amber">⚡ Boosted · 23:59</Chip>} /></div>
            <div className="pd-fly" style={{ ["--fy" as string]: "-80px", ...d(0.5) }}><Ad {...ads.rowan} /></div>
            <div className="pd-fly" style={{ ["--fy" as string]: "-80px", ...d(0.5) }}><Ad {...ads.birch} /></div>
          </div>
        </Win>
      ),
    },
    {
      render: () => (
        <Win title="How a boost runs" style={W}>
          <div className="relative mt-6 flex h-14 overflow-hidden rounded-[12px]" style={{ background: C.mist }}>
            <span className="flex items-center justify-center text-[14px] font-bold text-white" style={{ width: `${(3 / 24) * 100 + 8}%`, background: C.amber, color: C.ink, ...bar(0.3) }}>First 3h</span>
            <span className="flex flex-1 items-center justify-center text-[14px] font-bold" style={{ background: C.sky, color: "#fff", ...bar(1.1) }}>Rotates hourly with other boosts</span>
          </div>
          <div className="mt-2 flex justify-between text-[13px] font-semibold" style={{ color: C.soft }}><span>Start</span><span>24 hours, then ends by itself</span></div>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="pd-in rounded-[12px] bg-white p-4" style={{ border: `1.5px solid ${C.amber}`, ...d(1.8) }}><p className="text-[15px] font-bold">Leads search</p><p className="text-[13px]" style={{ color: C.soft }}>Top of matching results</p></div>
            <div className="pd-in rounded-[12px] bg-white p-4" style={{ border: `1.5px solid ${C.sky}`, ...d(2.1) }}><p className="text-[15px] font-bold">Shares the top spots</p><p className="text-[13px]" style={{ color: C.soft }}>Fair for every boosted advert</p></div>
          </div>
        </Win>
      ),
    },
    {
      render: () => (
        <Win title="Maple House · Today" style={W}>
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Views today" value="↑ 3×" delay={0.2} tone={C.green} />
            <Stat label="New enquiries" value="4" delay={0.5} tone={C.blue} />
          </div>
          {["Viewing request · Room 2", "Referral · Room 3"].map((m, i) => (
            <div key={m} className="pd-in mt-3 flex items-center gap-3 rounded-[12px] bg-white p-3 text-[15px] font-semibold" style={{ border: `1.5px solid ${C.mist}`, ...d(1.1 + i * 0.4) }}>
              <span style={{ color: C.blue }}>●</span>{m}
            </div>
          ))}
          <p className="pd-in mt-3 text-[12px]" style={{ color: C.soft, ...d(2) }}>Sample figures for illustration</p>
        </Win>
      ),
    },
  ],
  SPONSORED: [
    {
      render: () => (
        <Win title="Sponsor Maple House" style={W}>
          <div className="grid grid-cols-3 gap-3">
            {[["7 days", "£19"], ["30 days", "£59"], ["90 days", "£149"]].map(([l, p], i) => (
              <div key={l} className="pd-in" style={d(0.2 + i * 0.2)}>
                <div className={`rounded-[14px] bg-white p-4 ${i === 1 ? "pd-select" : ""}`} style={{ border: `1.5px solid ${C.mist}`, ...(i === 1 ? d(1.4) : {}) }}>
                  <p className="text-[15px] font-semibold">{l}</p>
                  <p className="mt-1 text-[30px] font-extrabold">{p}</p>
                  <p className="text-[13px]" style={{ color: C.soft }}>One-off payment</p>
                </div>
              </div>
            ))}
          </div>
          <span className="pd-pop mt-5 inline-block rounded-full px-5 py-2.5 text-[15px] font-bold text-white" style={{ background: C.blue, ...d(2) }}>Pay securely with Stripe</span>
          <Cursor from={[100, 320]} to={[330, 110]} delay={0.8} />
        </Win>
      ),
    },
    {
      render: () => (
        <Win title="Search · Rooms in Birmingham" style={W}>
          <div className="pd-in rounded-[14px] p-3" style={{ background: "#FFF6E3", ...d(0.2) }}>
            <p className="mb-2 text-[12px] font-bold uppercase tracking-wider" style={{ color: "#8A5A00" }}>Sponsored</p>
            <div className="pd-pop" style={d(0.7)}><Ad {...ads.maple} style={{ borderColor: C.amber }} badge={<Chip tone="amber">Sponsored</Chip>} /></div>
          </div>
          <p className="mb-2 mt-4 text-[12px] font-bold uppercase tracking-wider" style={{ color: C.soft }}>All adverts</p>
          <div className="pd-in space-y-2" style={d(1.2)}><Ad {...ads.rowan} /></div>
        </Win>
      ),
    },
    {
      render: () => (
        <Win title="Map view" style={W}>
          <div className="relative h-[290px] overflow-hidden rounded-[12px]" style={{ background: "#E8EEF5", backgroundImage: "linear-gradient(#d5dfeb 1px, transparent 1px), linear-gradient(90deg, #d5dfeb 1px, transparent 1px)", backgroundSize: "48px 48px" }}>
            {[[120, 80], [380, 160], [520, 70], [260, 210]].map(([x, y], i) => (
              <span key={i} className="pd-in absolute h-5 w-5 rounded-full border-[3px] border-white" style={{ left: x, top: y, background: C.blue, ...d(0.2 + i * 0.15) }} />
            ))}
            <div className="pd-pop absolute flex flex-col items-center" style={{ left: 300, top: 60, ...d(1.1) }}>
              <span className="rounded-full px-3 py-1 text-[13px] font-bold shadow-lg" style={{ background: C.amber, color: C.ink }}>Sponsored · £140/wk</span>
              <span className="pd-ring mt-1 h-7 w-7 rounded-full border-[3px] border-white" style={{ background: C.amber }} />
            </div>
          </div>
        </Win>
      ),
    },
    {
      render: () => (
        <Win title="Search filters" style={W}>
          <div className="flex flex-wrap gap-2">
            {["Birmingham", "Supported", "Women only", "Under £150/wk"].map((f, i) => <Chip key={f} className="pd-pop" style={d(0.1 + i * 0.15)}>{f}</Chip>)}
          </div>
          <div className="pd-in mt-4" style={d(0.9)}><Ad {...ads.maple} style={{ borderColor: C.amber }} badge={<Chip tone="green">{tick}&nbsp;Matches · shown</Chip>} /></div>
          <div className="pd-in mt-3 opacity-50" style={d(1.4)}><Ad {...ads.rowan} badge={<Chip tone="grey">Doesn&apos;t match · hidden</Chip>} /></div>
        </Win>
      ),
    },
  ],
  WHATSAPP: [
    {
      render: () => (
        <Phone>
          <div className="mx-3 mt-2 h-[120px] rounded-[12px]" style={{ background: `linear-gradient(135deg, ${C.sky}, ${C.blue})` }} />
          <p className="px-3 pt-2 text-[13px] font-bold">Maple House · 4 rooms</p>
          <p className="px-3 text-[11px]" style={{ color: C.soft }}>Erdington · £140/wk · Supported</p>
          <div className="pd-pop mx-3 mt-4" style={d(0.8)}>{waBtn}</div>
          <div className="mx-3 mt-2 rounded-full py-2 text-center text-[12px] font-bold" style={{ background: C.mist, color: C.blue }}>Message</div>
        </Phone>
      ),
    },
    {
      render: () => (
        <>
          <Phone>
            <div className="mx-3 mt-2 h-[120px] rounded-[12px]" style={{ background: `linear-gradient(135deg, ${C.sky}, ${C.blue})` }} />
            <p className="px-3 pt-2 text-[13px] font-bold">Maple House · 4 rooms</p>
            <div className="pd-press mx-3 mt-6" style={d(1.3)}>{waBtn}</div>
          </Phone>
          <Cursor from={[700, 430]} to={[470, 230]} delay={0.4} />
        </>
      ),
    },
    {
      render: () => (
        <Phone>
          <div className="flex items-center gap-2 px-3 py-2 text-white" style={{ background: "#075E54" }}><Avatar initials="M" size={24} color={C.blue} /><span className="text-[12px] font-bold">Maple House</span></div>
          <div className="h-full" style={{ background: "#ECE5DD" }}>
            <Bubble me delay={0.4}>Hi, I&apos;m interested in Maple House on RoomsNow. Is a room still available?</Bubble>
          </div>
        </Phone>
      ),
    },
    {
      render: () => (
        <Phone>
          <div className="flex items-center gap-2 px-3 py-2 text-white" style={{ background: "#075E54" }}><Avatar initials="M" size={24} color={C.blue} /><span className="text-[12px] font-bold">Maple House</span></div>
          <div className="h-full" style={{ background: "#ECE5DD" }}>
            <Bubble me delay={0}>Hi, I&apos;m interested in Maple House on RoomsNow. Is a room still available?</Bubble>
            <Bubble delay={0.7}>Hi! Yes, Room 2 is free. Can you view on Thursday at 2pm?</Bubble>
            <Bubble me delay={1.6}>Perfect, see you then 👍</Bubble>
          </div>
        </Phone>
      ),
    },
  ],
  REFERRER_PRO: [
    {
      render: () => (
        <Win title="My clients" style={W}>
          <div className="mb-3 flex items-center gap-2"><p className="text-[18px] font-bold">Clients</p><Chip tone="green" className="pd-pop" style={d(1.4)}>Unlimited with Pro</Chip></div>
          <div className="grid grid-cols-3 gap-3">
            {[["JM", "J. M.", "Supported · Birmingham"], ["AR", "A. R.", "HMO · Walsall"], ["KT", "K. T.", "Women only · Aston"], ["DS", "D. S.", "Move-on · Erdington"], ["LP", "L. P.", "Supported · Handsworth"], ["NB", "N. B.", "HMO · Perry Barr"]].map(([i0, n, m], i) => (
              <div key={n} className="pd-in flex items-center gap-2 rounded-[12px] bg-white p-3" style={{ border: `1.5px solid ${C.mist}`, ...d(0.1 + i * 0.15) }}>
                <Avatar initials={i0} color={[C.blue, C.green, "#9C7BE0"][i % 3]} />
                <div><p className="text-[14px] font-bold">{n}</p><p className="text-[12px]" style={{ color: C.soft }}>{m}</p></div>
              </div>
            ))}
          </div>
        </Win>
      ),
    },
    {
      render: () => (
        <Win title="Adverts that fit J. M." style={W}>
          <div className="space-y-2.5">
            {[ads.maple, ads.rowan, ads.birch].map((a, i) => (
              <div key={a.title} className="pd-in" style={d(0.2 + i * 0.3)}><Ad {...a} badge={<Chip tone="green">Fits needs</Chip>} /></div>
            ))}
          </div>
        </Win>
      ),
    },
    {
      render: () => (
        <Win title="Share J. M.'s profile" style={W}>
          {["Maple House Ltd", "Rowan Court Housing", "Birch Lodge Support"].map((p, i) => (
            <div key={p} className="mb-2 flex items-center gap-3 rounded-[12px] bg-white p-3 text-[16px] font-semibold" style={{ border: `1.5px solid ${C.mist}` }}>
              <span className="pd-pop grid h-6 w-6 place-items-center rounded-[6px] text-white" style={{ background: C.blue, ...d(0.5 + i * 0.35) }}>{tick}</span>{p}
            </div>
          ))}
          <Chip tone="green" className="pd-pop mt-3" style={d(1.9)}>Shared with 3 providers at once</Chip>
        </Win>
      ),
    },
    {
      render: () => (
        <Win title="Referrals" style={W}>
          {[["J. M. → Maple House", "Viewing booked", "amber"], ["A. R. → Rowan Court", "Moved in", "green"], ["K. T. → Birch Lodge", "Sent", "blue"]].map(([r, s, t], i) => (
            <div key={r} className="pd-in mb-2 flex items-center justify-between rounded-[12px] bg-white p-3" style={{ border: `1.5px solid ${C.mist}`, ...d(0.2 + i * 0.3) }}>
              <span className="text-[15px] font-bold">{r}</span>
              <span className="flex gap-2"><Chip tone="grey">Pro</Chip><Chip tone={t as "amber" | "green" | "blue"}>{s}</Chip></span>
            </div>
          ))}
        </Win>
      ),
    },
  ],
  SERVICES: [
    {
      render: () => (
        <Win title="Business profile" style={W}>
          <div className="flex items-center gap-4">
            <Avatar initials="BS" size={64} color="#8A5A00" />
            <div><p className="text-[22px] font-bold">BrightSpark Electrical</p><p className="text-[14px]" style={{ color: C.soft }}>EICRs, PAT testing, fire alarms</p></div>
            <Chip tone="green" className="pd-pop ml-auto" style={d(1.2)}>{tick}&nbsp;Verified</Chip>
          </div>
          <div className="mt-5 grid grid-cols-4 gap-3">
            {[0, 1, 2, 3].map((i) => <div key={i} className="pd-pop h-[90px] rounded-[12px]" style={{ background: `linear-gradient(135deg, ${[C.amber, C.sky, C.green, "#9C7BE0"][i]}, ${C.navy2})`, ...d(0.3 + i * 0.15) }} />)}
          </div>
          <p className="pd-in mt-3 text-[13px] font-semibold" style={{ color: C.soft, ...d(1.4) }}>Portfolio photos</p>
        </Win>
      ),
    },
    {
      render: () => (
        <Win title="Service adverts" style={W}>
          <div className="flex flex-wrap gap-2">{["Birmingham", "Walsall", "Wolverhampton", "Sandwell"].map((a, i) => <Chip key={a} className="pd-pop" style={d(0.1 + i * 0.15)}>{a}</Chip>)}</div>
          {[["EICR for HMOs", "From £150"], ["Fire alarm servicing", "From £95"]].map(([t, p], i) => (
            <div key={t} className="pd-in mt-3 flex items-center justify-between rounded-[12px] bg-white p-4" style={{ border: `1.5px solid ${C.mist}`, ...d(0.9 + i * 0.3) }}>
              <span className="text-[16px] font-bold">{t}</span><span className="text-[16px] font-bold" style={{ color: C.blue }}>{p}</span>
            </div>
          ))}
        </Win>
      ),
    },
    {
      render: () => (
        <Win title="Quote requests" style={W}>
          <div className="pd-pop rounded-[14px] bg-white p-5" style={{ border: `2px solid ${C.sky}`, ...d(0.3) }}>
            <div className="flex items-center gap-3"><Avatar initials="OL" color={C.green} /><p className="text-[16px] font-bold">Oak Lane Housing</p><Chip tone="amber" className="ml-auto">New</Chip></div>
            <p className="mt-3 text-[16px]">We need EICRs at 3 HMOs in Handsworth before the end of the month. Can you quote?</p>
            <span className="pd-in mt-3 inline-block rounded-full px-4 py-2 text-[14px] font-bold text-white" style={{ background: C.blue, ...d(1.4) }}>Send a quote</span>
          </div>
        </Win>
      ),
    },
    {
      render: () => (
        <Win title="Leads" style={W}>
          <div className="grid grid-cols-3 gap-3">
            <Stat label="Profile views" value="320" delay={0.2} />
            <Stat label="Quote requests" value="14" delay={0.4} tone={C.blue} />
            <Stat label="Won" value="6" delay={0.6} tone={C.green} />
          </div>
          <span className="pd-in mt-5 inline-block rounded-full px-4 py-2 text-[14px] font-bold" style={{ background: C.mist, color: C.blue, ...d(1.2) }}>Download enquiry report</span>
          <p className="pd-in mt-3 text-[12px]" style={{ color: C.soft, ...d(1.5) }}>Sample figures for illustration</p>
        </Win>
      ),
    },
  ],
};

export function PlanDemo({ kind, ...rest }: { kind: PlanGuideKey; autoPlay?: boolean; loop?: boolean; bare?: boolean }) {
  const g = PLAN_GUIDES[kind];
  return <DemoPlayer story={{ title: g.demo.title, endTitle: `RoomsNow ${g.name}`, endLine: g.demo.endLine, captions: g.demo.captions }} scenes={SCENES[kind]} {...rest} />;
}
