"use client";

import { useId, type ReactNode } from "react";
import { Field } from "@/components/form/fields";

/**
 * Controlled inputs for the calculator. The calculator owns the text; these
 * only show it, so values can be set from outside (a picked printer, a
 * parsed G-code file).
 */

const box =
  "flex h-11 items-center rounded-md border border-line bg-surface focus-within:outline-2 " +
  "focus-within:outline-offset-2 focus-within:outline-[var(--focus)] " +
  "has-[[aria-invalid=true]]:border-[var(--layer-6)]";

export function NumInput({
  label,
  value,
  onChange,
  suffix,
  hint,
  invalid,
  integer,
  className,
  optional,
}: {
  label: string;
  value: string;
  onChange: (text: string) => void;
  suffix?: string;
  hint?: string;
  invalid?: boolean;
  integer?: boolean;
  className?: string;
  optional?: boolean;
}) {
  const id = useId();
  return (
    <Field
      id={id}
      label={label}
      hint={hint}
      error={invalid ? "number" : undefined}
      className={className}
      optional={optional}
    >
      <div className={box}>
        <input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          inputMode={integer ? "numeric" : "decimal"}
          autoComplete="off"
          aria-invalid={invalid}
          className="h-full w-full min-w-0 rounded-md bg-transparent px-3 text-right text-ink outline-none"
        />
        {suffix && (
          <span className="shrink-0 whitespace-nowrap pr-3 text-sm text-ink-soft">{suffix}</span>
        )}
      </div>
    </Field>
  );
}

export function TextInput({
  label,
  value,
  onChange,
  className,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (text: string) => void;
  className?: string;
  placeholder?: string;
}) {
  const id = useId();
  return (
    <Field id={id} label={label} className={className}>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={120}
        className="h-11 w-full rounded-md border border-line bg-surface px-3 text-ink placeholder:text-ink-soft/60"
      />
    </Field>
  );
}

export function SelectInput({
  label,
  value,
  onChange,
  options,
  className,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  className?: string;
  hint?: string;
}) {
  const id = useId();
  return (
    <Field id={id} label={label} className={className} hint={hint}>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-md border border-line bg-surface px-3 text-ink"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

export function Card({
  title,
  children,
  aside,
}: {
  title: string;
  children: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-line bg-surface p-5">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 className="display text-2xl">{title}</h2>
        {aside}
      </div>
      <div className="flex flex-col gap-5">{children}</div>
    </section>
  );
}
