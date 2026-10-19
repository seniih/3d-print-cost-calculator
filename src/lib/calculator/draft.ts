import type { ExtraItemDto, FilamentDto, PrinterDto, Settings } from "@/lib/library/data";
import { parseDecimal } from "@/lib/forms";
import { calculationInputsSchema, type CalculationInputs } from "./schema";

/**
 * The calculator form's state, and how it becomes engine inputs.
 *
 * Everything the user types stays a string, exactly as typed, so half-finished
 * numbers ("1,") are never rewritten under their cursor. `buildInputs` reads
 * them the way the user's language writes numbers.
 */

/** `sourceId` value for a row that is typed in by hand rather than picked from the library. */
export const CUSTOM = "custom";

export type FilamentRow = {
  key: string;
  sourceId: string;
  name: string;
  spoolPrice: string;
  spoolWeight: string;
  grams: string;
};

export type ExtraRow = {
  key: string;
  sourceId: string;
  name: string;
  unitPrice: string;
  quantity: string;
};

export type CalcState = {
  printerId: string;
  printerName: string;
  purchasePrice: string;
  resaleValue: string;
  lifetimeHours: string;
  powerWatts: string;
  maintenancePerHour: string;
  hours: string;
  minutes: string;
  piecesPerJob: string;
  quantity: string;
  filaments: FilamentRow[];
  extras: ExtraRow[];
  prepMinutes: string;
  postMinutes: string;
  laborRate: string;
  electricityPrice: string;
  wastePct: string;
  failurePct: string;
  overheadPct: string;
  profitMode: "markup" | "margin";
  profitPct: string;
  taxPct: string;
  feePct: string;
};

export type Library = {
  printers: PrinterDto[];
  filaments: FilamentDto[];
  extras: ExtraItemDto[];
};

/** A number as an input would show it: no grouping, in the user's decimal style. */
export function formatInput(n: number, locale: string) {
  return new Intl.NumberFormat(locale, { useGrouping: false, maximumFractionDigits: 4 }).format(n);
}

let rowCounter = 0;
export const newKey = () => `row-${++rowCounter}`;

export function printerFields(p: PrinterDto, locale: string) {
  return {
    printerId: p.id,
    printerName: p.name,
    purchasePrice: formatInput(p.purchasePrice, locale),
    resaleValue: formatInput(p.resaleValue, locale),
    lifetimeHours: formatInput(p.lifetimeHours, locale),
    powerWatts: formatInput(p.powerWatts, locale),
    maintenancePerHour: formatInput(p.maintenanceCostPerHour, locale),
  };
}

export function filamentRow(f: FilamentDto | undefined, locale: string, grams = ""): FilamentRow {
  return f
    ? {
        key: newKey(),
        sourceId: f.id,
        name: f.name,
        spoolPrice: formatInput(f.spoolPrice, locale),
        spoolWeight: formatInput(f.spoolWeightGrams, locale),
        grams,
      }
    : { key: newKey(), sourceId: CUSTOM, name: "", spoolPrice: "", spoolWeight: "1000", grams };
}

export function extraRow(e: ExtraItemDto | undefined, locale: string): ExtraRow {
  return e
    ? {
        key: newKey(),
        sourceId: e.id,
        name: e.name,
        unitPrice: formatInput(e.unitPrice, locale),
        quantity: "1",
      }
    : { key: newKey(), sourceId: CUSTOM, name: "", unitPrice: "", quantity: "1" };
}

