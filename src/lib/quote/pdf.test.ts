import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildQuotePdf, type QuoteData } from "./pdf";
import { quoteLabels } from "./labels";

const fonts = {
  regular: readFileSync(path.join(process.cwd(), "assets/fonts/NotoSans-400Regular.ttf")),
  bold: readFileSync(path.join(process.cwd(), "assets/fonts/NotoSans-700Bold.ttf")),
};

const base: QuoteData = {
  locale: "tr",
  currency: "TRY",
  labels: quoteLabels("tr"),
  number: "Q-20261019-ABCD",
  issuedAt: new Date("2026-10-19T10:00:00Z"),
  validUntil: new Date("2026-11-02T10:00:00Z"),
  businessName: "Şenih 3D Baskı Atölyesi",
  customerName: "Ayşe Yılmaz",
  itemName: "Ejderha anahtarlık, ğüşiöç İĞŞ",
  quantity: 25,
  unitPrice: 25,
  taxRatePct: 20,
  notes: "Teslim süresi 5 iş günü.\nÖdeme: havale/EFT.",
};

const isPdf = (b: Uint8Array) => Buffer.from(b.slice(0, 5)).toString() === "%PDF-";

describe("buildQuotePdf", () => {
  it("renders Turkish text and the lira sign without throwing", async () => {
    expect(isPdf(await buildQuotePdf(base, fonts))).toBe(true);
  });

  it("copes with empty optional fields", async () => {
    const pdf = await buildQuotePdf(
      { ...base, businessName: "", customerName: "", notes: "", validUntil: null, taxRatePct: 0 },
      fonts,
    );
    expect(isPdf(pdf)).toBe(true);
  });

  it("copes with a very long unbroken name and long notes", async () => {
    const pdf = await buildQuotePdf(
      { ...base, itemName: "X".repeat(400), notes: "word ".repeat(300) },
      fonts,
    );
    expect(isPdf(pdf)).toBe(true);
  });
});
