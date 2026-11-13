"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { DEMO_STORIES, type ProServiceKey } from "@/lib/pro-services";

/**
 * Short motion-design demos for each Pro Service, drawn in code so they stay
 * sharp, light and on-brand. Storyboards written with ChatGPT; all names,
 * addresses and dates are fictional sample data.
 *
 * The stage is a fixed 960×540 canvas scaled to fit, so every scene lays out
 * the same at any size. Each element's base style is its final state and the
 * keyframes only animate *from* somewhere, so reduced motion (or a still
 * thumbnail) shows the finished scene.
 */

export type DemoKind = ProServiceKey;

export const C = { navy: "#171F2E", navy2: "#1D2840", blue: "#1666AA", sky: "#549DE5", paper: "#F7F9FC", mist: "#DCE8F5", amber: "#F5B544", green: "#2E9E6B", ink: "#171F2E", soft: "#5B6678", wa: "#1F8F5F" };
const SCENE_MS = 4200;

export type Scene = { render: () => ReactNode };

export const d = (s: number): CSSProperties => ({ animationDelay: `${s}s` });

export function Win({ title, children, style }: { title: string; children: ReactNode; style?: CSSProperties }) {
  return (
    <div className="pd-in absolute overflow-hidden rounded-[18px] shadow-[0_24px_60px_rgba(0,0,0,.35)]" style={{ background: C.paper, ...style }}>
      <div className="flex items-center gap-1.5 px-4" style={{ height: 38, background: "#fff", borderBottom: `1px solid ${C.mist}` }}>
        <i className="h-2.5 w-2.5 rounded-full" style={{ background: "#F2A7A0" }} />
        <i className="h-2.5 w-2.5 rounded-full" style={{ background: C.amber }} />
        <i className="h-2.5 w-2.5 rounded-full" style={{ background: "#9FD5B9" }} />
        <span className="ml-3 text-[13px] font-semibold" style={{ color: C.soft }}>{title}</span>
      </div>
      <div className="relative p-5" style={{ color: C.ink }}>{children}</div>
    </div>
  );
}

export function Chip({ children, tone = "blue", className = "", style }: { children: ReactNode; tone?: "blue" | "amber" | "green" | "grey"; className?: string; style?: CSSProperties }) {
  const tones = { blue: [C.mist, C.blue], amber: ["#FDEFD3", "#8A5A00"], green: ["#DDF2E8", "#1D6E49"], grey: ["#EEF1F5", C.soft] } as const;
  return <span className={`inline-flex items-center rounded-full px-3 py-1 text-[13px] font-semibold ${className}`} style={{ background: tones[tone][0], color: tones[tone][1], ...style }}>{children}</span>;
}