export function initialState(lib: Library, settings: Settings, locale: string): CalcState {
  const printer = lib.printers.find((p) => p.isDefault) ?? lib.printers[0];
  const filament = lib.filaments.find((f) => f.isDefault) ?? lib.filaments[0];
  return {
    ...(printer
      ? printerFields(printer, locale)
      : {
          printerId: CUSTOM,
          printerName: "",
          purchasePrice: "",
          resaleValue: "",
          lifetimeHours: "",
          powerWatts: "",
          maintenancePerHour: "",
        }),
    hours: "",
    minutes: "",
    piecesPerJob: "1",
    quantity: "1",
    filaments: [filamentRow(filament, locale)],
    extras: [],
    prepMinutes: "",
    postMinutes: "",
    laborRate: formatInput(settings.laborRatePerHour, locale),
    electricityPrice: formatInput(settings.electricityPricePerKwh, locale),
    wastePct: formatInput(settings.filamentWastePct, locale),
    failurePct: formatInput(settings.failureRatePct, locale),
    overheadPct: formatInput(settings.overheadPct, locale),
    profitMode: settings.profitMode === "MARGIN" ? "margin" : "markup",
    profitPct: formatInput(settings.profitPct, locale),
    taxPct: formatInput(settings.taxRatePct, locale),
    feePct: formatInput(settings.marketplaceFeePct, locale),
  };
}

export type BuildResult =
  | { ok: true; inputs: CalculationInputs }
  | {
      ok: false;
      /** Names of fields whose text isn't a number. */
      bad: Set<string>;
      /** Paths of values the engine's schema rejected, e.g. "pricing.profitPct". */
      issues: string[];
    };

export function buildInputs(s: CalcState, locale: string): BuildResult {
  const bad = new Set<string>();
  const num = (field: string, raw: string, fallback = 0) => {
    const v = parseDecimal(raw, locale);
    if (v === undefined) return fallback;
    if (Number.isNaN(v)) {
      bad.add(field);
      return fallback;
    }
    return v;
  };
  const whole = (field: string, raw: string) => {
    const v = num(field, raw, 1);
    if (!Number.isInteger(v)) bad.add(field);
    return Math.round(v);
  };

  const draft = {
    printMinutes: num("hours", s.hours) * 60 + num("minutes", s.minutes),
    piecesPerJob: whole("piecesPerJob", s.piecesPerJob),
    quantity: whole("quantity", s.quantity),
    filaments: s.filaments.map((f) => ({
      name: f.name,
      spoolPrice: num(`${f.key}.spoolPrice`, f.spoolPrice),
      spoolWeightGrams: num(`${f.key}.spoolWeight`, f.spoolWeight, 1000) || 1000,
      grams: num(`${f.key}.grams`, f.grams),
    })),
    filamentWastePct: num("wastePct", s.wastePct),
    printer: {
      name: s.printerName,
      purchasePrice: num("purchasePrice", s.purchasePrice),
      resaleValue: num("resaleValue", s.resaleValue),
      lifetimeHours: num("lifetimeHours", s.lifetimeHours),
      powerWatts: num("powerWatts", s.powerWatts),
      maintenanceCostPerHour: num("maintenancePerHour", s.maintenancePerHour),
    },
    electricityPricePerKwh: num("electricityPrice", s.electricityPrice),
    extras: s.extras.map((e) => ({
      name: e.name,
      unitPrice: num(`${e.key}.unitPrice`, e.unitPrice),
      quantityPerPiece: num(`${e.key}.quantity`, e.quantity),
    })),
    labor: {
      ratePerHour: num("laborRate", s.laborRate),
      prepMinutesPerJob: num("prepMinutes", s.prepMinutes),
      postProcessMinutesPerPiece: num("postMinutes", s.postMinutes),
    },
    pricing: {
      failureRatePct: num("failurePct", s.failurePct),
      overheadPct: num("overheadPct", s.overheadPct),
      profitMode: s.profitMode,
      profitPct: num("profitPct", s.profitPct),
      taxRatePct: num("taxPct", s.taxPct),
      marketplaceFeePct: num("feePct", s.feePct),
    },
  };

  if (bad.size > 0) return { ok: false, bad, issues: [] };

  const parsed = calculationInputsSchema.safeParse(draft);
  if (!parsed.success) {
    return { ok: false, bad, issues: parsed.error.issues.map((i) => i.path.join(".")) };
  }
  return { ok: true, inputs: parsed.data };
}
