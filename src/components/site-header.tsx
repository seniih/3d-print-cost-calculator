import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { LanguageSwitcher } from "@/components/language-switcher";
import { AccountStatus } from "@/components/account-status";
import { MainNav } from "@/components/main-nav";

export async function SiteHeader() {
  const t = await getTranslations("Metadata");

  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2.5">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <LogoMark />
          <span className="hidden lg:inline">{t("title")}</span>
        </Link>
        <div className="order-last -mx-3 w-full sm:order-none sm:mx-0 sm:w-auto">
          <MainNav />
        </div>
        <div className="ml-auto flex items-center gap-3">
          <LanguageSwitcher />
          {/* Reads the session, so it streams in after the static shell. */}
          <Suspense fallback={<span className="h-8 w-20 rounded-md bg-surface-sunk" />}>
            <AccountStatus />
          </Suspense>
        </div>
      </div>
    </header>
  );
}

/** Three stacked layers: a print seen from the side. */
function LogoMark() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
      <rect x="3" y="14" width="16" height="5" rx="1" fill="var(--layer-1)" />
      <rect x="5" y="8.5" width="12" height="5" rx="1" fill="var(--layer-2)" />
      <rect x="7" y="3" width="8" height="5" rx="1" fill="var(--accent)" />
    </svg>
  );
}
