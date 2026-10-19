"use server";

import { refresh } from "next/cache";
import type { z } from "zod";
import { db } from "@/lib/db";
import { currentOwnerId, ownerForWrite } from "@/lib/auth/owner";
import { fieldErrors, formToObject, type FormState } from "@/lib/forms";
import {
  extraItemSchema,
  filamentSchema,
  printerSchema,
  settingsSchema,
} from "@/lib/library/schemas";

/**
 * Write side of the library. Every action re-resolves the owner on the server
 * and scopes each query by `userId`, so a forged id in the form can only ever
 * miss — never touch another user's row.
 */

function parse<S extends z.ZodType>(schema: S, formData: FormData) {
  return schema.safeParse(formToObject(formData));
}

const ok = (): FormState => ({ status: "success", savedAt: Date.now() });
const invalid = (error: z.ZodError): FormState => ({
  status: "error",
  fieldErrors: fieldErrors(error),
});
const notFound: FormState = { status: "error", fieldErrors: {}, formError: "notFound" };

function idFrom(formData: FormData): string | null {
  const id = formData.get("id");
  return typeof id === "string" && id.length > 0 && id.length <= 64 ? id : null;
}

// --- Settings ----------------------------------------------------------------

export async function saveSettings(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = parse(settingsSchema, formData);
  if (!parsed.success) return invalid(parsed.error);

  const userId = await ownerForWrite();
  await db().userSettings.upsert({
    where: { userId },
    create: { userId, ...parsed.data },
    update: parsed.data,
  });
  refresh();
  return ok();
}

// --- Printers ----------------------------------------------------------------

export async function savePrinter(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = parse(printerSchema, formData);
  if (!parsed.success) return invalid(parsed.error);

  const id = idFrom(formData);
  if (id) {
    const userId = await currentOwnerId();
    if (!userId) return notFound;
    const { count } = await db().printer.updateMany({
      where: { id, userId, archivedAt: null },
      data: parsed.data,
    });
    if (count === 0) return notFound;
  } else {
    const userId = await ownerForWrite();
    // The first printer becomes the default one.
    const existing = await db().printer.count({ where: { userId, archivedAt: null } });
    await db().printer.create({ data: { ...parsed.data, userId, isDefault: existing === 0 } });
  }
  refresh();
  return ok();
}

export async function archivePrinter(formData: FormData) {
  await archive("printer", formData);
}

export async function setDefaultPrinter(formData: FormData) {
  await setDefault("printer", formData);
}

// --- Filaments ---------------------------------------------------------------

export async function saveFilament(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = parse(filamentSchema, formData);
  if (!parsed.success) return invalid(parsed.error);

  const id = idFrom(formData);
  if (id) {
    const userId = await currentOwnerId();
    if (!userId) return notFound;
    const { count } = await db().filament.updateMany({
      where: { id, userId, archivedAt: null },
      data: parsed.data,
    });
    if (count === 0) return notFound;
  } else {
    const userId = await ownerForWrite();
    const existing = await db().filament.count({ where: { userId, archivedAt: null } });
    await db().filament.create({ data: { ...parsed.data, userId, isDefault: existing === 0 } });
  }
  refresh();
  return ok();
}

export async function archiveFilament(formData: FormData) {
  await archive("filament", formData);
}

export async function setDefaultFilament(formData: FormData) {
  await setDefault("filament", formData);
}

// --- Extra items -------------------------------------------------------------

export async function saveExtraItem(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = parse(extraItemSchema, formData);
  if (!parsed.success) return invalid(parsed.error);

  const id = idFrom(formData);
  if (id) {
    const userId = await currentOwnerId();
    if (!userId) return notFound;
    const { count } = await db().extraItem.updateMany({
      where: { id, userId, archivedAt: null },
      data: parsed.data,
    });
    if (count === 0) return notFound;
  } else {
    const userId = await ownerForWrite();
    await db().extraItem.create({ data: { ...parsed.data, userId } });
  }
  refresh();
  return ok();
}

export async function archiveExtraItem(formData: FormData) {
  await archive("extraItem", formData);
}

// --- Shared ------------------------------------------------------------------

/**
 * Items are archived rather than deleted: saved calculations keep a snapshot
 * of what they used, and archiving keeps the door open for an "undo".
 */
async function archive(model: "printer" | "filament" | "extraItem", formData: FormData) {
  const id = idFrom(formData);
  const userId = await currentOwnerId();
  if (!id || !userId) return;

  const where = { id, userId, archivedAt: null };
  const data = { archivedAt: new Date() };
  if (model === "printer") {
    const row = await db().printer.findFirst({ where, select: { isDefault: true } });
    await db().printer.updateMany({ where, data: { ...data, isDefault: false } });
    if (row?.isDefault) await promoteNextDefault("printer", userId);
  } else if (model === "filament") {
    const row = await db().filament.findFirst({ where, select: { isDefault: true } });
    await db().filament.updateMany({ where, data: { ...data, isDefault: false } });
    if (row?.isDefault) await promoteNextDefault("filament", userId);
  } else {
    await db().extraItem.updateMany({ where, data });
  }
  refresh();
}

async function setDefault(model: "printer" | "filament", formData: FormData) {
  const id = idFrom(formData);
  const userId = await currentOwnerId();
  if (!id || !userId) return;

  const target = { id, userId, archivedAt: null };
  const current = { userId, isDefault: true };
  await db().$transaction(async (tx) => {
    if (model === "printer") {
      if (!(await tx.printer.findFirst({ where: target }))) return;
      await tx.printer.updateMany({ where: current, data: { isDefault: false } });
      await tx.printer.updateMany({ where: target, data: { isDefault: true } });
    } else {
      if (!(await tx.filament.findFirst({ where: target }))) return;
      await tx.filament.updateMany({ where: current, data: { isDefault: false } });
      await tx.filament.updateMany({ where: target, data: { isDefault: true } });
    }
  });
  refresh();
}

async function promoteNextDefault(model: "printer" | "filament", userId: string) {
  const where = { userId, archivedAt: null };
  const next =
    model === "printer"
      ? await db().printer.findFirst({ where, orderBy: { createdAt: "asc" } })
      : await db().filament.findFirst({ where, orderBy: { createdAt: "asc" } });
  if (!next) return;
  if (model === "printer") {
    await db().printer.update({ where: { id: next.id }, data: { isDefault: true } });
  } else {
    await db().filament.update({ where: { id: next.id }, data: { isDefault: true } });
  }
}
