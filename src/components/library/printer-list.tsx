"use client";

import { useCurrencySymbol } from "@/components/form/use-currency-symbol";
import { useFormatter, useTranslations } from "next-intl";
import type { PrinterDto } from "@/lib/library/data";
import {
  archivePrinter,
  savePrinter,
  setDefaultPrinter,
} from "@/lib/library/actions";
import { FormShell } from "@/components/form/form-shell";
import { NumberField, TextAreaField, TextField } from "@/components/form/fields";
import { AddPanel, EmptyState, ItemCard } from "@/components/library/item-card";

export function PrinterList({ printers, currency }: { printers: PrinterDto[]; currency: string }) {
  const t = useTranslations("Library.printers");
  const format = useFormatter();
  const money = (n: number) => format.number(n, { style: "currency", currency });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <AddPanel
          addLabel={t("add")}
          title={t("newTitle")}
          startOpen={printers.length === 0}
          renderForm={(close) => <PrinterForm currency={currency} onDone={close} />}
        />
      </div>
      {printers.length === 0 ? (
        <EmptyState>{t("empty")}</EmptyState>
      ) : (
        <ul className="flex flex-col gap-3">
          {printers.map((p) => {
            const wear =
              (p.purchasePrice - p.resaleValue) / p.lifetimeHours + p.maintenanceCostPerHour;
            return (
              <ItemCard
                key={p.id}
                id={p.id}
                name={p.name}
                isDefault={p.isDefault}
                editTitle={t("editTitle")}
                onArchive={archivePrinter}
                onMakeDefault={setDefaultPrinter}
                summary={
                  <>
                    {[p.brand, p.model].filter(Boolean).join(" ")}
                    {(p.brand || p.model) && " — "}
                    {t("wearPerHour", { amount: money(wear) })}, {t("power", { watts: p.powerWatts })}
                  </>
                }
                renderForm={(close) => (
                  <PrinterForm printer={p} currency={currency} onDone={close} />
                )}
              />
            );
          })}
        </ul>
      )}
    </div>
  );
}

function PrinterForm({
  printer,
  currency,
  onDone,
}: {
  printer?: PrinterDto;
  currency: string;
  onDone: () => void;
}) {
  const symbol = useCurrencySymbol(currency);
  const t = useTranslations("Library.printers");
  const f = (k: string) => t(`fields.${k}` as "fields.name");

  return (
    <FormShell action={savePrinter} id={printer?.id} onSaved={onDone} onCancel={onDone}>
      {(errors) => (
        <>
          <div className="grid gap-5 sm:grid-cols-3">
            <TextField
              name="name"
              label={f("name")}
              hint={f("nameHint")}
              defaultValue={printer?.name}
              error={errors.name}
            />
            <TextField
              name="brand"
              label={f("brand")}
              optional
              defaultValue={printer?.brand}
              error={errors.brand}
            />
            <TextField
              name="model"
              label={f("model")}
              optional
              defaultValue={printer?.model}
              error={errors.model}
            />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <NumberField
              name="purchasePrice"
              label={f("purchasePrice")}
              suffix={symbol}
              defaultValue={printer?.purchasePrice}
              error={errors.purchasePrice}
            />
            <NumberField
              name="resaleValue"
              label={f("resaleValue")}
              hint={f("resaleValueHint")}
              optional
              suffix={symbol}
              defaultValue={printer?.resaleValue || null}
              error={errors.resaleValue}
            />
            <NumberField
              name="lifetimeHours"
              label={f("lifetimeHours")}
              hint={f("lifetimeHoursHint")}
              integer
              suffix={t("units.hours")}
              defaultValue={printer?.lifetimeHours ?? 5000}
              error={errors.lifetimeHours}
            />
            <NumberField
              name="powerWatts"
              label={f("powerWatts")}
              hint={f("powerWattsHint")}
              integer
              suffix={t("units.watts")}
              defaultValue={printer?.powerWatts ?? 150}
              error={errors.powerWatts}
            />
            <NumberField
              name="maintenanceCostPerHour"
              label={f("maintenanceCostPerHour")}
              hint={f("maintenanceCostPerHourHint")}
              optional
              suffix={`${symbol} ${t("units.perHour")}`}
              defaultValue={printer?.maintenanceCostPerHour || null}
              error={errors.maintenanceCostPerHour}
            />
          </div>
          <TextAreaField
            name="notes"
            label={f("notes")}
            optional
            defaultValue={printer?.notes}
            error={errors.notes}
          />
        </>
      )}
    </FormShell>
  );
}
