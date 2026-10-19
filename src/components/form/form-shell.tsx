"use client";

import { useTranslations } from "next-intl";
import { startTransition, useActionState, useEffect, useRef, type ReactNode } from "react";
import { idle, type FormState } from "@/lib/forms";

export type FormAction = (state: FormState, formData: FormData) => Promise<FormState>;

/**
 * Wraps a Server Action form: pending state, the form-level error, and an
 * `onSaved` callback. Field errors reach fields through the render prop.
 */
export function FormShell({
  action,
  id,
  onSaved,
  onCancel,
  submitLabel,
  children,
}: {
  action: FormAction;
  id?: string;
  onSaved?: () => void;
  onCancel?: () => void;
  submitLabel?: string;
  children: (errors: Record<string, string>) => ReactNode;
}) {
  const t = useTranslations("Form");
  const [state, formAction, pending] = useActionState(action, idle);
  const handled = useRef<number | null>(null);

  useEffect(() => {
    if (state.status === "success" && handled.current !== state.savedAt) {
      handled.current = state.savedAt;
      onSaved?.();
    }
  }, [state, onSaved]);

  const errors = state.status === "error" ? state.fieldErrors : {};

  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      // Submitting by hand (rather than <form action>) stops React from
      // resetting the form afterwards, which fights controlled inputs.
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => formAction(data));
      }}
    >
      {id && <input type="hidden" name="id" value={id} />}
      {children(errors)}
      {state.status === "error" && state.formError && (
        <p role="alert" className="text-sm text-[var(--layer-6)]">
          {t(`errors.${state.formError}` as "errors.notFound")}
        </p>
      )}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="h-11 rounded-md bg-ink px-5 font-semibold text-bg hover:opacity-90 disabled:opacity-60"
        >
          {pending ? t("saving") : (submitLabel ?? t("save"))}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="h-11 px-3 text-ink-soft underline-offset-4 hover:underline"
          >
            {t("cancel")}
          </button>
        )}
        <span aria-live="polite" className="text-sm text-ink-soft">
          {state.status === "success" && !pending && !onSaved ? t("saved") : ""}
        </span>
      </div>
    </form>
  );
}
