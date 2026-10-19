import "server-only";
import { db } from "@/lib/db";
import { getViewer } from "@/lib/auth/viewer";
import { parseInputs, type CalculationInputs } from "@/lib/calculator";
import type { Currency } from "@/lib/library/schemas";

/** Read side of products and saved calculations. Always scoped to the viewer. */

export type ProductDto = {
  id: string;
  name: string;
  description: string | null;
  imageData: string | null;
  calculationCount: number;
};

export type CalculationRowDto = {
  id: string;
  name: string;
  productId: string | null;
  productName: string | null;
  quantity: number;
  currency: Currency;
  /** Per piece. */
  unitCost: number;
  /** Per piece, what the buyer pays. */
  price: number;
  createdAt: string;
};

export type LoadedCalculation = {
  id: string;
  name: string;
  productId: string | null;
  currency: Currency;
  inputs: CalculationInputs;
};

export async function listProducts(): Promise<ProductDto[]> {
  const viewer = await getViewer();
  if (!viewer.user) return [];
  const rows = await db().product.findMany({
    where: { userId: viewer.user.id, archivedAt: null },
    orderBy: { name: "asc" },
    include: { _count: { select: { calculations: true } } },
  });
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    imageData: r.imageData,
    calculationCount: r._count.calculations,
  }));
}

export async function listCalculations(productId?: string): Promise<CalculationRowDto[]> {
  const viewer = await getViewer();
  if (!viewer.user) return [];
  const rows = await db().calculation.findMany({
    where: { userId: viewer.user.id, ...(productId ? { productId } : {}) },
    orderBy: { createdAt: "desc" },
    take: 500,
    include: { product: { select: { name: true } } },
  });
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    productId: r.productId,
    productName: r.product?.name ?? null,
    quantity: r.quantity,
    currency: r.currency,
    unitCost: r.unitCost.toNumber(),
    price: r.suggestedPrice.toNumber(),
    createdAt: r.createdAt.toISOString(),
  }));
}

/** A saved calculation to reopen in the calculator, or null if it isn't the viewer's. */
export async function getCalculation(id: string): Promise<LoadedCalculation | null> {
  const viewer = await getViewer();
  if (!viewer.user || id.length > 64) return null;
  const row = await db().calculation.findFirst({ where: { id, userId: viewer.user.id } });
  if (!row) return null;
  const parsed = parseInputs(row.inputs);
  if (!parsed.success) return null;
  return {
    id: row.id,
    name: row.name,
    productId: row.productId,
    currency: row.currency,
    inputs: parsed.data,
  };
}
