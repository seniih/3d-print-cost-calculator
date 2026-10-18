import { getTranslations } from "next-intl/server";

export const REPO_URL = "https://github.com/seniih/3d-print-cost-calculator";

export async function SiteFooter() {
  const t = await getTranslations("Footer");

  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-6 text-sm text-ink-soft">
        <p>{t("openSource")}</p>
        <a href={REPO_URL} className="underline underline-offset-4 hover:text-ink">
          {t("github")}
        </a>
      </div>
    </footer>
  );
}
