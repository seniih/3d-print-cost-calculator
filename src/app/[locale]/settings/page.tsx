import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { locale } from "next/root-params";
import { getSettings } from "@/lib/library/data";
import { ClientMessages } from "@/components/client-messages";
import { SettingsForm } from "@/components/settings-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Settings");
  return { title: t("title") };
}

export default async function SettingsPage() {
  const t = await getTranslations("Settings");

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="display text-4xl sm:text-5xl">{t("title")}</h1>
      <p className="mt-3 max-w-2xl leading-relaxed text-ink-soft">{t("lead")}</p>
      <ClientMessages namespaces={["Header", "Form", "Settings"]}>
        <Suspense fallback={<div className="mt-10 h-96 rounded-lg bg-surface-sunk" />}>
          <SettingsLoader />
        </Suspense>
      </ClientMessages>
    </div>
  );
}

async function SettingsLoader() {
  const [settings, t] = await Promise.all([getSettings(await locale()), getTranslations("Settings")]);
  return (
    <div className="mt-8">
      {!settings.saved && (
        <p className="mb-6 rounded-md bg-accent-soft px-4 py-3 text-sm">{t("notSavedYet")}</p>
      )}
      <SettingsForm settings={settings} />
    </div>
  );
}
