"use client";

import { useLocale, useTranslations } from "next-intl";
import { useId, useState, type ReactNode } from "react";
import { parseDecimal } from "@/lib/forms";

/**
 * Form building blocks. Every field renders a label, an optional hint and the
 * server's error for that field, wired up with aria attributes.
 *
 * Inputs are controlled: React resets uncontrolled fields after a form action,
 * which would wipe what the user typed whenever validation fails.
 */

type BaseProps = {
  name: string;
  label: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  className?: string;
};

const inputClass =
  "h-11 w-full rounded-md border border-line bg-surface px-3 text-ink placeholder:text-ink-soft/60 " +
  "aria-[invalid=true]:border-[var(--layer-6)]";

export function Field({
  id,
  label,
  hint,
  error,
  optional,
  className,
  children,
}: Omit<BaseProps, "name"> & { id: string; children: ReactNode }) {
  const t = useTranslations("Form");
  return (
    <div className={className}>
      <label htmlFor={id} className="flex items-baseline gap-2 text-sm font-medium">
        {label}
        {optional && <span className="font-normal text-ink-soft">{t("optional")}</span>}
      </label>
      <div className="mt-1.5">{children}</div>
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-sm text-[var(--layer-6)]">
          {t(`errors.${error}` as "errors.invalid")}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-sm leading-snug text-ink-soft">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function describedBy(id: string, error?: string, hint?: string) {
  if (error) return `${id}-error`;
  if (hint) return `${id}-hint`;
  return undefined;
}

export function TextField({
  defaultValue,
  placeholder,
  maxLength = 120,
  ...props
}: BaseProps & { defaultValue?: string | null; placeholder?: string; maxLength?: number }) {
  const id = useId();
  const [value, setValue] = useState(defaultValue ?? "");
  return (
    <Field id={id} {...props}>
      <input
        id={id}
        name={props.name}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        aria-invalid={Boolean(props.error)}
        aria-describedby={describedBy(id, props.error, props.hint)}
        className={inputClass}
      />
    </Field>
  );
}

export function TextAreaField({
  defaultValue,
  ...props
}: BaseProps & { defaultValue?: string | null }) {
  const id = useId();
  const [value, setValue] = useState(defaultValue ?? "");
  return (
    <Field id={id} {...props}>
      <textarea
        id={id}
        name={props.name}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={2}
        maxLength={500}
        aria-invalid={Boolean(props.error)}
        aria-describedby={describedBy(id, props.error, props.hint)}
        className={`${inputClass} h-auto py-2`}
      />
    </Field>
  );
}

/**
 * A number typed the user's way ("1.234,5" in Turkish, "1,234.5" in English),
 * posted to the server in canonical form ("1234.5") through a hidden input.
 */
export function NumberField({
  defaultValue,
  suffix,
  integer,
  onValueChange,
  ...props
}: BaseProps & {
  defaultValue?: number | null;
  suffix?: string;
  integer?: boolean;
  /** Called with the text as typed, on every change. */
  onValueChange?: (text: string) => void;
}) {
  const id = useId();
  const locale = useLocale();
  const [text, setText] = useState(() =>
    defaultValue === null || defaultValue === undefined
      ? ""
      : new Intl.NumberFormat(locale, { useGrouping: false, maximumFractionDigits: 4 }).format(
          defaultValue,
        ),
  );
  const parsed = parseDecimal(text, locale);
  // Unreadable input is posted as-is so the server reports it.
  const canonical = parsed === undefined ? "" : Number.isNaN(parsed) ? text : String(parsed);

  return (
    <Field id={id} {...props}>
      <div className="flex h-11 items-center rounded-md border border-line bg-surface focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--focus)] has-[[aria-invalid=true]]:border-[var(--layer-6)]">
        <input
          id={id}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            onValueChange?.(e.target.value);
          }}
          inputMode={integer ? "numeric" : "decimal"}
          autoComplete="off"
          aria-invalid={Boolean(props.error)}
          aria-describedby={describedBy(id, props.error, props.hint)}
          className="h-full w-full min-w-0 rounded-md bg-transparent px-3 text-right text-ink outline-none"
        />
        {suffix && (
          <span className="shrink-0 whitespace-nowrap pr-3 text-sm text-ink-soft">{suffix}</span>
        )}
        <input type="hidden" name={props.name} value={canonical} />
      </div>
    </Field>
  );
}

export function SelectField({
  defaultValue,
  options,
  onValueChange,
  ...props
}: BaseProps & {
  defaultValue?: string;
  options: { value: string; label: string }[];
  onValueChange?: (value: string) => void;
}) {
  const id = useId();
  const [value, setValue] = useState(defaultValue ?? options[0]?.value ?? "");
  return (
    <Field id={id} {...props}>
      <select
        id={id}
        name={props.name}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          onValueChange?.(e.target.value);
        }}
        aria-invalid={Boolean(props.error)}
        aria-describedby={describedBy(id, props.error, props.hint)}
        className={inputClass}
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

export function ColorField({ defaultValue, ...props }: BaseProps & { defaultValue?: string | null }) {
  const id = useId();
  const [value, setValue] = useState(defaultValue ?? "");
  return (
    <Field id={id} {...props}>
      <div className="flex items-center gap-2">
        <input
          id={id}
          type="color"
          value={value || "#888888"}
          onChange={(e) => setValue(e.target.value)}
          className="h-11 w-14 cursor-pointer rounded-md border border-line bg-surface p-1"
        />
        {value && (
          <button
            type="button"
            onClick={() => setValue("")}
            className="text-sm text-ink-soft underline underline-offset-4"
          >
            ×
          </button>
        )}
        <input type="hidden" name={props.name} value={value} />
      </div>
    </Field>
  );
}
