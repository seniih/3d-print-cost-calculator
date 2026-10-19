/** "TRY" → "₺", "USD" → "$", "EUR" → "€", for input suffixes. */
export function currencySymbol(currency: string, locale: string) {
  const part = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
  })
    .formatToParts(0)
    .find((p) => p.type === "currency");
  return part?.value ?? currency;
}
