import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { listCalculations, listProducts } from "@/lib/saved/data";
import { ClientMessages } from "@/components/client-messages";
import { HistoryList } from "@/components/history/history-list";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("History");
  return { title: t("title") };
}

export default async function HistoryPage({ searchParams }: PageProps<"/[locale]/history">) {
  const t = await getTranslations("History");
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="display text-4xl sm:text-5xl">{t("title")}</h1>
      <p className="mt-3 max-w-2xl leading-relaxed text-ink-soft">{t("lead")}</p>
      <ClientMessages namespaces={["Header", "Form", "History"]}>
        <Suspense fallback={<div className="mt-8 h-64 rounded-lg bg-surface-sunk" />}>
          <History searchParams={searchParams} />
        </Suspense>
      </ClientMessages>
    </div>
  );
}

async function History({
  searchParams,
}: {
  searchParams: PageProps<"/[locale]/history">["searchParams"];
}) {
  const { product } = await searchParams;
  const productId = typeof product === "string" ? product : undefined;
  const [rows, products] = await Promise.all([listCalculations(productId), listProducts()]);
  const filterName = productId ? (products.find((p) => p.id === productId)?.name ?? null) : null;
  return (
    <div className="mt-8">
      <HistoryList rows={rows} filterName={filterName} />
    </div>
  );
}
