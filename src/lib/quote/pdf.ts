import { PDFDocument, rgb, type PDFFont } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

/**
 * A one-page customer quote. The customer sees item, quantity, price and
 * totals only: never the cost breakdown or the profit.
 */

export type QuoteLabels = {
  title: string;
  number: string;
  date: string;
  validUntil: string;
  from: string;
  preparedFor: string;
  item: string;
  quantity: string;
  unitPrice: string;
  total: string;
  subtotal: string;
  vat: string;
  notes: string;
};

export type QuoteData = {
  locale: string;
  currency: string;
  labels: QuoteLabels;
  number: string;
  issuedAt: Date;
  validUntil: Date | null;
  businessName: string;
  customerName: string;
  itemName: string;
  quantity: number;
  /** What the customer pays for one piece, tax included. */
  unitPrice: number;
  /** Tax rate in percent, 0 for none. */
  taxRatePct: number;
  notes: string;
};

export type QuoteFonts = { regular: Uint8Array; bold: Uint8Array };

const A4 = { w: 595.28, h: 841.89 };
const M = 56; // page margin
const INK = rgb(0.11, 0.13, 0.16);
const SOFT = rgb(0.38, 0.42, 0.47);
const LINE = rgb(0.8, 0.83, 0.87);
const ACCENT = rgb(0.66, 0.45, 0.11);

export async function buildQuotePdf(q: QuoteData, fonts: QuoteFonts): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  // Subsetting off: the fonts are already small and this keeps every glyph.
  const regular = await doc.embedFont(fonts.regular, { subset: false });
  const bold = await doc.embedFont(fonts.bold, { subset: false });
  doc.setTitle(`${q.labels.title} ${q.number}`);
  doc.setCreator("3D Print Cost Calculator");

  const page = doc.addPage([A4.w, A4.h]);
  const right = A4.w - M;
  const money = (n: number) =>
    clean(
      new Intl.NumberFormat(q.locale, {
        style: "currency",
        currency: q.currency,
        currencyDisplay: "narrowSymbol",
      }).format(n),
    );
  const date = (d: Date) => clean(new Intl.DateTimeFormat(q.locale, { dateStyle: "long" }).format(d));

  const text = (s: string, x: number, y: number, size: number, font: PDFFont, color = INK) =>
    page.drawText(s, { x, y, size, font, color });
  const textRight = (s: string, xRight: number, y: number, size: number, font: PDFFont, color = INK) =>
    text(s, xRight - font.widthOfTextAtSize(s, size), y, size, font, color);

  // --- Header ----------------------------------------------------------------
  let y = A4.h - M - 8;
  const business = q.businessName.trim();
  if (business) {
    for (const line of wrap(business, bold, 20, 300)) {
      text(line, M, y, 20, bold);
      y -= 24;
    }
  }
  textRight(q.labels.title.toUpperCase(), right, A4.h - M - 8, 26, bold, ACCENT);
  let ry = A4.h - M - 30;
  for (const [label, value] of [
    [q.labels.number, q.number],
    [q.labels.date, date(q.issuedAt)],
    ...(q.validUntil ? [[q.labels.validUntil, date(q.validUntil)]] : []),
  ] as [string, string][]) {
    textRight(value, right, ry, 10, regular);
    textRight(label, right - regular.widthOfTextAtSize(value, 10) - 8, ry, 10, regular, SOFT);
    ry -= 15;
  }
  y = Math.min(y, ry) - 24;

  // --- Customer --------------------------------------------------------------
  if (q.customerName.trim()) {
    text(q.labels.preparedFor.toUpperCase(), M, y, 8, bold, SOFT);
    y -= 15;
    for (const line of wrap(q.customerName.trim(), regular, 12, 320)) {
      text(line, M, y, 12, regular);
      y -= 16;
    }
    y -= 10;
  }
  y -= 14;

  // --- Table -----------------------------------------------------------------
  const col = { qty: right - 200, unit: right - 110, total: right };
  text(q.labels.item.toUpperCase(), M, y, 8, bold, SOFT);
  textRight(q.labels.quantity.toUpperCase(), col.qty, y, 8, bold, SOFT);
  textRight(q.labels.unitPrice.toUpperCase(), col.unit, y, 8, bold, SOFT);
  textRight(q.labels.total.toUpperCase(), col.total, y, 8, bold, SOFT);
  y -= 8;
  page.drawLine({ start: { x: M, y }, end: { x: right, y }, thickness: 0.75, color: INK });
  y -= 20;

  const lineTotal = q.unitPrice * q.quantity;
  const itemLines = wrap(q.itemName.trim() || "—", regular, 12, col.qty - M - 70);
  const rowTop = y;
  for (const line of itemLines) {
    text(line, M, y, 12, regular);
    y -= 16;
  }
  textRight(String(q.quantity), col.qty, rowTop, 12, regular);
  textRight(money(q.unitPrice), col.unit, rowTop, 12, regular);
  textRight(money(lineTotal), col.total, rowTop, 12, regular);
  y -= 2;
  page.drawLine({ start: { x: M, y }, end: { x: right, y }, thickness: 0.5, color: LINE });
  y -= 24;

  // --- Totals ----------------------------------------------------------------
  const labelX = right - 230;
  if (q.taxRatePct > 0) {
    const tax = lineTotal - lineTotal / (1 + q.taxRatePct / 100);
    const rate = new Intl.NumberFormat(q.locale, { maximumFractionDigits: 2 }).format(q.taxRatePct);
    text(q.labels.subtotal, labelX, y, 11, regular, SOFT);
    textRight(money(lineTotal - tax), right, y, 11, regular);
    y -= 18;
    text(q.labels.vat.replace("{rate}", rate), labelX, y, 11, regular, SOFT);
    textRight(money(tax), right, y, 11, regular);
    y -= 12;
  }
  page.drawLine({ start: { x: labelX, y }, end: { x: right, y }, thickness: 0.5, color: LINE });
  y -= 22;
  text(q.labels.total, labelX, y, 14, bold);
  textRight(money(lineTotal), right, y, 14, bold, ACCENT);
  y -= 40;

  // --- Notes -----------------------------------------------------------------
  if (q.notes.trim()) {
    text(q.labels.notes.toUpperCase(), M, y, 8, bold, SOFT);
    y -= 15;
    for (const paragraph of q.notes.trim().split(/\r?\n/)) {
      for (const line of wrap(paragraph, regular, 10.5, right - M)) {
        if (y < M) break;
        text(line, M, y, 10.5, regular);
        y -= 14.5;
      }
    }
  }

  return doc.save();
}

/** Intl uses no-break and narrow spaces that the font may not carry. */
function clean(s: string) {
  return s.replace(/[   ]/g, " ");
}

/** Breaks `text` into lines no wider than `maxWidth`, splitting overlong words. */
export function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const width = (s: string) => font.widthOfTextAtSize(s, size);
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    let w = word;
    while (width(w) > maxWidth) {
      // A word wider than the line: cut it where it fits.
      let n = w.length;
      while (n > 1 && width(w.slice(0, n)) > maxWidth) n--;
      if (line) {
        lines.push(line);
        line = "";
      }
      lines.push(w.slice(0, n));
      w = w.slice(n);
    }
    const next = line ? `${line} ${w}` : w;
    if (width(next) <= maxWidth) line = next;
    else {
      lines.push(line);
      line = w;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}
