import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { locale } from "next/root-params";
import { calculate } from "@/lib/calculator";
import { getSettings } from "@/lib/library/data";
import { getCalculation } from "@/lib/saved/data";
import { ClientMessages } from "@/components/client-messages";
import { QuoteForm } from "@/components/quote/quote-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Quote");
  return { title: t("title") };
}

export default async function QuotePage({ params }: PageProps<"/[locale]/quote/[id]">) {
  const t = await getTranslations("Quote");
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="display text-4xl sm:text-5xl">{t("title")}</h1>
      <p className="mt-3 max-w-2xl leading-relaxed text-ink-soft">{t("lead")}</p>
      <ClientMessages namespaces={["Header", "Form", "Quote"]}>
        <Suspense fallback={<div className="mt-8 h-96 rounded-lg bg-surface-sunk" />}>
          <Loader params={params} />
        </Suspense>
      </ClientMessages>
    </div>
  );
}

async function Loader({ params }: { params: PageProps<"/[locale]/quote/[id]">["params"] }) {
  const { id } = await params;
  const [calc, settings] = await Promise.all([getCalculation(id), getSettings(await locale())]);
  if (!calc) notFound();
  const result = calculate(calc.inputs);

  return (
    <div className="mt-8">
      <QuoteForm
        id={calc.id}
        title={calc.name}
        currency={calc.currency}
        price={result.perPiece.price}
        quantity={calc.inputs.quantity}
        taxRatePct={calc.inputs.pricing.taxRatePct}
        businessName={settings.businessName ?? ""}
      />
    </div>
  );
}
