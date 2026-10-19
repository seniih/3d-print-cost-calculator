import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { listProducts } from "@/lib/saved/data";
import { ClientMessages } from "@/components/client-messages";
import { ProductList } from "@/components/products/product-list";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Products");
  return { title: t("title") };
}

export default async function ProductsPage() {
  const t = await getTranslations("Products");
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="display text-4xl sm:text-5xl">{t("title")}</h1>
      <p className="mt-3 max-w-2xl leading-relaxed text-ink-soft">{t("lead")}</p>
      <ClientMessages namespaces={["Header", "Form", "Products", "Library"]}>
        <Suspense fallback={<div className="mt-8 h-64 rounded-lg bg-surface-sunk" />}>
          <Products />
        </Suspense>
      </ClientMessages>
    </div>
  );
}

async function Products() {
  const products = await listProducts();
  return (
    <div className="mt-8">
      <ProductList products={products} />
    </div>
  );
}
