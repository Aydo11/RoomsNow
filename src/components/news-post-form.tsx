"use client";

import { useActionState, useState } from "react";
import { saveNewsPostAction } from "@/server/actions/news";
import { NEWS_CATEGORIES, type NewsCategory } from "@/lib/news";
import { FormError, FormSuccess, SubmitButton } from "./ui";
import { NewsBodyEditor } from "./news-body-editor";

export type NewsPostDraft = {
  id: string;
  category: string;
  title: string;
  summary: string;
  body: string;
  bodyFont: string | null;
  linkUrl: string | null;
  linkLabel: string | null;
  imageUrl: string | null;
  pinned: boolean;
  publishedAt: Date | null;
  appealStatus: string | null;
  appealOrganiser: string | null;
  appealRelationship: string | null;
  appealPurpose: string | null;
  appealDonationRecipient: string | null;
  appealCharityRegistration: string | null;
  appealGiftAidStatus: string | null;
  appealDonateUrl: string | null;
  appealVolunteerUrl: string | null;
  appealBankAccountName: string | null;
  appealBankSortCode: string | null;
  appealBankAccountNumber: string | null;
  appealBankReference: string | null;
  sectorSourceName: string | null;
  sectorSourceUrl: string | null;
  sectorReviewedOn: Date | null;
  authorName: string | null;
  assigneeId: string | null;
};

type TeamMember = { id: string; name: string; moderator: boolean };

type FieldProps = { name: string; label: string; help: string; value?: string | null; long?: boolean; type?: string; placeholder?: string; error?: string };

function Field({ name, label, help, value, long, type = "text", placeholder, error }: FieldProps) {
  const id = `news-${name}`;
  return (
    <div className={long ? "sm:col-span-2" : undefined}>
      <label htmlFor={id} className="label">{label}</label>
      {long ? (
        <textarea id={id} name={name} rows={2} className="field" defaultValue={value ?? ""} placeholder={placeholder} aria-describedby={`${id}-help`} />
      ) : (
        <input id={id} name={name} type={type} className="field" defaultValue={value ?? ""} placeholder={placeholder} aria-describedby={`${id}-help`} />
      )}
      <p id={`${id}-help`} className="mt-1 text-[12.5px] text-ink-faint">{help}</p>
      {error && <p className="mt-1 text-[12.5px] text-clay">{error}</p>}
    </div>
  );
}

