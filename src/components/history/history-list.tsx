"use client";

import { useFormatter, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { CalculationRowDto } from "@/lib/saved/data";
import { deleteCalculation } from "@/lib/saved/actions";
import { EmptyState } from "@/components/library/item-card";

export function HistoryList({
  rows,
  filterName,
}: {
  rows: CalculationRowDto[];
  /** Name of the product the list is filtered to, if any. */
  filterName: string | null;
}) {
  const t = useTranslations("History");
  const tf = useTranslations("Form");
  const format = useFormatter();

  return (
    <div className="flex flex-col gap-6">
      {filterName && (
        <p className="flex flex-wrap items-center gap-3 text-sm">
          <span className="rounded bg-accent-soft px-2 py-1 font-medium">
            {t("filteredBy", { name: filterName })}
          </span>
          <Link href="/history" className="underline underline-offset-4">
            {t("clearFilter")}
          </Link>
        </p>
      )}
      {rows.length === 0 ? (
        <EmptyState>{t("empty")}</EmptyState>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((r) => {
            const money = (n: number) =>
              format.number(n, {
                style: "currency",
                currency: r.currency,
                currencyDisplay: "narrowSymbol",
              });
            return (
              <li
                key={r.id}
                className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-4 sm:flex-row sm:items-center"
              >
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 font-semibold">
                    <span className="truncate">{r.name}</span>
                    {r.productName && (
                      <span className="rounded bg-surface-sunk px-1.5 py-0.5 text-xs font-medium">
                        {r.productName}
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 text-sm text-ink-soft">
                    {format.dateTime(new Date(r.createdAt), { dateStyle: "medium" })}
                    {r.quantity > 1 && `, ${t("quantity", { count: r.quantity })}`}
                  </p>
                </div>
                <dl className="flex gap-6 text-sm">
                  <div>
                    <dt className="text-ink-soft">{t("cost")}</dt>
                    <dd className="font-semibold">{money(r.unitCost)}</dd>
                  </div>
                  <div>
                    <dt className="text-ink-soft">{t("price")}</dt>
                    <dd className="font-semibold text-accent">{money(r.price)}</dd>
                  </div>
                </dl>
                <div className="flex items-center gap-4 text-sm">
                  <Link
                    href={{ pathname: "/calculator", query: { load: r.id } }}
                    className="font-medium underline-offset-4 hover:underline"
                  >
                    {t("open")}
                  </Link>
                  <Link
                    href={`/quote/${r.id}`}
                    className="underline-offset-4 hover:underline"
                  >
                    {t("quote")}
                  </Link>
                  <form
                    action={deleteCalculation}
                    onSubmit={(e) => {
                      if (!window.confirm(t("deleteConfirm", { name: r.name }))) e.preventDefault();
                    }}
                  >
                    <input type="hidden" name="id" value={r.id} />
                    <button
                      type="submit"
                      className="text-ink-soft underline-offset-4 hover:underline"
                    >
                      {tf("remove")}
                    </button>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
