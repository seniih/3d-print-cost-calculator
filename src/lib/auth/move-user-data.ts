import "server-only";
import { db } from "@/lib/db";

/**
 * Moves everything a guest saved to the account they just signed in with.
 * Runs before Better Auth deletes the anonymous user, so nothing is lost.
 */
export async function moveUserData(fromUserId: string, toUserId: string) {
  if (fromUserId === toUserId) return;

  await db().$transaction(async (tx) => {
    const where = { userId: fromUserId };
    const data = { userId: toUserId };

    // An account has one default printer and one default filament: the
    // account's own win over what the guest had marked.
    if ((await tx.printer.count({ where: { userId: toUserId, isDefault: true } })) > 0) {
      await tx.printer.updateMany({ where, data: { isDefault: false } });
    }
    if ((await tx.filament.count({ where: { userId: toUserId, isDefault: true } })) > 0) {
      await tx.filament.updateMany({ where, data: { isDefault: false } });
    }

    await tx.printer.updateMany({ where, data });
    await tx.filament.updateMany({ where, data });
    await tx.extraItem.updateMany({ where, data });
    await tx.product.updateMany({ where, data });
    await tx.calculation.updateMany({ where, data });

    // Keep the account's own settings if it already has them; otherwise adopt
    // the ones the guest configured.
    const target = await tx.userSettings.findUnique({ where: { userId: toUserId } });
    if (target) {
      await tx.userSettings.deleteMany({ where });
    } else {
      await tx.userSettings.updateMany({ where, data });
    }
  });
}
