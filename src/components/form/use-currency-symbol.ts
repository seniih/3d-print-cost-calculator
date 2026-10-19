"use client";

import { useLocale } from "next-intl";
import { currencySymbol } from "@/lib/currency";

export function useCurrencySymbol(currency: string) {
  return currencySymbol(currency, useLocale());
}
