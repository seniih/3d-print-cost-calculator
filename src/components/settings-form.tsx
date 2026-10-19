"use client";

import { useCurrencySymbol } from "@/components/form/use-currency-symbol";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";
import type { Settings } from "@/lib/library/data";
import { CURRENCIES, PROFIT_MODES, type Currency, type ProfitMode } from "@/lib/library/schemas";
import { saveSettings } from "@/lib/library/actions";
import { parseDecimal } from "@/lib/forms";
import { FormShell } from "@/components/form/form-shell";
import { NumberField, SelectField } from "@/components/form/fields";

export function SettingsForm({ settings }: { settings: Settings }) {
  const t = useTranslations("Settings");
  const f = (k: string) => t(`fields.${k}` as "fields.currency");
  const [currency, setCurrency] = useState(settings.currency);
  const symbol = useCurrencySymbol(currency);

  return (
    <FormShell action={saveSettings}>
      {(errors) => (
        <>
          <Section title={t("sections.money")}>
            <SelectField
              name="currency"
              label={f("currency")}
              hint={f("currencyHint")}
              defaultValue={settings.currency}
              options={CURRENCIES.map((c) => ({ value: c, label: t(`currencies.${c}`) }))}
              onValueChange={(v) => setCurrency(v as Currency)}
              error={errors.currency}
            />
          </Section>

          <Section title={t("sections.costs")}>
            <NumberField
              name="electricityPricePerKwh"
              label={f("electricityPricePerKwh")}
              hint={f("electricityPricePerKwhHint")}
              suffix={`${symbol} ${t("units.perKwh")}`}
              defaultValue={settings.electricityPricePerKwh}
              error={errors.electricityPricePerKwh}
            />
            <NumberField
              name="laborRatePerHour"
              label={f("laborRatePerHour")}
              hint={f("laborRatePerHourHint")}
              suffix={`${symbol} ${t("units.perHour")}`}
              defaultValue={settings.laborRatePerHour}
              error={errors.laborRatePerHour}
            />
          </Section>

          <Section title={t("sections.production")}>
            <Percent name="filamentWastePct" settings={settings} errors={errors} />
            <Percent name="failureRatePct" settings={settings} errors={errors} />
            <Percent name="overheadPct" settings={settings} errors={errors} />
          </Section>

          <Section title={t("sections.pricing")}>
            <ProfitFields settings={settings} currency={currency} errors={errors} />
            <Percent name="taxRatePct" settings={settings} errors={errors} />
            <Percent name="marketplaceFeePct" settings={settings} errors={errors} />
          </Section>
        </>
      )}
    </FormShell>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="grid gap-5 border-t border-line pt-6 sm:grid-cols-2">
      <legend className="float-left mb-1 w-full text-lg font-semibold sm:col-span-2">{title}</legend>
      {children}
    </fieldset>
  );
}

type PercentKey =
  | "filamentWastePct"
  | "failureRatePct"
  | "overheadPct"
  | "taxRatePct"
  | "marketplaceFeePct";

function Percent({
  name,
  settings,
  errors,
}: {
  name: PercentKey;
  settings: Settings;
  errors: Record<string, string>;
}) {
  const t = useTranslations("Settings");
  return (
    <NumberField
      name={name}
      label={t(`fields.${name}`)}
      hint={t(`fields.${name}Hint`)}
      suffix="%"
      defaultValue={settings[name]}
      error={errors[name]}
    />
  );
}

/** Markup or margin, with a worked example that updates as you type. */
function ProfitFields({
  settings,
  currency,
  errors,
}: {
  settings: Settings;
  currency: string;
  errors: Record<string, string>;
}) {
  const t = useTranslations("Settings");
  const locale = useLocale();
  const format = useFormatter();
  const [mode, setMode] = useState<ProfitMode>(settings.profitMode);
  const [pctText, setPctText] = useState(() =>
    new Intl.NumberFormat(locale, { useGrouping: false }).format(settings.profitPct),
  );

  const pct = parseDecimal(pctText, locale) ?? 0;
  const cost = 100;
  const price =
    mode === "MARKUP" ? cost * (1 + pct / 100) : pct < 100 ? cost / (1 - pct / 100) : NaN;
  const money = (n: number) => format.number(n, { style: "currency", currency });

  return (
    <>
      <div role="radiogroup" aria-label={t("fields.profitMode")} className="sm:col-span-2">
        <p className="text-sm font-medium">{t("fields.profitMode")}</p>
        <div className="mt-1.5 grid gap-2 sm:grid-cols-2">
          {PROFIT_MODES.map((m) => (
            <label
              key={m}
              className={
                "flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2.5 " +
                (mode === m ? "border-accent bg-accent-soft" : "border-line bg-surface")
              }
            >
              <input
                type="radio"
                name="profitMode"
                value={m}
                checked={mode === m}
                onChange={() => setMode(m)}
                className="accent-[var(--accent)]"
              />
              {t(`profitModes.${m}`)}
            </label>
          ))}
        </div>
      </div>
      <NumberField
        name="profitPct"
        label={t("fields.profitPct")}
        suffix="%"
        defaultValue={settings.profitPct}
        onValueChange={setPctText}
        error={errors.profitPct}
      />
      <p className="self-end pb-3 text-sm leading-snug text-ink-soft" aria-live="polite">
        {Number.isFinite(price) &&
          t(`profitModes.${mode}_hint`, {
            cost: money(cost),
            pct: format.number(pct / 100, { style: "percent", maximumFractionDigits: 2 }),
            price: money(price),
          })}
      </p>
    </>
  );
}
