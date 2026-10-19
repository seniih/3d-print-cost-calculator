"use client";

import { useCurrencySymbol } from "@/components/form/use-currency-symbol";
import { useFormatter, useTranslations } from "next-intl";
import type { FilamentDto } from "@/lib/library/data";
import { FILAMENT_MATERIALS } from "@/lib/library/schemas";
import { archiveFilament, saveFilament, setDefaultFilament } from "@/lib/library/actions";
import { FormShell } from "@/components/form/form-shell";
import {
  ColorField,
  NumberField,
  SelectField,
  TextAreaField,
  TextField,
} from "@/components/form/fields";
import { AddPanel, EmptyState, ItemCard } from "@/components/library/item-card";

export function FilamentList({
  filaments,
  currency,
}: {
  filaments: FilamentDto[];
  currency: string;
}) {
  const t = useTranslations("Library.filaments");
  const format = useFormatter();
  const money = (n: number) => format.number(n, { style: "currency", currency });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <AddPanel
          addLabel={t("add")}
          title={t("newTitle")}
          startOpen={filaments.length === 0}
          renderForm={(close) => <FilamentForm currency={currency} onDone={close} />}
        />
      </div>
      {filaments.length === 0 ? (
        <EmptyState>{t("empty")}</EmptyState>
      ) : (
        <ul className="flex flex-col gap-3">
          {filaments.map((f) => (
            <ItemCard
              key={f.id}
              id={f.id}
              name={f.name}
              isDefault={f.isDefault}
              editTitle={t("editTitle")}
              onArchive={archiveFilament}
              onMakeDefault={setDefaultFilament}
              swatch={<Spool color={f.colorHex} />}
              summary={[
                t(`materials.${f.material}`),
                f.brand,
                f.color,
                t("perKg", { amount: money((f.spoolPrice / f.spoolWeightGrams) * 1000) }),
              ]
                .filter(Boolean)
                .join(", ")}
              renderForm={(close) => (
                <FilamentForm filament={f} currency={currency} onDone={close} />
              )}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

/** A spool seen from the side: the filament's color with the hub in the middle. */
function Spool({ color }: { color: string | null }) {
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" aria-hidden="true" className="shrink-0">
      <circle cx="18" cy="18" r="16" fill={color ?? "var(--surface-sunk)"} stroke="var(--line)" />
      <circle cx="18" cy="18" r="6" fill="var(--surface)" stroke="var(--line)" />
    </svg>
  );
}

function FilamentForm({
  filament,
  currency,
  onDone,
}: {
  filament?: FilamentDto;
  currency: string;
  onDone: () => void;
}) {
  const symbol = useCurrencySymbol(currency);
  const t = useTranslations("Library.filaments");
  const f = (k: string) => t(`fields.${k}` as "fields.name");

  return (
    <FormShell action={saveFilament} id={filament?.id} onSaved={onDone} onCancel={onDone}>
      {(errors) => (
        <>
          <div className="grid gap-5 sm:grid-cols-3">
            <TextField
              name="name"
              label={f("name")}
              hint={f("nameHint")}
              defaultValue={filament?.name}
              error={errors.name}
            />
            <SelectField
              name="material"
              label={f("material")}
              defaultValue={filament?.material ?? "PLA"}
              options={FILAMENT_MATERIALS.map((m) => ({ value: m, label: t(`materials.${m}`) }))}
              error={errors.material}
            />
            <TextField
              name="brand"
              label={f("brand")}
              optional
              defaultValue={filament?.brand}
              error={errors.brand}
            />
          </div>
          <div className="grid gap-5 sm:grid-cols-[1fr_auto_1fr_1fr]">
            <TextField
              name="color"
              label={f("color")}
              optional
              defaultValue={filament?.color}
              error={errors.color}
            />
            <ColorField
              name="colorHex"
              label={f("colorHex")}
              defaultValue={filament?.colorHex}
              error={errors.colorHex}
            />
            <NumberField
              name="spoolPrice"
              label={f("spoolPrice")}
              suffix={symbol}
              defaultValue={filament?.spoolPrice}
              error={errors.spoolPrice}
            />
            <NumberField
              name="spoolWeightGrams"
              label={f("spoolWeightGrams")}
              hint={f("spoolWeightGramsHint")}
              integer
              suffix={t("units.grams")}
              defaultValue={filament?.spoolWeightGrams ?? 1000}
              error={errors.spoolWeightGrams}
            />
          </div>
          <TextAreaField
            name="notes"
            label={f("notes")}
            optional
            defaultValue={filament?.notes}
            error={errors.notes}
          />
        </>
      )}
    </FormShell>
  );
}
