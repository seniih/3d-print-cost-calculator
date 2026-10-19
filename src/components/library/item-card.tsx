"use client";

import { useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";

type ServerAction = (formData: FormData) => Promise<void>;

/**
 * One saved item: a summary that turns into its edit form in place.
 */
export function ItemCard({
  id,
  name,
  isDefault,
  summary,
  swatch,
  onArchive,
  onMakeDefault,
  editTitle,
  renderForm,
  links,
}: {
  id: string;
  name: string;
  isDefault?: boolean;
  summary: ReactNode;
  swatch?: ReactNode;
  onArchive: ServerAction;
  onMakeDefault?: ServerAction;
  editTitle: string;
  renderForm: (close: () => void) => ReactNode;
  /** Extra links shown before the edit and remove actions. */
  links?: ReactNode;
}) {
  const t = useTranslations("Form");
  const tl = useTranslations("Library");
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <li className="rounded-lg border-2 border-accent bg-surface p-5">
        <h3 className="mb-4 font-semibold">{editTitle}</h3>
        {renderForm(() => setEditing(false))}
      </li>
    );
  }

  return (
    <li className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-4 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        {swatch}
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 font-semibold">
            <span className="truncate">{name}</span>
            {isDefault && (
              <span className="rounded bg-accent-soft px-1.5 py-0.5 text-xs font-medium text-ink">
                {tl("default")}
              </span>
            )}
          </p>
          <div className="mt-0.5 text-sm text-ink-soft">{summary}</div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        {links}
        {onMakeDefault && !isDefault && (
          <form action={onMakeDefault}>
            <input type="hidden" name="id" value={id} />
            <button type="submit" className="text-ink-soft underline-offset-4 hover:underline">
              {tl("makeDefault")}
            </button>
          </form>
        )}
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="font-medium underline-offset-4 hover:underline"
        >
          {t("edit")}
        </button>
        <form
          action={onArchive}
          onSubmit={(e) => {
            if (!window.confirm(t("removeConfirm", { name }))) e.preventDefault();
          }}
        >
          <input type="hidden" name="id" value={id} />
          <button type="submit" className="text-ink-soft underline-offset-4 hover:underline">
            {t("remove")}
          </button>
        </form>
      </div>
    </li>
  );
}

/** The "Add …" button and the form it opens. */
export function AddPanel({
  addLabel,
  title,
  renderForm,
  startOpen = false,
}: {
  addLabel: string;
  title: string;
  renderForm: (close: () => void) => ReactNode;
  startOpen?: boolean;
}) {
  const [open, setOpen] = useState(startOpen);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="h-11 rounded-md bg-accent px-5 font-semibold text-accent-ink hover:opacity-90"
      >
        {addLabel}
      </button>
    );
  }
  return (
    <section className="rounded-lg border-2 border-accent bg-surface p-5">
      <h2 className="mb-4 font-semibold">{title}</h2>
      {renderForm(() => setOpen(false))}
    </section>
  );
}

/** Shown in place of the list when nothing has been added yet. */
export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-lg border border-dashed border-line px-5 py-8 text-center leading-relaxed text-ink-soft">
      {children}
    </p>
  );
}
