import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ClientMessages } from "@/components/client-messages";
import { SubNav } from "@/components/sub-nav";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Library");
  return { title: t("title") };
}

export default async function LibraryLayout({ children }: LayoutProps<"/[locale]/library">) {
  const t = await getTranslations("Library");

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="display text-4xl sm:text-5xl">{t("title")}</h1>
      <p className="mt-3 max-w-2xl leading-relaxed text-ink-soft">{t("lead")}</p>
      <ClientMessages namespaces={["Header", "Form", "Library"]}>
        <div className="mt-8">
          <SubNav
            label={t("title")}
            items={[
              { href: "/library/printers", label: t("tabs.printers") },
              { href: "/library/filaments", label: t("tabs.filaments") },
              { href: "/library/extras", label: t("tabs.extras") },
            ]}
          />
        </div>
        <div className="mt-8">{children}</div>
      </ClientMessages>
    </div>
  );
}