export function Cursor({ from, to, delay = 0.6 }: { from: [number, number]; to: [number, number]; delay?: number }) {
  return (
    <svg className="pd-cursor absolute z-20 h-7 w-7 drop-shadow" viewBox="0 0 24 24" style={{ left: to[0], top: to[1], ["--fx" as string]: `${from[0] - to[0]}px`, ["--fy" as string]: `${from[1] - to[1]}px`, ...d(delay) }} aria-hidden="true">
      <path d="M4 3l15 8-6.5 1.6L9.8 19z" fill="#fff" stroke={C.navy} strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

export function Avatar({ initials, color = C.blue, size = 30 }: { initials: string; color?: string; size?: number }) {
  return <span className="grid shrink-0 place-items-center rounded-full font-bold text-white" style={{ width: size, height: size, background: color, fontSize: size * 0.4 }}>{initials}</span>;
}

export const tick = (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7" /></svg>
);

/* ---------------- Storyboards ---------------- */

const SCENES: Record<DemoKind, { scenes: Scene[] }> = {
  CRM: {
    scenes: [
      {
        render: () => (
          <Win title="Staff CRM · Team" style={{ left: 120, top: 40, width: 720, height: 360 }}>
            <div className="grid grid-cols-3 gap-4">
              {[["S", "Sam Okafor", "Support worker", "On shift · 14 Oak Road", "green", "#1666AA"], ["P", "Priya Shah", "Team leader", "On shift · 7 Elm Street", "green", "#2E9E6B"], ["J", "Jordan Lee", "Night support", "Off today", "grey", "#8A5A00"]].map(([i0, n, r, st, t, col], i) => (
                <div key={n} className="pd-in" style={d(0.2 + i * 0.25)}>
                  <div className={`rounded-[14px] bg-white p-4 ${i === 0 ? "pd-select" : ""}`} style={{ border: `1.5px solid ${C.mist}`, ...(i === 0 ? d(1.6) : {}) }}>
                    <Avatar initials={i0} size={48} color={col} />
                    <p className="mt-3 text-[16px] font-bold">{n}</p>
                    <p className="text-[13px]" style={{ color: C.soft }}>{r}</p>
                    <Chip tone={t as "green" | "grey"} className="mt-2">{st}</Chip>
                  </div>
                </div>
              ))}
            </div>
            <div className="pd-in mt-4 flex gap-6 text-[14px] font-semibold" style={{ color: C.soft, ...d(1) }}>
              <span><b className="text-[18px]" style={{ color: C.ink }}>12</b> staff</span>
              <span><b className="text-[18px]" style={{ color: C.ink }}>5</b> properties</span>
              <span><b className="text-[18px]" style={{ color: C.green }}>4</b> on shift now</span>
            </div>
            <Cursor from={[600, 280]} to={[110, 150]} delay={1.1} />
          </Win>
        ),
      },
      {
        render: () => (
          <Win title="Sam Okafor · Checks and training" style={{ left: 120, top: 40, width: 720, height: 360 }}>
            <div className="space-y-3">
              {[
                ["Enhanced DBS check", "Renew in 21 days", "amber"],
                ["Right to work", "Checked", "green"],
                ["Safeguarding adults", "Valid to Jun 2027", "green"],
                ["First aid at work", "Valid to Feb 2028", "green"],
              ].map(([n, s, t], i) => (
                <div key={n} className="pd-in" style={d(0.15 + i * 0.2)}>
                  <div className={`flex items-center justify-between rounded-[12px] bg-white px-4 py-3 ${i === 0 ? "pd-flag" : ""}`} style={{ border: `1.5px solid ${i === 0 ? C.amber : C.mist}`, ...(i === 0 ? d(1.2) : {}) }}>
                    <span className="text-[16px] font-semibold">{n}</span>
                    <Chip tone={t as "amber" | "green"}>{s}</Chip>
                  </div>
                </div>
              ))}
            </div>
          </Win>
        ),
      },
      {
        render: () => (
          <>
            <Win title="Visits and tasks · This week" style={{ left: 120, top: 40, width: 720, height: 360 }}>
              <p className="text-[13px] font-semibold uppercase tracking-wider" style={{ color: C.soft }}>New visit</p>
              <div className="pd-pop mt-3 rounded-[14px] bg-white p-5" style={{ border: `2px solid ${C.sky}`, ...d(0.3) }}>
                <p className="text-[20px] font-bold">Weekly property check</p>
                <p className="mt-1 text-[14px]" style={{ color: C.soft }}>14 Oak Road · fire doors, alarms, communal areas</p>
                <div className="mt-4 flex items-center gap-3">
                  <span className="pd-in flex items-center gap-2 rounded-full py-1 pl-1 pr-3 text-[14px] font-semibold" style={{ background: C.mist, color: C.blue, ...d(1.2) }}><Avatar initials="S" size={26} /> Assigned to Sam</span>
                  <Chip tone="amber" className="pd-in" style={d(1.6)}>Friday 10:00</Chip>
                </div>
              </div>
            </Win>
            <div className="pd-in absolute rounded-[14px] bg-white px-4 py-3 text-[14px] font-semibold shadow-xl" style={{ right: 60, top: 300, color: C.ink, ...d(2.2) }}>
              <span style={{ color: C.blue }}>●</span> Sam: added to rota
            </div>
          </>
        ),
      },
      {
        render: () => (
          <Win title="Visits and timesheets" style={{ left: 120, top: 40, width: 720, height: 360 }}>
            <div className="grid grid-cols-2 gap-5">
              <div className="h-[250px] rounded-[14px] p-3" style={{ background: "#EEF3F9" }}>
                <p className="mb-3 text-[13px] font-bold uppercase tracking-wider" style={{ color: C.soft }}>Done</p>
                <div className="pd-fly rounded-[12px] bg-white p-3" style={{ border: `1.5px solid ${C.green}`, ["--fy" as string]: "-30px", ...d(0.3) }}>
                  <p className="flex items-center gap-2 text-[15px] font-bold" style={{ color: C.green }}>{tick} Weekly property check</p>
                  <p className="text-[13px]" style={{ color: C.soft }}>14 Oak Road · 10:05 to 11:20 · notes added</p>
                </div>
              </div>
              <div className="h-[250px] rounded-[14px] p-3" style={{ background: "#EEF3F9" }}>
                <p className="mb-3 text-[13px] font-bold uppercase tracking-wider" style={{ color: C.soft }}>Sam's timesheet</p>
                {[["Mon", "7h 30m"], ["Tue", "7h 30m"], ["Fri", "1h 15m"]].map(([day, h], i) => (
                  <div key={day} className={`flex justify-between rounded-[10px] bg-white px-3 py-2 text-[14px] ${i ? "mt-2" : ""} ${i === 2 ? "pd-pop" : ""}`} style={i === 2 ? { border: `1.5px solid ${C.green}`, ...d(1.3) } : {}}>
                    <span>{day}</span><b>{h}</b>
                  </div>
                ))}
                <p className="pd-in mt-3 text-right text-[15px] font-bold" style={{ color: C.blue, ...d(1.8) }}>Week total 16h 15m</p>
              </div>
            </div>
          </Win>
        ),
      },
    ],
  },

  BESPOKE_CRM: {
    scenes: [
      {
        render: () => (
          <Win title="Willow Housing checks.xlsx" style={{ left: 120, top: 40, width: 720, height: 360 }}>
            <div className="overflow-hidden rounded-[10px] bg-white text-[15px]" style={{ border: `1.5px solid ${C.mist}` }}>
              <div className="grid grid-cols-3 font-bold" style={{ background: "#E7F3EC", color: "#1D6E49" }}>
                {["Property", "Check", "Follow-up"].map((h) => <span key={h} className="px-4 py-2.5">{h}</span>)}
              </div>
              {[["21 Hazel Lane", "Communal lighting", "Tuesday"], ["8 Ash Row", "Fire doors", "Thursday"], ["3 Fern Court", "Smoke alarms", "Friday"]].map((r, i) => (
                <div key={r[0]} className="pd-in grid grid-cols-3" style={{ borderTop: `1px solid ${C.mist}`, ...d(0.3 + i * 0.35) }}>
                  {r.map((c) => <span key={c} className="px-4 py-3">{c}</span>)}
                </div>
              ))}
            </div>
            <p className="pd-in mt-4 text-[14px]" style={{ color: C.soft, ...d(1.6) }}>Three tabs, two people editing, no reminders.</p>
          </Win>
        ),
      },
      {
        render: () => (
          <>
            <Win title="Willow Housing checks.xlsx" style={{ left: 60, top: 70, width: 400, height: 220, opacity: 0.85 }}>
              <div className="rounded-[8px] px-3 py-2 text-[14px] font-semibold" style={{ background: "#FFF6DF", border: `1.5px solid ${C.amber}` }}>21 Hazel Lane · Communal lighting · Tuesday</div>
              <div className="mt-2 px-3 text-[14px]" style={{ color: C.soft }}>8 Ash Row · Fire doors · Thursday</div>
              <div className="mt-2 px-3 text-[14px]" style={{ color: C.soft }}>3 Fern Court · Smoke alarms · Friday</div>
            </Win>
            <svg className="pd-in absolute" style={{ left: 470, top: 160, ...d(0.6) }} width="70" height="40" viewBox="0 0 70 40" aria-hidden="true"><path d="M4 20h56M48 8l12 12-12 12" fill="none" stroke={C.sky} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" /></svg>
            <div className="pd-fly absolute rounded-[16px] bg-white p-5 shadow-2xl" style={{ left: 560, top: 90, width: 340, ["--fx" as string]: "-380px", ...d(0.9) }}>
              <Chip>Task</Chip>
              <p className="mt-3 text-[19px] font-bold" style={{ color: C.ink }}>Check communal lighting</p>
              <p className="text-[14px]" style={{ color: C.soft }}>21 Hazel Lane</p>
              <div className="mt-4 flex gap-2"><Chip tone="amber">Due Tuesday</Chip><Chip tone="grey">Staff check</Chip></div>
            </div>
          </>
        ),
      },
      {
        render: () => (
          <Win title="Willow Housing · Checks workflow" style={{ left: 120, top: 40, width: 720, height: 360 }}>
            <div className="grid grid-cols-2 gap-5">
              {["Staff check complete", "Manager review"].map((col) => (
                <div key={col} className="h-[250px] rounded-[14px] p-3" style={{ background: "#EEF3F9" }}>
                  <p className="mb-3 text-[13px] font-bold uppercase tracking-wider" style={{ color: C.soft }}>{col}</p>
                  {col === "Manager review" && (
                    <div className="pd-move rounded-[12px] bg-white p-4" style={{ border: `1.5px solid ${C.sky}`, ["--fx" as string]: "-330px", ...d(0.3) }}>
                      <p className="text-[16px] font-bold">Check communal lighting</p>
                      <p className="text-[13px]" style={{ color: C.soft }}>21 Hazel Lane · photo attached</p>
                      <div className="mt-3 flex gap-2">
                        <span className="pd-press rounded-full px-4 py-1.5 text-[14px] font-bold text-white" style={{ background: C.green, ...d(1.8) }}>Approve</span>
                        <span className="rounded-full px-4 py-1.5 text-[14px] font-semibold" style={{ background: "#EEF1F5", color: C.soft }}>Send back</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <Cursor from={[200, 300]} to={[400, 150]} delay={1.2} />
          </Win>
        ),
      },
      {
        render: () => (
          <Win title="Willow Housing · Dashboard" style={{ left: 120, top: 40, width: 720, height: 360 }}>
            <div className="grid grid-cols-3 gap-4">
              {[["2", "Approved", C.green], ["1", "Follow-up due", C.amber], ["0", "Overdue", C.sky]].map(([n, l, c], i) => (
                <div key={l} className="pd-pop rounded-[14px] bg-white p-4" style={{ border: `1.5px solid ${C.mist}`, ...d(0.2 + i * 0.2) }}>
                  <p className="text-[40px] font-extrabold leading-none" style={{ color: c }}>{n}</p>
                  <p className="mt-1 text-[14px] font-semibold" style={{ color: C.soft }}>{l}</p>
                </div>
              ))}
            </div>
            <div className="pd-in mt-5 flex items-center justify-between rounded-[12px] bg-white px-4 py-3" style={{ border: `1.5px solid ${C.amber}`, ...d(1.2) }}>
              <span className="text-[16px] font-semibold">Smoke alarms · 3 Fern Court</span>
              <Chip tone="amber">Due Friday</Chip>
            </div>
          </Win>
        ),
      },
    ],
  },

  WEBSITE: {
    scenes: [
      {
        render: () => (
          <Phone>
            <div className="p-4 text-white" style={{ background: `linear-gradient(160deg, ${C.blue}, ${C.sky})` }}>
              <p className="text-[12px] font-bold tracking-widest opacity-80">WILLOW HOUSING</p>
              <p className="mt-2 text-[20px] font-extrabold leading-tight">Safe, settled homes in Birmingham</p>
            </div>
            <div className="space-y-3 p-4">
              {["Supported accommodation", "HMO rooms"].map((t, i) => (
                <div key={t} className="pd-in rounded-[12px] bg-white p-3" style={{ border: `1.5px solid ${C.mist}`, ...d(0.5 + i * 0.3) }}>
                  <p className="text-[15px] font-bold">{t}</p>
                  <p className="text-[12px]" style={{ color: C.soft }}>{i ? "Rooms from £120/week" : "Support for adults 18+"}</p>
                </div>
              ))}
            </div>
          </Phone>
        ),
      },
      {
        render: () => (
          <Phone>
            <div className="p-4">
              <p className="text-[12px] font-bold tracking-widest" style={{ color: C.blue }}>SUPPORTED ACCOMMODATION</p>
              <p className="mt-1 text-[18px] font-extrabold leading-tight">Who we support</p>
              <p className="mt-2 text-[13px] leading-snug" style={{ color: C.soft }}>Adults leaving care, hospital or temporary housing who need a stable home with support.</p>
              <div className="pd-flag mt-4 rounded-[12px] p-3 text-[14px] font-bold" style={{ background: "#DDF2E8", color: "#1D6E49", ...d(0.8) }}>✓ Professional referrals accepted</div>
              <p className="mt-3 text-[13px]" style={{ color: C.soft }}>Housing officers, probation, social workers and support teams.</p>
            </div>
          </Phone>
        ),
      },
      {
        render: () => (
          <Phone>
            <div className="p-4">
              <p className="text-[18px] font-extrabold">Make an enquiry</p>
              <p className="mt-3 text-[12px] font-semibold" style={{ color: C.soft }}>Work email</p>
              <div className="mt-1 rounded-[10px] bg-white px-3 py-2 text-[14px]" style={{ border: `1.5px solid ${C.sky}` }}>
                <span className="pd-type inline-block overflow-hidden whitespace-nowrap align-bottom" style={{ ...d(0.4) }}>alex@example.org</span>
              </div>
              <p className="mt-3 text-[12px] font-semibold" style={{ color: C.soft }}>I'd like to</p>
              <div className="mt-1 flex flex-wrap gap-2">
                <Chip className="pd-select" style={d(1.6)}>Ask about availability</Chip>
                <Chip tone="grey">Arrange a visit</Chip>
              </div>
              <div className="pd-press mt-5 rounded-full py-2.5 text-center text-[15px] font-bold text-white" style={{ background: C.blue, ...d(2.4) }}>Send enquiry</div>
            </div>
          </Phone>
        ),
      },
      {
        render: () => (
          <>
            <div style={{ position: "absolute", left: -150, top: 0 }} className="h-full w-full">
              <Phone>
                <div className="grid h-[330px] place-items-center p-4 text-center">
                  <div className="pd-pop" style={d(0.2)}>
                    <span className="mx-auto grid h-14 w-14 place-items-center rounded-full text-white" style={{ background: C.green }}><svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7" /></svg></span>
                    <p className="mt-3 text-[18px] font-extrabold">Enquiry received</p>
                    <p className="text-[13px]" style={{ color: C.soft }}>Willow Housing will reply soon.</p>
                  </div>
                </div>
              </Phone>
            </div>
            <Win title="Willow Housing · Inbox" style={{ left: 470, top: 90, width: 420, height: 250 }}>
              <div className="pd-fly flex items-center gap-3 rounded-[12px] bg-white p-3" style={{ border: `1.5px solid ${C.sky}`, ["--fx" as string]: "0px", ["--fy" as string]: "-40px", ...d(0.9) }}>
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: C.blue }} />
                <div className="min-w-0 flex-1"><p className="text-[15px] font-bold">Availability enquiry</p><p className="text-[12px]" style={{ color: C.soft }}>alex@example.org · Supported accommodation</p></div>
                <span className="text-[12px] font-semibold" style={{ color: C.blue }}>Just now</span>
              </div>
              <div className="mt-2 rounded-[12px] bg-white p-3 text-[13px]" style={{ color: C.soft, border: `1px solid ${C.mist}` }}>Viewing request · Yesterday</div>
            </Win>
          </>
        ),
      },
    ],
  },

  EXPERT: {
    scenes: [
      {
        render: () => (
          <Phone dark>
            <div className="flex h-[370px] flex-col items-center justify-between p-6 text-white" style={{ background: `linear-gradient(180deg, ${C.wa}, #0E5A3A)` }}>
              <div className="text-center">
                <p className="text-[12px] opacity-80">WhatsApp call</p>
                <div className="pd-ring mx-auto mt-4 grid h-20 w-20 place-items-center rounded-full bg-white/20"><Avatar initials="A" size={64} color={C.blue} /></div>
                <p className="mt-3 text-[20px] font-bold">Alex</p>
                <p className="text-[13px] opacity-80">RoomsNow manager · Connected 00:12</p>
              </div>
              <div className="pd-in w-full rounded-[14px] bg-white/95 p-3 text-left" style={{ color: C.ink, ...d(1) }}>
                <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: C.soft }}>Agenda</p>
                <p className="text-[15px] font-bold">Planning our first HMO</p>
              </div>
            </div>
          </Phone>
        ),
      },
      {
        render: () => (
          <div className="pd-in absolute grid grid-cols-[1fr_250px] gap-4 rounded-[18px] p-4" style={{ left: 70, top: 30, width: 820, height: 380, background: "#0F1624" }}>
            <div className="rounded-[12px] bg-white p-4" style={{ color: C.ink }}>
              <p className="text-[12px] font-bold uppercase tracking-wider" style={{ color: C.soft }}>Shared screen · Compliance checklist</p>
              {["Gas safety certificate", "EICR", "Fire risk assessment", "Certificate dates"].map((t, i) => (
                <p key={t} className="pd-in mt-3 flex items-center gap-2 text-[16px]" style={d(0.3 + i * 0.25)}>
                  <span className="grid h-5 w-5 place-items-center rounded" style={{ background: i < 3 ? C.green : C.mist, color: "#fff" }}>{i < 3 && tick}</span>{t}
                </p>
              ))}
            </div>
            <div className="flex flex-col gap-3">
              <div className="grid h-[110px] place-items-center rounded-[12px]" style={{ background: C.navy2 }}><Avatar initials="A" size={48} /><span className="sr-only">Alex</span></div>
              <div className="grid h-[70px] place-items-center rounded-[12px]" style={{ background: C.navy2 }}><Avatar initials="You" size={40} color={C.soft} /></div>
              <div className="flex-1 rounded-[12px] bg-white p-3" style={{ color: C.ink }}>
                <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: C.soft }}>Action notes</p>
                <p className="pd-pop mt-2 rounded-[8px] px-2 py-1.5 text-[13px] font-semibold" style={{ background: "#FFF6DF", ...d(1.6) }}>Confirm certificate dates</p>
              </div>
            </div>
          </div>
        ),
      },
      {
        render: () => (
          <Phone>
            <div className="flex h-[370px] flex-col gap-3 p-4" style={{ background: "#ECE5DD" }}>
              <p className="text-center text-[11px] font-semibold" style={{ color: C.soft }}>Tuesday</p>
              <div className="pd-in ml-auto max-w-[80%] rounded-[12px] rounded-tr-sm px-3 py-2 text-[14px]" style={{ background: "#D9FDD3", ...d(0.3) }}>How should we log missed checks?<span className="ml-2 text-[10px]" style={{ color: C.soft }}>18:40</span></div>
              <p className="pd-in text-center text-[11px] font-semibold" style={{ color: C.soft, ...d(1.2) }}>Next working morning</p>
              <div className="pd-in max-w-[85%] rounded-[12px] rounded-tl-sm bg-white px-3 py-2 text-[14px]" style={d(1.6)}>
                <p className="text-[11px] font-bold" style={{ color: C.blue }}>Alex · RoomsNow</p>
                Record the reason and set a new due date.<span className="ml-2 text-[10px]" style={{ color: C.soft }}>09:05</span>
              </div>
            </div>
          </Phone>
        ),
      },
      {
        render: () => (
          <Win title="Weekly catch-up · Tue 10:00" style={{ left: 170, top: 40, width: 620, height: 360 }}>
            <div className="flex items-center gap-3"><Avatar initials="A" /><p className="text-[15px] font-semibold">Alex · RoomsNow manager</p><Chip tone="green" className="ml-auto">Week 3</Chip></div>
            <div className="mt-5 space-y-3">
              <div className="pd-in flex items-center gap-3 rounded-[12px] bg-white p-3" style={{ border: `1.5px solid ${C.green}`, ...d(0.5) }}>
                <span className="grid h-6 w-6 place-items-center rounded-full text-white" style={{ background: C.green }}>{tick}</span>
                <span className="text-[16px] font-semibold">Set up checks log</span><Chip tone="green" className="ml-auto">Done</Chip>
              </div>
              <div className="pd-in flex items-center gap-3 rounded-[12px] bg-white p-3" style={{ border: `1.5px solid ${C.mist}`, ...d(1.1) }}>
                <span className="h-6 w-6 rounded-full" style={{ border: `2px solid ${C.sky}` }} />
                <span className="text-[16px] font-semibold">Assign a reviewer</span><Chip tone="amber" className="pd-pop ml-auto" style={d(1.8)}>Carried to next week</Chip>
              </div>
            </div>
          </Win>
        ),
      },
    ],
  },
};

export function Phone({ children, dark = false }: { children: ReactNode; dark?: boolean }) {
  return (
    <div className="pd-in absolute overflow-hidden rounded-[34px] shadow-[0_24px_60px_rgba(0,0,0,.4)]" style={{ left: 375, top: 18, width: 210, height: 412, background: dark ? "#000" : C.paper, border: "8px solid #0B1220", color: C.ink }}>
      <div className="mx-auto mt-1 h-4 w-20 rounded-full" style={{ background: "#0B1220" }} />
      {children}
    </div>
  );
}

const CSS = `
.pd-stage *{box-sizing:border-box}
html[data-theme="dark"] .pd-stage .bg-white,html[data-theme="dark"] .pd-stage [class~="bg-white/90"]{background-color:#fff}
@keyframes pd-in{from{opacity:0;transform:translateY(18px)}}
@keyframes pd-pop{0%{opacity:0;transform:scale(.85)}70%{transform:scale(1.04)}}
@keyframes pd-fly{from{opacity:0;transform:translate(var(--fx,0),var(--fy,0)) scale(.9)}}
@keyframes pd-move{0%,25%{transform:translateX(var(--fx,0))}}
@keyframes pd-cursor{0%{opacity:0;transform:translate(var(--fx),var(--fy))}15%{opacity:1;transform:translate(var(--fx),var(--fy))}85%{transform:none}90%{transform:scale(.85)}}
@keyframes pd-select{0%,55%{box-shadow:none}100%{box-shadow:0 0 0 3px ${C.sky}}}
@keyframes pd-flag{0%{box-shadow:0 0 0 0 rgba(245,181,68,.7)}100%{box-shadow:0 0 0 14px rgba(245,181,68,0)}}
@keyframes pd-press{0%,60%{transform:none}75%{transform:scale(.92)}100%{transform:none}}
@keyframes pd-type{from{max-width:0}}
@keyframes pd-ring{0%{box-shadow:0 0 0 0 rgba(255,255,255,.5)}100%{box-shadow:0 0 0 22px rgba(255,255,255,0)}}
@keyframes pd-bar{from{transform:scaleX(0)}}
@keyframes pd-cap{from{opacity:0;transform:translateY(12px)}}
.pd-in{animation:pd-in .7s cubic-bezier(.22,1,.36,1) both}
.pd-pop{animation:pd-pop .6s cubic-bezier(.22,1,.36,1) both}
.pd-fly{animation:pd-fly .9s cubic-bezier(.22,1,.36,1) both}
.pd-move{animation:pd-move 1.4s cubic-bezier(.65,0,.35,1) both}
.pd-cursor{animation:pd-cursor 1.8s cubic-bezier(.65,0,.35,1) both}
.pd-select{animation:pd-select 1.6s ease both}
.pd-flag{animation:pd-flag 1.4s ease-out 3 both}
.pd-press{animation:pd-press .9s ease both}
.pd-type{max-width:20ch;animation:pd-type 1.2s steps(16) both}
.pd-ring{animation:pd-ring 1.6s ease-out infinite}
.pd-bar{transform-origin:left;animation:pd-bar ${SCENE_MS}ms linear both}
.pd-cap{animation:pd-cap .6s cubic-bezier(.22,1,.36,1) both}
.pd-paused *{animation-play-state:paused!important}
@media (prefers-reduced-motion:reduce){.pd-stage *{animation:none!important}}
`;

/** A playable demo for one service. `autoPlay` starts it straight away (public demo pages, recording). */
export function ProDemo({ kind, ...rest }: { kind: DemoKind; autoPlay?: boolean; loop?: boolean; bare?: boolean }) {
  return <DemoPlayer story={DEMO_STORIES[kind]} scenes={SCENES[kind].scenes} {...rest} />;
}

export type DemoStory = { title: string; endTitle?: string; endLine: string; captions: string[] };

/** The player behind every demo: scenes, captions, progress and controls. */
export function DemoPlayer({ story, scenes, autoPlay = false, loop = false, bare = false }: { story: DemoStory; scenes: Scene[]; autoPlay?: boolean; loop?: boolean; bare?: boolean }) {
  // Bare (recording) mode starts after a beat, once the stage has its final size.
  const demo = { ...story, endTitle: story.endTitle ?? story.title, scenes };
  const [state, setState] = useState<"idle" | "playing" | "paused" | "ended">(autoPlay && !bare ? "playing" : "idle");
  const [scene, setScene] = useState(0);
  const [scale, setScale] = useState(1);
  const box = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const started = useRef(0);
  const remaining = useRef(SCENE_MS);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setScale(e.contentRect.width / 960));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!(autoPlay && bare)) return;
    const t = setTimeout(() => setState("playing"), 1200);
    return () => clearTimeout(t);
  }, [autoPlay, bare]);

  useEffect(() => {
    if (state !== "playing") return;
    started.current = Date.now();
    let fired = false;
    timer.current = setTimeout(() => {
      fired = true;
      remaining.current = SCENE_MS;
      if (scene < demo.scenes.length - 1) setScene((s) => s + 1);
      else if (loop) setScene(0);
      else setState("ended");
    }, remaining.current);
    return () => {
      if (timer.current) clearTimeout(timer.current);
      if (!fired) remaining.current = Math.max(0, remaining.current - (Date.now() - started.current));
    };
  }, [state, scene, loop, demo.scenes.length]);

  const play = () => {
    if (state === "ended" || state === "idle") { setScene(0); remaining.current = SCENE_MS; }
    setState("playing");
  };
  const current = { ...demo.scenes[scene], caption: demo.captions[scene] };

  return (
    <div className="pd-stage relative w-full select-none overflow-hidden rounded-[18px]" style={{ aspectRatio: "16 / 9", background: `radial-gradient(120% 90% at 50% 40%, ${C.navy2}, ${C.navy})` }} ref={box}>
      <style>{CSS}</style>
      <div className={`absolute left-0 top-0 origin-top-left ${state === "paused" ? "pd-paused" : ""}`} style={{ width: 960, height: 540, transform: `scale(${scale})`, fontFamily: "var(--rn-font-sans), system-ui, sans-serif" }}>
        {/* drifting dot grid */}
        <div className="absolute inset-0 opacity-60" style={{ backgroundImage: `radial-gradient(${C.sky}33 1.5px, transparent 1.5px)`, backgroundSize: "36px 36px" }} />

        {(state === "playing" || state === "paused") && (
          <>
            <div key={`s${scene}`} className="absolute inset-0" aria-hidden="true">{current.render()}</div>
            <div className="absolute inset-x-0 bottom-0 h-[150px]" style={{ background: `linear-gradient(transparent, ${C.navy}EE)` }} />
            <p key={`c${scene}`} className="pd-cap absolute left-10 font-extrabold text-white" style={{ bottom: 38, fontSize: 34, letterSpacing: "-0.02em", fontFamily: "var(--rn-font-display), sans-serif" }}>
              {current.caption}
            </p>
            <div className="absolute flex gap-1.5" style={{ left: 40, right: 40, bottom: 18 }}>
              {demo.scenes.map((_, i) => (
                <span key={i} className="h-[5px] flex-1 overflow-hidden rounded-full bg-white/20">
                  {i < scene && <span className="block h-full w-full bg-white" />}
                  {i === scene && <span key={`b${scene}`} className="pd-bar block h-full w-full bg-white" />}
                </span>
              ))}
            </div>
          </>
        )}

        {(state === "ended" || (state === "idle" && !bare)) && (
          <div className="absolute inset-0 grid place-items-center text-center text-white">
            <div className={state === "ended" ? "pd-pop" : ""}>
              <svg viewBox="0 0 48 48" className="mx-auto h-16 w-16" aria-hidden="true"><rect x="4" y="4" width="40" height="40" rx="11" fill={C.blue} /><path d="M14 33V22l10-8 10 8v11z" fill="#fff" /><rect x="21" y="25" width="6" height="8" rx="1" fill={C.blue} /></svg>
              <p className="mt-4 font-extrabold" style={{ fontSize: 46, letterSpacing: "-0.02em", fontFamily: "var(--rn-font-display), sans-serif" }}>{state === "ended" ? demo.endTitle : demo.title}</p>
              <p className="mt-1 text-[22px]" style={{ color: C.mist }}>{state === "ended" ? demo.endLine : `${demo.scenes.length} scenes · ${Math.round((demo.scenes.length * SCENE_MS) / 1000)} seconds`}</p>
              {state === "ended" && <p className="mt-6 inline-block rounded-full px-5 py-2 text-[18px] font-bold" style={{ background: C.blue }}>roomsnow.co.uk</p>}
            </div>
          </div>
        )}
      </div>

      {/* Controls sit outside the scaled canvas so they stay a usable size. */}
      {!bare && (state === "idle" || state === "ended") && (
        <button type="button" onClick={play} aria-label={`${state === "ended" ? "Replay" : "Play"} the ${demo.title} demo`} className="group absolute inset-0 grid place-items-end justify-items-start p-[3%] focus-visible:outline-none">
          <span className="flex items-center gap-2 rounded-full bg-fixed-white px-4 py-2 text-[14px] font-bold text-[#0F4F87] shadow-lg transition hover:scale-105 group-focus-visible:ring-4 group-focus-visible:ring-[#549DE5]">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">{state === "ended" ? <path d="M12 5V2L7 6l5 4V7a6 6 0 1 1-6 6H4a8 8 0 1 0 8-8z" /> : <path d="M8 5v14l11-7z" />}</svg>
            {state === "ended" ? "Replay" : "Play demo"}
          </span>
        </button>
      )}
      {!bare && (state === "playing" || state === "paused") && (
        <button type="button" onClick={() => setState(state === "playing" ? "paused" : "playing")} aria-label={state === "playing" ? "Pause demo" : "Resume demo"} className="absolute right-[2%] top-[3%] grid h-9 w-9 place-items-center rounded-full bg-black/40 text-white backdrop-blur hover:bg-black/60">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">{state === "playing" ? <path d="M7 5h4v14H7zM13 5h4v14h-4z" /> : <path d="M8 5v14l11-7z" />}</svg>
        </button>
      )}
      <p className="sr-only" aria-live="polite">{state === "playing" ? `Scene ${scene + 1} of ${demo.scenes.length}: ${current.caption}` : ""}</p>
    </div>
  );
}

