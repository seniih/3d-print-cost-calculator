"use client";

import { useFormatter, useTranslations } from "next-intl";
import type { CalculationResult } from "@/lib/calculator";

const PARTS = [
  { key: "filament", color: "var(--layer-1)" },
  { key: "electricity", color: "var(--layer-3)" },
  { key: "wear", color: "var(--layer-5)" },
  { key: "failures", color: "var(--layer-6)" },
  { key: "extras", color: "var(--layer-4)" },
  { key: "labor", color: "var(--layer-2)" },
  { key: "overhead", color: "var(--ink-soft)" },
] as const;

/** The result: cost per piece as printed layers, then the price built on top of it. */
export function Breakdown({
  result,
  currency,
}: {
  result: CalculationResult;
  currency: string;
}) {
  const t = useTranslations("Calculator.result");
  const format = useFormatter();
  const money = (n: number) => format.number(n, { style: "currency", currency, currencyDisplay: "narrowSymbol" });
  // Sub-unit amounts such as electricity need a third decimal to say anything.
  const fine = (n: number) =>
    format.number(n, {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
      maximumFractionDigits: Math.abs(n) > 0 && Math.abs(n) < 1 ? 3 : 2,
    });
  const num = (n: number, max = 2) => format.number(n, { maximumFractionDigits: max });

  const { perPiece: p, perJob, order } = result;
  const c = p.costs;
  const amounts: Record<(typeof PARTS)[number]["key"], number> = {
    filament: c.filament,
    electricity: c.electricity,
    wear: c.depreciation + c.maintenance,
    failures: c.failures,
    extras: c.extras,
    labor: c.labor,
    overhead: c.overhead,
  };
  const parts = PARTS.map((part) => ({ ...part, amount: amounts[part.key] })).filter(
    (part) => part.amount > 0,
  );
  const total = p.cost;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-ink-soft">{t("cost")}</p>
          <p className="display mt-1 text-4xl">{money(p.cost)}</p>
        </div>
        <div>
          <p className="text-sm text-ink-soft">{t("price")}</p>
          <p className="display mt-1 text-4xl text-accent">{money(p.price)}</p>
        </div>
      </div>

      {total > 0 && (
        <div className="flex gap-4">
          <div
            className="flex w-16 shrink-0 flex-col-reverse gap-[3px]"
            role="img"
            aria-label={parts.map((x) => `${t(`parts.${x.key}`)} ${fine(x.amount)}`).join(", ")}
          >
            {parts.map((x) => (
              <div
                key={x.key}
                className="rounded-[3px] transition-[height] duration-300"
                style={{ background: x.color, height: `${Math.max(8, (x.amount / total) * 200)}px` }}
              />
            ))}
          </div>
          <dl className="flex flex-1 flex-col-reverse justify-end gap-[3px] text-sm">
            {parts.map((x) => (
              <div
                key={x.key}
                className="flex items-baseline justify-between gap-3 border-t border-line py-1.5 first:border-t-0"
              >
                <dt className="flex items-center gap-2 text-ink-soft">
                  <span
                    className="size-2.5 shrink-0 rounded-[2px]"
                    style={{ background: x.color }}
                    aria-hidden="true"
                  />
                  {t(`parts.${x.key}`)}
                  <span className="text-xs">
                    {format.number(x.amount / total, { style: "percent", maximumFractionDigits: 0 })}
                  </span>
                </dt>
                <dd className="font-medium">{fine(x.amount)}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      <dl className="flex flex-col gap-1.5 border-t border-line pt-4 text-sm">
        <Row label={t("cost")} value={money(p.cost)} />
        <Row label={t("profit")} value={`+ ${money(p.profit)}`} />
        {(p.tax > 0 || p.marketplaceFee > 0) && (
          <>
            <Row label={t("netPrice")} value={money(p.netPrice)} strong />
            {p.tax > 0 && <Row label={t("tax")} value={`+ ${money(p.tax)}`} />}
            {p.marketplaceFee > 0 && (
              <Row label={t("fee")} value={`+ ${money(p.marketplaceFee)}`} />
            )}
          </>
        )}
        <Row label={t("price")} value={money(p.price)} strong />
      </dl>

      {order.quantity > 1 && (
        <section className="border-t border-line pt-4">
          <h3 className="font-semibold">{t("orderTitle", { count: order.quantity })}</h3>
          <dl className="mt-2 flex flex-col gap-1.5 text-sm">
            <Row label={t("orderCost")} value={money(order.cost)} />
            <Row label={t("orderProfit")} value={money(order.profit)} />
            <Row label={t("orderPrice")} value={money(order.price)} strong />
            <Row label={t("orderJobs")} value={num(order.jobs, 0)} />
            <Row label={t("orderHours")} value={`${num(order.printHours)} h`} />
            <Row label={t("orderGrams")} value={`${num(order.filamentGrams, 1)} g`} />
          </dl>
        </section>
      )}

      <section className="border-t border-line pt-4">
        <h3 className="font-semibold">{t("jobTitle")}</h3>
        <dl className="mt-2 flex flex-col gap-1.5 text-sm">
          <Row label={t("jobGrams")} value={`${num(perJob.filamentGrams, 1)} g`} />
          <Row label={t("jobHours")} value={`${num(perJob.printHours)} h`} />
          <Row label={t("jobEnergy")} value={`${num(perJob.energyKwh, 3)} kWh`} />
        </dl>
      </section>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-ink-soft">{label}</dt>
      <dd className={strong ? "font-semibold" : "font-medium"}>{value}</dd>
    </div>
  );
}
