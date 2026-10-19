import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { getViewer } from "@/lib/auth/viewer";
import type {
  Currency,
  ExtraCategory,
  ExtraUnit,
  FilamentMaterial,
  ProfitMode,
} from "@/lib/library/schemas";

/**
 * Read side of the library. Every function resolves the viewer itself, so a
 * caller can never ask for someone else's rows. Decimals become plain numbers
 * here, at the edge, so they can cross into Client Components.
 */

export type Settings = {
  currency: Currency;
  electricityPricePerKwh: number;
  laborRatePerHour: number;
  filamentWastePct: number;
  failureRatePct: number;
  overheadPct: number;
  profitMode: ProfitMode;
  profitPct: number;
  taxRatePct: number;
  marketplaceFeePct: number;
  /** False until the user saves the settings form once. */
  saved: boolean;
};

export type PrinterDto = {
  id: string;
  name: string;
  brand: string | null;
  model: string | null;
  purchasePrice: number;
  resaleValue: number;
  lifetimeHours: number;
  powerWatts: number;
  maintenanceCostPerHour: number;
  isDefault: boolean;
  notes: string | null;
};

export type FilamentDto = {
  id: string;
  name: string;
  brand: string | null;
  material: FilamentMaterial;
  color: string | null;
  colorHex: string | null;
  spoolPrice: number;
  spoolWeightGrams: number;
  isDefault: boolean;
  notes: string | null;
};

export type ExtraItemDto = {
  id: string;
  name: string;
  category: ExtraCategory;
  unit: ExtraUnit;
  unitPrice: number;
  notes: string | null;
};

const num = (d: Prisma.Decimal) => d.toNumber();

/** Sensible starting values before the user has saved anything. */
export function defaultSettings(locale: string): Settings {
  return {
    currency: locale === "tr" ? "TRY" : "USD",
    electricityPricePerKwh: 0,
    laborRatePerHour: 0,
    filamentWastePct: 5,
    failureRatePct: 5,
    overheadPct: 0,
    profitMode: "MARKUP",
    profitPct: 30,
    taxRatePct: 0,
    marketplaceFeePct: 0,
    saved: false,
  };
}

export async function getSettings(locale: string): Promise<Settings> {
  const viewer = await getViewer();
  if (!viewer.user) return defaultSettings(locale);

  const row = await db().userSettings.findUnique({ where: { userId: viewer.user.id } });
  if (!row) return defaultSettings(locale);

  return {
    currency: row.currency,
    electricityPricePerKwh: num(row.electricityPricePerKwh),
    laborRatePerHour: num(row.laborRatePerHour),
    filamentWastePct: num(row.filamentWastePct),
    failureRatePct: num(row.failureRatePct),
    overheadPct: num(row.overheadPct),
    profitMode: row.profitMode,
    profitPct: num(row.profitPct),
    taxRatePct: num(row.taxRatePct),
    marketplaceFeePct: num(row.marketplaceFeePct),
    saved: true,
  };
}

export async function listPrinters(): Promise<PrinterDto[]> {
  const viewer = await getViewer();
  if (!viewer.user) return [];

  const rows = await db().printer.findMany({
    where: { userId: viewer.user.id, archivedAt: null },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    brand: r.brand,
    model: r.model,
    purchasePrice: num(r.purchasePrice),
    resaleValue: num(r.resaleValue),
    lifetimeHours: r.lifetimeHours,
    powerWatts: r.powerWatts,
    maintenanceCostPerHour: num(r.maintenanceCostPerHour),
    isDefault: r.isDefault,
    notes: r.notes,
  }));
}

export async function listFilaments(): Promise<FilamentDto[]> {
  const viewer = await getViewer();
  if (!viewer.user) return [];

  const rows = await db().filament.findMany({
    where: { userId: viewer.user.id, archivedAt: null },
    orderBy: [{ isDefault: "desc" }, { material: "asc" }, { name: "asc" }],
  });
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    brand: r.brand,
    material: r.material,
    color: r.color,
    colorHex: r.colorHex,
    spoolPrice: num(r.spoolPrice),
    spoolWeightGrams: r.spoolWeightGrams,
    isDefault: r.isDefault,
    notes: r.notes,
  }));
}

export async function listExtraItems(): Promise<ExtraItemDto[]> {
  const viewer = await getViewer();
  if (!viewer.user) return [];

  const rows = await db().extraItem.findMany({
    where: { userId: viewer.user.id, archivedAt: null },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    category: r.category,
    unit: r.unit,
    unitPrice: num(r.unitPrice),
    notes: r.notes,
  }));
}
