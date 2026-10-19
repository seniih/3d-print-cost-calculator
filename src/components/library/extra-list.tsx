"use client";

import { useCurrencySymbol } from "@/components/form/use-currency-symbol";
import { useFormatter, useTranslations } from "next-intl";
import type { ExtraItemDto } from "@/lib/library/data";
import { EXTRA_CATEGORIES, EXTRA_UNITS } from "@/lib/library/schemas";
import { archiveExtraItem, saveExtraItem } from "@/lib/library/actions";
import { FormShell } from "@/components/form/form-shell";
import { NumberField, SelectField, TextAreaField, TextField } from "@/components/form/fields";
import { AddPanel, EmptyState, ItemCard } from "@/components/library/item-card";

export function ExtraList({ extras, currency }: { extras: ExtraItemDto[]; currency: string }) {
  const t = useTranslations("Library.extras");
  const format = useFormatter();
  const money = (n: number) => format.number(n, { style: "currency", currency });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <AddPanel
          addLabel={t("add")}
          title={t("newTitle")}
          startOpen={extras.length === 0}
          renderForm={(close) => <ExtraForm currency={currency} onDone={close} />}
        />
      </div>
      {extras.length === 0 ? (
        <EmptyState>{t("empty")}</EmptyState>
      ) : (
        <ul className="flex flex-col gap-3">
          {extras.map((e) => (
            <ItemCard
              key={e.id}
              id={e.id}
              name={e.name}
              editTitle={t("editTitle")}
              onArchive={archiveExtraItem}
              summary={`${t(`categories.${e.category}`)}, ${t("perUnit", {
                amount: money(e.unitPrice),
                unit: t(`units.${e.unit}`),
              })}`}
              renderForm={(close) => <ExtraForm extra={e} currency={currency} onDone={close} />}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function ExtraForm({
  extra,
  currency,
  onDone,
}: {
  extra?: ExtraItemDto;
  currency: string;
  onDone: () => void;
}) {
  const symbol = useCurrencySymbol(currency);
  const t = useTranslations("Library.extras");
  const f = (k: string) => t(`fields.${k}` as "fields.name");

  return (
    <FormShell action={saveExtraItem} id={extra?.id} onSaved={onDone} onCancel={onDone}>
      {(errors) => (
        <>
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField
              name="name"
              label={f("name")}
              hint={f("nameHint")}
              defaultValue={extra?.name}
              error={errors.name}
            />
            <SelectField
              name="category"
              label={f("category")}
              defaultValue={extra?.category ?? "HARDWARE"}
              options={EXTRA_CATEGORIES.map((c) => ({ value: c, label: t(`categories.${c}`) }))}
              error={errors.category}
            />
            <SelectField
              name="unit"
              label={f("unit")}
              defaultValue={extra?.unit ?? "PIECE"}
              options={EXTRA_UNITS.map((u) => ({ value: u, label: t(`units.${u}`) }))}
              error={errors.unit}
            />
            <NumberField
              name="unitPrice"
              label={f("unitPrice")}
              suffix={symbol}
              defaultValue={extra?.unitPrice}
              error={errors.unitPrice}
            />
          </div>
          <TextAreaField
            name="notes"
            label={f("notes")}
            optional
            defaultValue={extra?.notes}
            error={errors.notes}
          />
        </>
      )}
    </FormShell>
  );
}
