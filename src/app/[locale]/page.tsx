import { getFormatter, getTranslations } from "next-intl/server";
import { REPO_URL } from "@/components/site-footer";
import { calculate, exampleCurrency, exampleInputs } from "@/lib/calculator";

export default async function HomePage() {
  const [t, format] = await Promise.all([getTranslations("Home"), getFormatter()]);
  const money = (n: number) => format.number(n, { style: "currency", currency: exampleCurrency });

  // The hero shows a real run of the cost engine, not made-up numbers.
  const result = calculate(exampleInputs);
  const c = result.perPiece.costs;
  const example = {
    parts: [
      { key: "filament", amount: c.filament, color: "var(--layer-1)" },
      { key: "electricity", amount: c.electricity, color: "var(--layer-3)" },
      { key: "wear", amount: c.depreciation + c.maintenance, color: "var(--layer-5)" },
      { key: "extras", amount: c.extras, color: "var(--layer-4)" },
      { key: "labor", amount: c.labor, color: "var(--layer-2)" },
      { key: "failures", amount: c.failures, color: "var(--layer-6)" },
    ],
    suggestedPrice: result.perPiece.price,
  } as const;
  const total = result.perPiece.cost;

  return (
    <>
      <section className="mx-auto grid max-w-6xl gap-12 px-4 py-14 md:grid-cols-[1.1fr_1fr] md:py-20">
        <div className="flex flex-col justify-center">
          <h1 className="display text-5xl text-balance sm:text-6xl lg:text-7xl">{t("title")}</h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-soft">{t("lead")}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href={`${REPO_URL}#quick-start`}
              className="rounded-md bg-accent px-5 py-3 font-semibold text-accent-ink hover:opacity-90"
            >
              {t("selfHost")}
            </a>
          </div>
        </div>

        {/* The cost of one print, stacked bottom-up like printed layers. */}
        <figure className="rounded-xl border border-line bg-surface p-6">
          <figcaption className="text-sm text-ink-soft">{t("exampleTitle")}</figcaption>
          <div className="mt-5 flex gap-5">
            <div
              className="flex w-24 shrink-0 flex-col-reverse gap-[3px] sm:w-32"
              role="img"
              aria-label={example.parts
                .map((p) => `${t(`parts.${p.key}`)} ${money(p.amount)}`)
                .join(", ")}
            >
              {example.parts.map((p, i) => (
                <div
                  key={p.key}
                  className="layer-in origin-bottom rounded-[3px]"
                  style={{
                    background: p.color,
                    height: `${Math.max(14, (p.amount / total) * 260)}px`,
                    animationDelay: `${i * 90}ms`,
                  }}
                />
              ))}
            </div>
            <dl className="flex flex-1 flex-col-reverse justify-start gap-[3px] text-sm">
              {example.parts.map((p) => (
                <div
                  key={p.key}
                  className="flex items-baseline justify-between gap-3 border-t border-line py-1.5 last:border-t-0"
                >
                  <dt className="flex items-center gap-2 text-ink-soft">
                    <span
                      className="size-2.5 rounded-[2px]"
                      style={{ background: p.color }}
                      aria-hidden="true"
                    />
                    {t(`parts.${p.key}`)}
                  </dt>
                  <dd className="font-medium">{money(p.amount)}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-4 border-t border-line pt-5">
            <div>
              <p className="text-sm text-ink-soft">{t("exampleTotal")}</p>
              <p className="display mt-1 text-3xl">{money(total)}</p>
            </div>
            <div>
              <p className="text-sm text-ink-soft">{t("examplePrice")}</p>
              <p className="display mt-1 text-3xl text-accent">{money(example.suggestedPrice)}</p>
            </div>
          </div>
        </figure>
      </section>

      <section className="border-t border-line bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <h2 className="display text-3xl sm:text-4xl">{t("countsTitle")}</h2>
          <ul className="mt-8 grid gap-x-10 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
            {(["filament", "machine", "extras", "labor", "business"] as const).map((key) => (
              <li key={key} className="border-l-2 border-accent pl-4 leading-relaxed">
                {t(`counts.${key}`)}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
