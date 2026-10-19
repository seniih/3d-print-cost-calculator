import { z } from "zod";
import { nameField, optionalText } from "@/lib/forms";
import { CURRENCIES } from "@/lib/library/schemas";

/** Thumbnails are resized in the browser; this is the ceiling the server accepts. */
export const MAX_IMAGE_CHARS = 200_000;

export const productSchema = z.object({
  name: nameField,
  description: optionalText(500),
  imageData: z
    .string()
    .max(MAX_IMAGE_CHARS, "tooLong")
    .refine((v) => v === "" || /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(v), "invalid")
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .default(null),
});

/** What the calculator sends to be saved. The server recomputes the result itself. */
export const saveCalculationSchema = z.object({
  /** Set to overwrite an existing saved calculation. */
  id: z.string().max(64).nullable(),
  name: nameField,
  /** null: no product; "new": create one named like the calculation; else a product id. */
  productId: z.string().max(64).nullable(),
  currency: z.enum(CURRENCIES),
  inputs: z.unknown(),
});
export type SaveCalculationInput = z.input<typeof saveCalculationSchema>;
