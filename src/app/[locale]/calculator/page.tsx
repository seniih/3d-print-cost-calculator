import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { locale } from "next/root-params";
import { getSettings, listExtraItems, listFilaments, listPrinters } from "@/lib/library/data";
import { ClientMessages } from "@/components/client-messages";
import { Calculator } from "@/components/calculator/calculator";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Calculator");
  return { title: t("title") };
}

export default async function CalculatorPage() {
  const t = await getTranslations("Calculator");

  return (
    <div className="mx-auto max-w-6xl px-4 pb-28 pt-10 lg:pb-12">
      <h1 className="display text-4xl sm:text-5xl">{t("title")}</h1>
      <p className="mt-3 max-w-2xl leading-relaxed text-ink-soft">{t("lead")}</p>
      <ClientMessages namespaces={["Header", "Form", "Calculator"]}>
        <Suspense fallback={<div className="mt-8 h-[40rem] rounded-xl bg-surface-sunk" />}>
          <CalculatorLoader />
        </Suspense>
      </ClientMessages>
    </div>
  );
}

async function CalculatorLoader() {
  const [settings, printers, filaments, extras] = await Promise.all([
    getSettings(await locale()),
    listPrinters(),
    listFilaments(),
    listExtraItems(),
  ]);
  return (
    <div className="mt-8">
      <Calculator library={{ printers, filaments, extras }} settings={settings} />
    </div>
  );
}
