"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Link } from "@/i18n/navigation";
import type { CalculationInputs } from "@/lib/calculator";
import type { Currency } from "@/lib/library/schemas";
import { saveCalculation } from "@/lib/saved/actions";
import { SelectInput, TextInput } from "@/components/calculator/inputs";

export type SavedRef = { id: string; name: string; productId: string | null };

/** Saves the current calculation to the history, optionally under a product. */
export function SavePanel({
  inputs,
  currency,
  products,
  saved,
  defaultProductId,
  onSaved,
}: {
  /** Null while the form can't be calculated (empty, or a number is unreadable). */
  inputs: CalculationInputs | null;
  currency: Currency;
  products: { id: string; name: string }[];
  saved: SavedRef | null;
  defaultProductId: string | null;
  onSaved: (ref: SavedRef) => void;
}) {
  const t = useTranslations("Calculator.save");
  const [name, setName] = useState(saved?.name ?? "");
  const [productId, setProductId] = useState(saved?.productId ?? defaultProductId ?? "");
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<"saved" | "invalid" | "notFound" | null>(null);

  const known = products.some((p) => p.id === productId);
  const shownProduct = productId === "new" || known ? productId : "";
  const canSave = name.trim().length > 0 && !pending && inputs !== null;

  function save(overwrite: boolean) {
    if (!inputs) return;
    setMessage(null);
    startTransition(async () => {
      const result = await saveCalculation({
        id: overwrite && saved ? saved.id : null,
        name,
        productId: shownProduct || null,
        currency,
        inputs,
      });
      if (result.ok) {
        onSaved({ id: result.id, name: name.trim(), productId: result.productId });
        setProductId(result.productId ?? "");
        setMessage("saved");
      } else {
        setMessage(result.error);
      }
    });
  }

  return (
    <section className="flex flex-col gap-4 border-t border-line pt-5">
      <h3 className="font-semibold">{t("title")}</h3>
      <TextInput
        label={t("name")}
        value={name}
        onChange={(v) => {
          setName(v);
          setMessage(null);
        }}
        placeholder={t("namePlaceholder")}
      />
      <SelectInput
        label={t("product")}
        value={shownProduct}
        onChange={setProductId}
        options={[
          { value: "", label: t("noProduct") },
          ...products.map((p) => ({ value: p.id, label: p.name })),
          { value: "new", label: t("newProduct") },
        ]}
      />
      <div className="flex flex-wrap gap-3">
        {saved ? (
          <>
            <button
              type="button"
              disabled={!canSave}
              onClick={() => save(true)}
              className="h-11 rounded-md bg-accent px-5 font-semibold text-accent-ink hover:opacity-90 disabled:opacity-50"
            >
              {pending ? t("saving") : t("update")}
            </button>
            <button
              type="button"
              disabled={!canSave}
              onClick={() => save(false)}
              className="h-11 rounded-md border border-line px-5 font-medium hover:bg-surface-sunk disabled:opacity-50"
            >
              {t("saveAsNew")}
            </button>
          </>
        ) : (
          <button
            type="button"
            disabled={!canSave}
            onClick={() => save(false)}
            className="h-11 rounded-md bg-accent px-5 font-semibold text-accent-ink hover:opacity-90 disabled:opacity-50"
          >
            {pending ? t("saving") : t("save")}
          </button>
        )}
      </div>
      {saved && (
        <Link href={`/quote/${saved.id}`} className="text-sm font-medium underline underline-offset-4">
          {t("quote")}
        </Link>
      )}
      <p aria-live="polite" className="text-sm empty:hidden">
        {message === "saved" && (
          <span>
            {t.rich("savedMessage", {
              link: (chunks) => (
                <Link href="/history" className="underline underline-offset-4">
                  {chunks}
                </Link>
              ),
            })}
          </span>
        )}
        {(message === "invalid" || message === "notFound") && (
          <span role="alert" className="text-[var(--layer-6)]">
            {t(`errors.${message}`)}
          </span>
        )}
      </p>
    </section>
  );
}
