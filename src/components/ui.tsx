"use client";

import { useFormStatus } from "react-dom";
import Link from "next/link";
import { clsx } from "@/lib/clsx";

export function SubmitButton({
  children,
  pendingLabel,
  className = "btn-primary",
  disabled = false,
  name,
  value,
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  className?: string;
  disabled?: boolean;
  name?: string;
  value?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" name={name} value={value} className={className} disabled={pending || disabled} aria-busy={pending}>
      {pending && (
        <svg
          className="h-4 w-4 animate-spin"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" opacity="0.25" />
          <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      )}
      {pending ? (pendingLabel ?? "Working…") : children}
    </button>
  );
}

export function Field({
  label,
  name,
  error,
  hint,
  children,
  required,
}: {
  label: string;
  name: string;
  error?: string;
  hint?: string;
  children?: React.ReactNode;
  required?: boolean;
}) {
  return (
    <div>
      <label className="label" htmlFor={name}>
        {label}
        {required && <span className="text-clay"> *</span>}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-[13px] text-ink-faint">{hint}</p>}
      {error && (
        <p className="mt-1 text-[13px] text-clay" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div
      key={message}
      className="animate-fade-in-down rounded-[10px] border border-clay/30 bg-clay-light px-4 py-3 text-[14px] text-clay"
      role="alert"
    >
      {message}
    </div>
  );
}

export function FormSuccess({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div
      key={message}
      className="animate-fade-in-down flex items-center gap-2 rounded-[10px] border border-pine/25 bg-pine-light px-4 py-3 text-[14px] text-pine-dark"
      role="status"
    >
      <svg viewBox="0 0 16 16" className="h-4 w-4 shrink-0" fill="currentColor" aria-hidden="true">
        <path d="M6.2 11.6 2.6 8l1-1 2.6 2.6L12.4 3.4l1 1-7.2 7.2Z" />
      </svg>
      {message}
    </div>
  );
}

export function Toggle({
  name,
  label,
  description,
  defaultChecked,
}: {
  name: string;
  label: string;
  description?: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-[10px] border border-line bg-white p-3.5">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="mt-0.5 h-4 w-4 shrink-0 rounded border-line-strong text-pine focus:ring-pine"
      />
      <span>
        <span className="block text-[15px] text-ink">{label}</span>
        {description && <span className="mt-0.5 block text-[13px] text-ink-faint">{description}</span>}
      </span>
    </label>
  );
}

export function CheckGroup({
  name,
  options,
  selected = [],
  columns = 2,
}: {
  name: string;
  options: { value: string; label: string }[];
  selected?: string[];
  columns?: number;
}) {
  return (
    <div className={clsx("grid gap-2", columns === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2")}>
      {options.map((option) => (
        <label
          key={option.value}
          className="flex cursor-pointer items-center gap-2.5 rounded-[10px] border border-line bg-white px-3 py-2.5 text-[15px] hover:border-line-strong"
        >
          <input
            type="checkbox"
            name={name}
            value={option.value}
            defaultChecked={selected.includes(option.value)}
            className="h-4 w-4 rounded border-line-strong text-pine focus:ring-pine"
          />
          {option.label}
        </label>
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  body,
  actionHref,
  actionLabel,
}: {
  title: string;
  body: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="card px-6 py-12 text-center">
      <h3 className="text-xl">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-[15px] text-ink-soft">{body}</p>
      {actionHref && actionLabel && (
        <Link href={actionHref} className="btn-primary mt-5">
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
