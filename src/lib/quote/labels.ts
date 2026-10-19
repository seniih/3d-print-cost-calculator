import en from "../../../messages/en.json";
import tr from "../../../messages/tr.json";
import type { QuoteLabels } from "./pdf";

/**
 * Quote labels per language. Read straight from the message files: a Route
 * Handler can't use next-intl's request config, which depends on the page's
 * locale segment.
 */
const byLocale: Record<string, QuoteLabels> = { en: en.Quote.pdf, tr: tr.Quote.pdf };

export function quoteLabels(locale: string): QuoteLabels {
  return byLocale[locale] ?? byLocale.en;
}
