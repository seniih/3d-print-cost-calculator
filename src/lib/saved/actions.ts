"use server";

import { refresh } from "next/cache";
import { db } from "@/lib/db";
import { currentOwnerId, ownerForWrite } from "@/lib/auth/owner";
import { calculate, parseInputs, INPUTS_VERSION } from "@/lib/calculator";
import { fieldErrors, formToObject, type FormState } from "@/lib/forms";
import { productSchema, saveCalculationSchema, type SaveCalculationInput } from "@/lib/saved/schemas";

/** Write side of products and saved calculations; same rules as the library. */

export type SaveCalculationResult =
  | { ok: true; id: string; productId: string | null }
  | { ok: false; error: "invalid" | "notFound" };

export async function saveCalculation(input: SaveCalculationInput): Promise<SaveCalculationResult> {
  const meta = saveCalculationSchema.safeParse(input);
  if (!meta.success) return { ok: false, error: "invalid" };
  const inputs = parseInputs(meta.data.inputs);
  if (!inputs.success) return { ok: false, error: "invalid" };

  // Never trust numbers from the client: the result is computed here.
  const result = calculate(inputs.data);
  const { id, name, currency } = meta.data;

  const userId = id ? await currentOwnerId() : await ownerForWrite();
  if (!userId) return { ok: false, error: "notFound" };

  let productId: string | null = null;
  if (meta.data.productId === "new") {
    const product = await db().product.create({ data: { userId, name } });
    productId = product.id;
  } else if (meta.data.productId) {
    const product = await db().product.findFirst({
      where: { id: meta.data.productId, userId, archivedAt: null },
      select: { id: true },
    });
    if (!product) return { ok: false, error: "notFound" };
    productId = product.id;
  }

  const data = {
    name,
    productId,
    currency,
    quantity: result.order.quantity,
    inputs: JSON.parse(JSON.stringify(inputs.data)),
    inputsVersion: INPUTS_VERSION,
    result: JSON.parse(JSON.stringify(result)),
    unitCost: result.perPiece.cost,
    totalCost: result.order.cost,
    suggestedPrice: result.perPiece.price,
  };

  if (id) {
    const { count } = await db().calculation.updateMany({ where: { id, userId }, data });
    if (count === 0) return { ok: false, error: "notFound" };
    refresh();
    return { ok: true, id, productId };
  }
  const created = await db().calculation.create({ data: { ...data, userId } });
  refresh();
  return { ok: true, id: created.id, productId };
}

export async function deleteCalculation(formData: FormData) {
  const id = formData.get("id");
  const userId = await currentOwnerId();
  if (!userId || typeof id !== "string" || id.length > 64) return;
  await db().calculation.deleteMany({ where: { id, userId } });
  refresh();
}

// --- Products ----------------------------------------------------------------

const notFound: FormState = { status: "error", fieldErrors: {}, formError: "notFound" };

export async function saveProduct(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = productSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrors(parsed.error) };

  const rawId = formData.get("id");
  const id = typeof rawId === "string" && rawId && rawId.length <= 64 ? rawId : null;
  if (id) {
    const userId = await currentOwnerId();
    if (!userId) return notFound;
    const { count } = await db().product.updateMany({
      where: { id, userId, archivedAt: null },
      data: parsed.data,
    });
    if (count === 0) return notFound;
  } else {
    const userId = await ownerForWrite();
    await db().product.create({ data: { ...parsed.data, userId } });
  }
  refresh();
  return { status: "success", savedAt: Date.now() };
}

export async function archiveProduct(formData: FormData) {
  const id = formData.get("id");
  const userId = await currentOwnerId();
  if (!userId || typeof id !== "string" || id.length > 64) return;
  await db().product.updateMany({
    where: { id, userId, archivedAt: null },
    data: { archivedAt: new Date() },
  });
  refresh();
}
