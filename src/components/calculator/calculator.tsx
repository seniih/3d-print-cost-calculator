"use client";

import { useFormatter, useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { Link } from "@/i18n/navigation";
import {
  CUSTOM,
  buildInputs,
  calculate,
  extraRow,
  filamentRow,
  formatInput,
  initialState,
  newKey,
  printerFields,
  type CalcState,
  type ExtraRow,
  type FilamentRow,
  type Library,
} from "@/lib/calculator";
import type { Settings } from "@/lib/library/data";
import { splitDuration, type SliceInfo } from "@/lib/slicer/parse";
import { SliceImport } from "@/components/calculator/slice-import";
import { currencySymbol } from "@/lib/currency";
import { Breakdown } from "@/components/calculator/breakdown";
import { Card, NumInput, SelectInput, TextInput } from "@/components/calculator/inputs";

export function Calculator({ library, settings }: { library: Library; settings: Settings }) {
  const t = useTranslations("Calculator");
  const locale = useLocale();
  const format = useFormatter();
  const [s, setS] = useState(() => initialState(library, settings, locale));

  const set = <K extends keyof CalcState>(key: K, value: CalcState[K]) =>
    setS((prev) => ({ ...prev, [key]: value }));
  const text = (key: keyof CalcState) => (v: string) => set(key, v as never);

  const built = useMemo(() => buildInputs(s, locale), [s, locale]);
  const result = useMemo(() => (built.ok ? calculate(built.inputs) : null), [built]);
  const bad = built.ok ? new Set<string>() : built.bad;
  const issues = built.ok ? [] : built.issues;

  const currency = settings.currency;
  const symbol = currencySymbol(currency, locale);
  const perHour = `${symbol} ${t("units.perHour")}`;
  const empty = built.ok && built.inputs.printMinutes === 0 && result?.perPiece.cost === 0;

  // --- Printer -------------------------------------------------------------
  const printerOptions = [
    ...library.printers.map((p) => ({ value: p.id, label: p.name })),
    { value: CUSTOM, label: t("printer.custom") },
  ];
  const pickPrinter = (id: string) => {
    const p = library.printers.find((x) => x.id === id);
    setS((prev) => (p ? { ...prev, ...printerFields(p, locale) } : { ...prev, printerId: CUSTOM }));
  };

  // --- G-code / 3MF ----------------------------------------------------------
  const applySlice = (info: SliceInfo) =>
    setS((prev) => {
      const next = { ...prev };
      if (info.printSeconds !== null) {
        const { hours, minutes } = splitDuration(info.printSeconds);
        next.hours = hours ? formatInput(hours, locale) : "";
        next.minutes = minutes ? formatInput(minutes, locale) : "";
      }
      if (info.filaments.length > 0) {
        const fallback = library.filaments.find((f) => f.isDefault) ?? library.filaments[0];
        next.filaments = info.filaments.map((use, i) => {
          const base = prev.filaments[i] ?? { ...filamentRow(fallback, locale), key: newKey() };
          return { ...base, grams: formatInput(use.grams, locale) };
        });
      }
      return next;
    });

  // --- Rows ----------------------------------------------------------------
  const updateFilament = (key: string, patch: Partial<FilamentRow>) =>
    setS((prev) => ({
      ...prev,
      filaments: prev.filaments.map((r) => (r.key === key ? { ...r, ...patch } : r)),
    }));
  const pickFilament = (key: string, id: string) => {
    const f = library.filaments.find((x) => x.id === id);
    setS((prev) => ({
      ...prev,
      filaments: prev.filaments.map((r) =>
        r.key === key ? { ...filamentRow(f, locale, r.grams), key } : r,
      ),
    }));
  };
  const updateExtra = (key: string, patch: Partial<ExtraRow>) =>
    setS((prev) => ({
      ...prev,
      extras: prev.extras.map((r) => (r.key === key ? { ...r, ...patch } : r)),
    }));
  const pickExtra = (key: string, id: string) => {
    const e = library.extras.find((x) => x.id === id);
    setS((prev) => ({
      ...prev,
      extras: prev.extras.map((r) => (r.key === key ? { ...extraRow(e, locale), key } : r)),
    }));
  };

  const filamentOptions = [
    ...library.filaments.map((f) => ({ value: f.id, label: f.name })),
    { value: CUSTOM, label: t("filament.custom") },
  ];
  const extraOptions = [
    ...library.extras.map((e) => ({ value: e.id, label: e.name })),
    { value: CUSTOM, label: t("extras.custom") },
  ];
  const money = (n: number) => format.number(n, { style: "currency", currency, currencyDisplay: "narrowSymbol" });

  const selectedPrinter = library.printers.find((p) => p.id === s.printerId);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
      <div className="flex flex-col gap-6">
        <Card title={t("sections.print")}>
          <SliceImport onRead={applySlice} />
          <div className="grid grid-cols-2 items-start gap-5 sm:grid-cols-4">
            <>
              <NumInput
                label={t("fields.printTime")}
                suffix={t("units.hours")}
                value={s.hours}
                onChange={text("hours")}
                invalid={bad.has("hours")}
                integer
              />
              <NumInput
                label={t("fields.printMinutes")}
                suffix={t("units.minutes")}
                value={s.minutes}
                onChange={text("minutes")}
                invalid={bad.has("minutes")}
              />
            </>
            <NumInput
              label={t("fields.piecesPerJob")}
              hint={t("fields.piecesPerJobHint")}
              value={s.piecesPerJob}
              onChange={text("piecesPerJob")}
              invalid={bad.has("piecesPerJob")}
              integer
            />
            <NumInput
              label={t("fields.quantity")}
              hint={t("fields.quantityHint")}
              value={s.quantity}
              onChange={text("quantity")}
              invalid={bad.has("quantity")}
              integer
            />
          </div>
        </Card>

        <Card title={t("sections.printer")}>
          <SelectInput
            label={t("printer.label")}
            value={s.printerId}
            onChange={pickPrinter}
            options={printerOptions}
          />
          {selectedPrinter ? (
            <p className="text-sm text-ink-soft">
              {t("printer.summary", {
                watts: selectedPrinter.powerWatts,
                wear: money(
                  selectedPrinter.lifetimeHours > 0
                    ? (selectedPrinter.purchasePrice - selectedPrinter.resaleValue) /
                        selectedPrinter.lifetimeHours +
                        selectedPrinter.maintenanceCostPerHour
                    : selectedPrinter.maintenanceCostPerHour,
                ),
              })}
            </p>
          ) : (
            <>
              <div className="grid gap-5 sm:grid-cols-2">
                <NumInput
                  label={t("printer.purchasePrice")}
                  suffix={symbol}
                  value={s.purchasePrice}
                  onChange={text("purchasePrice")}
                  invalid={bad.has("purchasePrice")}
                />
                <NumInput
                  label={t("printer.resaleValue")}
                  suffix={symbol}
                  value={s.resaleValue}
                  onChange={text("resaleValue")}
                  invalid={bad.has("resaleValue")}
                  optional
                />
                <NumInput
                  label={t("printer.lifetimeHours")}
                  hint={t("printer.lifetimeHoursHint")}
                  suffix={t("units.hours")}
                  value={s.lifetimeHours}
                  onChange={text("lifetimeHours")}
                  invalid={bad.has("lifetimeHours")}
                />
                <NumInput
                  label={t("printer.powerWatts")}
                  suffix="W"
                  value={s.powerWatts}
                  onChange={text("powerWatts")}
                  invalid={bad.has("powerWatts")}
                />
                <NumInput
                  label={t("printer.maintenance")}
                  suffix={perHour}
                  value={s.maintenancePerHour}
                  onChange={text("maintenancePerHour")}
                  invalid={bad.has("maintenancePerHour")}
                  optional
                />
              </div>
              <p className="text-sm text-ink-soft">
                {t.rich("printer.saveHint", {
                  link: (chunks) => (
                    <Link href="/library/printers" className="underline underline-offset-4">
                      {chunks}
                    </Link>
                  ),
                })}
              </p>
            </>
          )}
        </Card>

        <Card
          title={t("sections.filament")}
          aside={
            <button
              type="button"
              onClick={() =>
                setS((prev) => ({
                  ...prev,
                  filaments: [...prev.filaments, filamentRow(library.filaments[0], locale)],
                }))
              }
              className="text-sm font-medium underline underline-offset-4"
            >
              {t("filament.add")}
            </button>
          }
        >
          {s.filaments.map((row, i) => (
            <div key={row.key} className="flex flex-col gap-4 rounded-lg bg-surface-sunk/50 p-4">
              <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
                <SelectInput
                  label={t("filament.label", { n: i + 1 })}
                  value={row.sourceId}
                  onChange={(id) => pickFilament(row.key, id)}
                  options={filamentOptions}
                />
                <NumInput
                  label={t("filament.grams")}
                  suffix="g"
                  value={row.grams}
                  onChange={(v) => updateFilament(row.key, { grams: v })}
                  invalid={bad.has(`${row.key}.grams`)}
                />
              </div>
              {row.sourceId === CUSTOM && (
                <div className="grid gap-4 sm:grid-cols-3">
                  <TextInput
                    label={t("filament.name")}
                    value={row.name}
                    onChange={(v) => updateFilament(row.key, { name: v })}
                  />
                  <NumInput
                    label={t("filament.spoolPrice")}
                    suffix={symbol}
                    value={row.spoolPrice}
                    onChange={(v) => updateFilament(row.key, { spoolPrice: v })}
                    invalid={bad.has(`${row.key}.spoolPrice`)}
                  />
                  <NumInput
                    label={t("filament.spoolWeight")}
                    suffix="g"
                    value={row.spoolWeight}
                    onChange={(v) => updateFilament(row.key, { spoolWeight: v })}
                    invalid={bad.has(`${row.key}.spoolWeight`)}
                  />
                </div>
              )}
              {s.filaments.length > 1 && (
                <button
                  type="button"
                  onClick={() =>
                    setS((prev) => ({
                      ...prev,
                      filaments: prev.filaments.filter((r) => r.key !== row.key),
                    }))
                  }
                  className="self-start text-sm text-ink-soft underline underline-offset-4"
                >
                  {t("remove")}
                </button>
              )}
            </div>
          ))}
          <p className="text-sm text-ink-soft">{t("filament.hint", { waste: s.wastePct || "0" })}</p>
        </Card>

        <Card
          title={t("sections.extras")}
          aside={
            <button
              type="button"
              onClick={() =>
                setS((prev) => ({
                  ...prev,
                  extras: [...prev.extras, extraRow(library.extras[0], locale)],
                }))
              }
              className="text-sm font-medium underline underline-offset-4"
            >
              {t("extras.add")}
            </button>
          }
        >
          {s.extras.length === 0 && <p className="text-sm text-ink-soft">{t("extras.empty")}</p>}
          {s.extras.map((row) => (
            <div key={row.key} className="flex flex-col gap-4 rounded-lg bg-surface-sunk/50 p-4">
              <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
                <SelectInput
                  label={t("extras.label")}
                  value={row.sourceId}
                  onChange={(id) => pickExtra(row.key, id)}
                  options={extraOptions}
                />
                <NumInput
                  label={t("extras.quantity")}
                  hint={t("extras.quantityHint")}
                  value={row.quantity}
                  onChange={(v) => updateExtra(row.key, { quantity: v })}
                  invalid={bad.has(`${row.key}.quantity`)}
                />
              </div>
              {row.sourceId === CUSTOM && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <TextInput
                    label={t("extras.name")}
                    value={row.name}
                    onChange={(v) => updateExtra(row.key, { name: v })}
                  />
                  <NumInput
                    label={t("extras.unitPrice")}
                    suffix={symbol}
                    value={row.unitPrice}
                    onChange={(v) => updateExtra(row.key, { unitPrice: v })}
                    invalid={bad.has(`${row.key}.unitPrice`)}
                  />
                </div>
              )}
              <button
                type="button"
                onClick={() =>
                  setS((prev) => ({ ...prev, extras: prev.extras.filter((r) => r.key !== row.key) }))
                }
                className="self-start text-sm text-ink-soft underline underline-offset-4"
              >
                {t("remove")}
              </button>
            </div>
          ))}
        </Card>

        <Card title={t("sections.labor")}>
          <div className="grid gap-5 sm:grid-cols-3">
            <NumInput
              label={t("labor.prep")}
              hint={t("labor.prepHint")}
              suffix={t("units.minutes")}
              value={s.prepMinutes}
              onChange={text("prepMinutes")}
              invalid={bad.has("prepMinutes")}
              optional
            />
            <NumInput
              label={t("labor.post")}
              hint={t("labor.postHint")}
              suffix={t("units.minutes")}
              value={s.postMinutes}
              onChange={text("postMinutes")}
              invalid={bad.has("postMinutes")}
              optional
            />
            <NumInput
              label={t("labor.rate")}
              suffix={perHour}
              value={s.laborRate}
              onChange={text("laborRate")}
              invalid={bad.has("laborRate")}
            />
          </div>
        </Card>

        <details
          className="group rounded-xl border border-line bg-surface p-5"
          open={!settings.saved}
        >
          <summary className="flex cursor-pointer list-none items-baseline justify-between gap-3">
            <span className="display text-2xl">{t("sections.business")}</span>
            <span className="text-sm text-ink-soft group-open:hidden">{t("business.collapsed")}</span>
          </summary>
          <p className="mt-3 text-sm text-ink-soft">
            {t.rich("business.lead", {
              link: (chunks) => (
                <Link href="/settings" className="underline underline-offset-4">
                  {chunks}
                </Link>
              ),
            })}
          </p>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <NumInput
              label={t("business.electricity")}
              suffix={`${symbol} ${t("units.perKwh")}`}
              value={s.electricityPrice}
              onChange={text("electricityPrice")}
              invalid={bad.has("electricityPrice")}
            />
            <NumInput
              label={t("business.waste")}
              hint={t("business.wasteHint")}
              suffix="%"
              value={s.wastePct}
              onChange={text("wastePct")}
              invalid={bad.has("wastePct")}
            />
            <NumInput
              label={t("business.failure")}
              hint={t("business.failureHint")}
              suffix="%"
              value={s.failurePct}
              onChange={text("failurePct")}
              invalid={bad.has("failurePct")}
            />
            <NumInput
              label={t("business.overhead")}
              hint={t("business.overheadHint")}
              suffix="%"
              value={s.overheadPct}
              onChange={text("overheadPct")}
              invalid={bad.has("overheadPct")}
            />
            <SelectInput
              label={t("business.profitMode")}
              value={s.profitMode}
              onChange={(v) => set("profitMode", v as CalcState["profitMode"])}
              options={[
                { value: "markup", label: t("business.markup") },
                { value: "margin", label: t("business.margin") },
              ]}
            />
            <NumInput
              label={t("business.profit")}
              suffix="%"
              value={s.profitPct}
              onChange={text("profitPct")}
              invalid={bad.has("profitPct") || issues.includes("pricing.profitPct")}
            />
            <NumInput
              label={t("business.tax")}
              suffix="%"
              value={s.taxPct}
              onChange={text("taxPct")}
              invalid={bad.has("taxPct")}
            />
            <NumInput
              label={t("business.fee")}
              hint={t("business.feeHint")}
              suffix="%"
              value={s.feePct}
              onChange={text("feePct")}
              invalid={bad.has("feePct") || issues.includes("pricing.marketplaceFeePct")}
            />
          </div>
        </details>
      </div>

      <aside
        aria-live="polite"
        className="rounded-xl border border-line bg-surface p-5 lg:sticky lg:top-4"
      >
        <h2 className="display mb-4 text-2xl">{t("result.title")}</h2>
        {result && !empty ? (
          <Breakdown result={result} currency={currency} />
        ) : (
          <p className="text-sm leading-relaxed text-ink-soft">
            {built.ok ? t("result.empty") : problem(t, bad, issues)}
          </p>
        )}
      </aside>

      {/* On small screens the result is far below the form: keep the price in view. */}
      {result && !empty && (
        <div className="fixed inset-x-0 bottom-0 z-10 flex items-center justify-between gap-4 border-t border-line bg-surface px-4 py-3 lg:hidden">
          <div>
            <p className="text-xs text-ink-soft">{t("result.cost")}</p>
            <p className="display text-2xl">{money(result.perPiece.cost)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-ink-soft">{t("result.price")}</p>
            <p className="display text-2xl text-accent">{money(result.perPiece.price)}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function problem(
  t: ReturnType<typeof useTranslations<"Calculator">>,
  bad: Set<string>,
  issues: string[],
) {
  if (bad.size > 0) return t("result.badNumber");
  if (issues.includes("pricing.profitPct")) return t("result.badMargin");
  if (issues.includes("pricing.marketplaceFeePct")) return t("result.badFee");
  return t("result.badRange");
}
