"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { ProductDto } from "@/lib/saved/data";
import { archiveProduct, saveProduct } from "@/lib/saved/actions";
import { FormShell } from "@/components/form/form-shell";
import { TextAreaField, TextField } from "@/components/form/fields";
import { ImageField } from "@/components/form/image-field";
import { AddPanel, EmptyState, ItemCard } from "@/components/library/item-card";

export function ProductList({ products }: { products: ProductDto[] }) {
  const t = useTranslations("Products");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <AddPanel
          addLabel={t("add")}
          title={t("newTitle")}
          startOpen={products.length === 0}
          renderForm={(close) => <ProductForm onDone={close} />}
        />
      </div>
      {products.length === 0 ? (
        <EmptyState>{t("empty")}</EmptyState>
      ) : (
        <ul className="flex flex-col gap-3">
          {products.map((p) => (
            <ItemCard
              key={p.id}
              id={p.id}
              name={p.name}
              editTitle={t("editTitle")}
              onArchive={archiveProduct}
              swatch={<Thumb src={p.imageData} />}
              summary={
                <>
                  {p.description && <span className="block">{p.description}</span>}
                  <span>{t("calculationCount", { count: p.calculationCount })}</span>
                </>
              }
              links={
                <>
                  <Link
                    href={{ pathname: "/calculator", query: { product: p.id } }}
                    className="font-medium underline-offset-4 hover:underline"
                  >
                    {t("newCalculation")}
                  </Link>
                  {p.calculationCount > 0 && (
                    <Link
                      href={{ pathname: "/history", query: { product: p.id } }}
                      className="text-ink-soft underline-offset-4 hover:underline"
                    >
                      {t("viewHistory")}
                    </Link>
                  )}
                </>
              }
              renderForm={(close) => <ProductForm product={p} onDone={close} />}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function Thumb({ src }: { src: string | null }) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element -- a small data URL, nothing to optimize
    <img src={src} alt="" className="size-14 shrink-0 rounded-md border border-line object-cover" />
  ) : (
    <div className="size-14 shrink-0 rounded-md bg-surface-sunk" aria-hidden="true" />
  );
}

function ProductForm({ product, onDone }: { product?: ProductDto; onDone: () => void }) {
  const t = useTranslations("Products.fields");
  return (
    <FormShell action={saveProduct} id={product?.id} onSaved={onDone} onCancel={onDone}>
      {(errors) => (
        <>
          <TextField
            name="name"
            label={t("name")}
            hint={t("nameHint")}
            defaultValue={product?.name}
            error={errors.name}
          />
          <TextAreaField
            name="description"
            label={t("description")}
            optional
            defaultValue={product?.description}
            error={errors.description}
          />
          <ImageField
            name="imageData"
            label={t("image")}
            defaultValue={product?.imageData}
            error={errors.imageData}
          />
        </>
      )}
    </FormShell>
  );
}
