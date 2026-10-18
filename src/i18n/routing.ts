import { defineRouting } from "next-intl/routing";

export const locales = ["en", "tr"] as const;
export type Locale = (typeof locales)[number];

export const routing = defineRouting({
  locales,
  defaultLocale: "en",
  // Every page lives under /en or /tr: clean, crawlable URLs for each language.
  localePrefix: "always",
});