/** Admin: write or edit a News post. Leaving "Publish" unticked saves a draft. */
export function NewsPostForm({ post, check, team = [], defaultAuthor = "", fullAdmin = true }: { post?: NewsPostDraft; check?: boolean; team?: TeamMember[]; defaultAuthor?: string; fullAdmin?: boolean }) {
  const [state, action] = useActionState(saveNewsPostAction, { ok: false });
  const [category, setCategory] = useState(post?.category ?? "ROOMSNOW");
  const [appeal, setAppeal] = useState(post?.appealStatus ?? "");
  const e = state.errors ?? {};
  const err = (key: string) => e[key] && <p className="mt-1 text-[12.5px] text-clay">{e[key]}</p>;
  const charity = category === "CHARITY";
  const hasAppeal = charity && appeal !== "";
  const reviewed = post?.sectorReviewedOn ? new Date(post.sectorReviewedOn).toISOString().slice(0, 10) : "";

  // noValidate: hidden sections can hold half-typed links; the server checks only what applies.
  return (
    <form action={action} noValidate className="card grid gap-4 p-5 sm:grid-cols-2">
      {post && <input type="hidden" name="id" value={post.id} />}
      <div className="sm:col-span-2">
        <FormSuccess message={state.ok ? state.message : undefined} />
        <FormError message={e.form ?? (check && !state.ok && !state.errors ? "This post needs a few more details before it can go live. Fill in the highlighted section and tick Publish." : undefined)} />
      </div>

      <div>
        <label htmlFor="news-category" className="label">Category</label>
        <select id="news-category" name="category" className="field" value={category} onChange={(ev) => { setCategory(ev.target.value); if (!post && ev.target.value === "CHARITY" && appeal === "") setAppeal("OPEN"); }}>
          {(Object.keys(NEWS_CATEGORIES) as NewsCategory[]).map((key) => (
            <option key={key} value={key}>{NEWS_CATEGORIES[key].label}</option>
          ))}
        </select>
        {err("category")}
      </div>
      <div>
        <label htmlFor="news-image" className="label">Cover photo {post?.imageUrl ? "(choose one to replace it)" : "(optional)"}</label>
        <input id="news-image" name="image" type="file" accept="image/*" className="field" />
        {err("image")}
      </div>

      <div>
        <label htmlFor="news-author" className="label">Written by</label>
        <input id="news-author" name="authorName" maxLength={80} className="field" defaultValue={post ? (post.authorName ?? "") : defaultAuthor} placeholder="e.g. Ayden, founder of RoomsNow" aria-describedby="news-author-help" />
        <p id="news-author-help" className="mt-1 text-[12.5px] text-ink-faint">Shown as the byline. Leave blank to show it as from RoomsNow.</p>
      </div>
      {fullAdmin ? (
        <div>
          <label htmlFor="news-assignee" className="label">Kept up to date by</label>
          <select id="news-assignee" name="assigneeId" className="field" defaultValue={post?.assigneeId ?? ""} aria-describedby="news-assignee-help">
            <option value="">Nobody assigned</option>
            {team.map((m) => (
              <option key={m.id} value={m.id}>{m.name}{m.moderator ? " (moderator)" : ""}</option>
            ))}
          </select>
          <p id="news-assignee-help" className="mt-1 text-[12.5px] text-ink-faint">They get a notification and can edit this post from their admin menu. Add people under Team &amp; permissions.</p>
          {err("assigneeId")}
        </div>
      ) : (
        <div />
      )}

      <div className="sm:col-span-2">
        <label htmlFor="news-title" className="label">Headline</label>
        <input id="news-title" name="title" required maxLength={120} className="field" defaultValue={post?.title} placeholder="e.g. Help us build a farm school in The Gambia" />
        {err("title")}
      </div>
      <div className="sm:col-span-2">
        <label htmlFor="news-summary" className="label">Summary</label>
        <textarea id="news-summary" name="summary" required maxLength={240} rows={2} className="field" defaultValue={post?.summary} placeholder="One or two sentences. Shown on the News page and the homepage banner." />
        {err("summary")}
      </div>
      <NewsBodyEditor defaultValue={post?.body} defaultFont={post?.bodyFont} error={e.body} />

      {/* Charity appeal. Sections are hidden, not removed, so switching category and back keeps what was typed. */}
      <fieldset hidden={!charity} className="grid gap-4 rounded-card border border-line p-4 sm:col-span-2 sm:grid-cols-2">
        <legend className="px-1 text-[15px] font-semibold">Charity appeal</legend>
        <div className="sm:col-span-2">
          <label htmlFor="news-appealStatus" className="label">Appeal status</label>
          <select id="news-appealStatus" name="appealStatus" className="field" value={appeal} onChange={(ev) => setAppeal(ev.target.value)} aria-describedby="news-appealStatus-help">
            <option value="">Just a story (no donations)</option>
            <option value="OPEN">Open: collecting donations or volunteers</option>
            <option value="CLOSED">Closed</option>
          </select>
          {err("appealStatus")}
          <p id="news-appealStatus-help" className="mt-1 text-[12.5px] text-ink-faint">Choose Open to invite donations or volunteers. Closing the appeal removes those buttons from the public article.</p>
        </div>
        <div hidden={!hasAppeal} className="grid gap-4 sm:col-span-2 sm:grid-cols-2">
          <Field name="appealOrganiser" label="Organised by" help="The public name of the person or organisation running the appeal." value={post?.appealOrganiser} error={e.appealOrganiser} />
          <Field name="appealDonationRecipient" label="Who receives donations" help="Use the name shown on the donation page. If a partner receives the money, enter the partner's name." value={post?.appealDonationRecipient} error={e.appealDonationRecipient} />
          <Field name="appealRelationship" label="Relationship to RoomsNow" long help="Explain any connection to RoomsNow, its founder or team, e.g. “This appeal is organised by RoomsNow's founder.”" value={post?.appealRelationship} error={e.appealRelationship} />
          <Field name="appealPurpose" label="What the appeal supports" long help="What donations or volunteer time will pay for or do." value={post?.appealPurpose} error={e.appealPurpose} />
          <Field name="appealCharityRegistration" label="Charity registration" help="Registered name, regulator and number (e.g. Charity Commission 1234567). If unregistered or unchecked, say so." value={post?.appealCharityRegistration} error={e.appealCharityRegistration} />
          <Field name="appealGiftAidStatus" label="Gift Aid" help="e.g. “Available through the donation page”, “Not available” or “Eligibility unconfirmed”." value={post?.appealGiftAidStatus} error={e.appealGiftAidStatus} />
          <Field name="appealDonateUrl" label="Donation link (GoFundMe, JustGiving, PayPal…)" type="url" help="Paste the full https:// link. GoFundMe, JustGiving and PayPal links get a matching button." placeholder="https://www.gofundme.com/f/…" value={post?.appealDonateUrl} error={e.appealDonateUrl} />
          <Field name="appealVolunteerUrl" label="Volunteer page" type="url" help="An https:// application or contact page for volunteers." placeholder="https://" value={post?.appealVolunteerUrl} error={e.appealVolunteerUrl} />
          <div className="sm:col-span-2">
            <p className="text-[14px] font-semibold">Bank transfer (optional)</p>
            <p className="text-[12.5px] text-ink-faint">Shown on the post while the appeal is open. Use an account set up for the appeal if you can, and double-check the numbers: people will pay into exactly what you enter.</p>
          </div>
          <Field name="appealBankAccountName" label="Name on the account" help="As it appears on the account." value={post?.appealBankAccountName} error={e.appealBankAccountName} />
          <Field name="appealBankReference" label="Payment reference (optional)" help="Up to 18 characters, e.g. FOOD RUN." value={post?.appealBankReference} error={e.appealBankReference} />
          <Field name="appealBankSortCode" label="Sort code" help="6 digits, e.g. 12-34-56." placeholder="12-34-56" value={post?.appealBankSortCode} error={e.appealBankSortCode} />
          <Field name="appealBankAccountNumber" label="Account number" help="8 digits." placeholder="12345678" value={post?.appealBankAccountNumber} error={e.appealBankAccountNumber} />
        </div>
      </fieldset>

      <fieldset hidden={category !== "SECTOR"} className="grid gap-4 rounded-card border border-line p-4 sm:col-span-2 sm:grid-cols-3">
        <legend className="px-1 text-[15px] font-semibold">Source</legend>
        <Field name="sectorSourceName" label="Source name" help="Who published the guidance, report or article you checked." value={post?.sectorSourceName} error={e.sectorSourceName} />
        <Field name="sectorSourceUrl" label="Source link" type="url" help="Link straight to the source." placeholder="https://" value={post?.sectorSourceUrl} error={e.sectorSourceUrl} />
        <Field name="sectorReviewedOn" label="Last reviewed" type="date" help="The date you last checked the source. It doesn't change when you edit other things." value={reviewed} error={e.sectorReviewedOn} />
      </fieldset>

      {/* The general button is replaced by the appeal's own Donate / Volunteer buttons. */}
      <div hidden={hasAppeal} className="grid gap-4 sm:col-span-2 sm:grid-cols-2">
        <div>
          <label htmlFor="news-link" className="label">Button link (optional)</label>
          <input id="news-link" name="linkUrl" className="field" defaultValue={post?.linkUrl ?? ""} placeholder="https://…, /advertise or mailto:info@roomsnow.co.uk" />
          {err("linkUrl")}
        </div>
        <div>
          <label htmlFor="news-link-label" className="label">Button text (optional)</label>
          <input id="news-link-label" name="linkLabel" maxLength={40} className="field" defaultValue={post?.linkLabel ?? ""} placeholder="e.g. Find out more" />
        </div>
      </div>

      <div hidden={!fullAdmin} className="flex flex-wrap gap-5 sm:col-span-2">
        <label className="inline-flex items-center gap-2 text-[15px]">
          <input type="checkbox" name="publish" defaultChecked={post ? Boolean(post.publishedAt) : true} /> Publish now
        </label>
        <label className="inline-flex items-center gap-2 text-[15px]">
          <input type="checkbox" name="pinned" defaultChecked={post?.pinned ?? false} /> Show as the homepage banner
        </label>
        {charity && appeal === "CLOSED" && <p className="w-full text-[13px] text-ink-faint">Closed appeals stay in News and are hidden from the homepage banner.</p>}
      </div>
      {!fullAdmin && <p className="text-[13px] text-ink-faint sm:col-span-2">You can update the words and photo. An admin controls publishing and the homepage banner.</p>}
      <div className="sm:col-span-2">
        <SubmitButton pendingLabel="Saving…">{post ? "Save changes" : "Save post"}</SubmitButton>
      </div>
    </form>
  );
}
