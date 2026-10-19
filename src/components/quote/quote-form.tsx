"use client";

import { useFormatter, useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { currencySymbol } from "@/lib/currency";
import { formatInput } from "@/lib/calculator";
import { parseDecimal } from "@/lib/forms";
import { NumInput, TextInput } from "@/components/calculator/inputs";
import { Field } from "@/components/form/fields";
import { useId } from "react";

/** Details of a customer quote, a live total, and the PDF download. */
export function QuoteForm({
  id,
  title: initialTitle,
  currency,
  price,
  quantity: initialQuantity,
  taxRatePct,
  businessName: initialBusiness,
}: {
  id: string;
  title: string;
  currency: string;
  /** Suggested price per piece, tax included. */
  price: number;
  quantity: number;
  taxRatePct: number;
  businessName: string;
}) {
  const t = useTranslations("Quote");
  const locale = useLocale();
  const format = useFormatter();
  const notesId = useId();

  const [business, setBusiness] = useState(initialBusiness);
  const [customer, setCustomer] = useState("");
  const [title, setTitle] = useState(initialTitle);
  const [priceText, setPriceText] = useState(formatInput(Math.round(price * 100) / 100, locale));
  const [quantityText, setQuantityText] = useState(String(initialQuantity));
  const [daysText, setDaysText] = useState("14");
  const [notes, setNotes] = useState("");

  const unitPrice = parseDecimal(priceText, locale);
  const quantity = parseDecimal(quantityText, locale);
  const days = parseDecimal(daysText, locale) ?? 0;
  const valid =
    unitPrice !== undefined &&
    Number.isFinite(unitPrice) &&
    unitPrice >= 0 &&
    quantity !== undefined &&
    Number.isInteger(quantity) &&
    quantity >= 1 &&
    Number.isInteger(days) &&
    days >= 0 &&
    days <= 365;

  const money = (n: number) =>
    format.number(n, { style: "currency", currency, currencyDisplay: "narrowSymbol" });
  const total = valid ? unitPrice * quantity : 0;

  const href = valid
    ? `/api/quote/${id}?` +
      new URLSearchParams({
        lang: locale,
        business,
        customer,
        title,
        price: String(unitPrice),
        quantity: String(quantity),
        days: String(days),
        notes,
      }).toString()
    : null;

  return (
    <div className="flex flex-col gap-6 rounded-xl border border-line bg-surface p-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <TextInput label={t("fields.business")} value={business} onChange={setBusiness} />
        <TextInput label={t("fields.customer")} value={customer} onChange={setCustomer} />
        <TextInput label={t("fields.item")} value={title} onChange={setTitle} className="sm:col-span-2" />
        <NumInput
          label={t("fields.price")}
          hint={t("fields.priceHint")}
          suffix={currencySymbol(currency, locale)}
          value={priceText}
          onChange={setPriceText}
          invalid={unitPrice === undefined || !Number.isFinite(unitPrice)}
        />
        <NumInput
          label={t("fields.quantity")}
          value={quantityText}
          onChange={setQuantityText}
          invalid={quantity === undefined || !Number.isInteger(quantity) || quantity < 1}
          integer
        />
        <NumInput
          label={t("fields.days")}
          hint={t("fields.daysHint")}
          suffix={t("fields.daysUnit")}
          value={daysText}
          onChange={setDaysText}
          invalid={!Number.isInteger(days) || days < 0 || days > 365}
          integer
        />
        <Field id={notesId} label={t("fields.notes")} optional className="sm:col-span-2">
          <textarea
            id={notesId}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder={t("fields.notesPlaceholder")}
            className="w-full rounded-md border border-line bg-surface px-3 py-2 text-ink placeholder:text-ink-soft/60"
          />
        </Field>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-line pt-5">
        <div>
          <p className="text-sm text-ink-soft">
            {t("totalLabel", { rate: taxRatePct })}
          </p>
          <p className="display text-4xl text-accent">{money(total)}</p>
        </div>
        {href ? (
          <a
            href={href}
            download
            className="h-11 rounded-md bg-accent px-6 py-2.5 font-semibold text-accent-ink hover:opacity-90"
          >
            {t("download")}
          </a>
        ) : (
          <span className="h-11 rounded-md bg-surface-sunk px-6 py-2.5 font-semibold text-ink-soft">
            {t("download")}
          </span>
        )}
      </div>
    </div>
  );
}
