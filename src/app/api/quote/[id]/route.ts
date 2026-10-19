import { z } from "zod";
import { db } from "@/lib/db";
import { currentOwnerId } from "@/lib/auth/owner";
import { parseInputs } from "@/lib/calculator";
import { routing } from "@/i18n/routing";
import { buildQuotePdf } from "@/lib/quote/pdf";
import { quoteLabels } from "@/lib/quote/labels";
import { loadQuoteFonts } from "@/lib/quote/fonts";

const query = z.object({
  lang: z.enum(routing.locales).default(routing.defaultLocale),
  business: z.string().trim().max(120).default(""),
  customer: z.string().trim().max(120).default(""),
  title: z.string().trim().max(120).default(""),
  price: z.coerce.number().finite().min(0).max(1e9),
  quantity: z.coerce.number().int().min(1).max(1_000_000),
  days: z.coerce.number().int().min(0).max(365).default(14),
  notes: z.string().max(500).default(""),
});

/** The customer-facing quote for one of the signed-in owner's saved calculations. */
export async function GET(request: Request, ctx: RouteContext<"/api/quote/[id]">) {
  const { id } = await ctx.params;
  const userId = await currentOwnerId();
  if (!userId || id.length > 64) return new Response("Not found", { status: 404 });

  const row = await db().calculation.findFirst({ where: { id, userId } });
  const inputs = row ? parseInputs(row.inputs) : null;
  if (!row || !inputs?.success) return new Response("Not found", { status: 404 });

  const params = query.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!params.success) return new Response("Bad request", { status: 400 });
  const q = params.data;

  const labels = quoteLabels(q.lang);

  const issuedAt = new Date();
  const stamp = issuedAt.toISOString().slice(0, 10).replaceAll("-", "");
  const number = `Q-${stamp}-${row.id.slice(-4).toUpperCase()}`;

  const pdf = await buildQuotePdf(
    {
      locale: q.lang,
      currency: row.currency,
      labels,
      number,
      issuedAt,
      validUntil: q.days > 0 ? new Date(issuedAt.getTime() + q.days * 86_400_000) : null,
      businessName: q.business,
      customerName: q.customer,
      itemName: q.title || row.name,
      quantity: q.quantity,
      unitPrice: q.price,
      taxRatePct: inputs.data.pricing.taxRatePct,
      notes: q.notes,
    },
    await loadQuoteFonts(),
  );

  return new Response(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${number}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
