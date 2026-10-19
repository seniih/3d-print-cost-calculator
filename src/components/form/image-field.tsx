"use client";

import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { Field } from "@/components/form/fields";

const MAX_SIDE = 480;

/**
 * Picks a photo and shrinks it in the browser to a small JPEG (480 px, about
 * 30 KB), posted as a data URL. Keeps self-hosting simple: no file storage.
 */
export function ImageField({
  name,
  label,
  defaultValue,
  error,
}: {
  name: string;
  label: string;
  defaultValue?: string | null;
  error?: string;
}) {
  const t = useTranslations("Products.image");
  const id = useId();
  const [value, setValue] = useState(defaultValue ?? "");
  const [failed, setFailed] = useState(false);

  async function pick(file: File | undefined) {
    if (!file) return;
    setFailed(false);
    try {
      const bitmap = await createImageBitmap(file);
      const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("no canvas");
      ctx.fillStyle = "#fff"; // JPEG has no transparency
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      setValue(canvas.toDataURL("image/jpeg", 0.8));
    } catch {
      setFailed(true);
    }
  }

  return (
    <Field id={id} label={label} optional error={error} hint={failed ? undefined : t("hint")}>
      <div className="flex items-center gap-4">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element -- a small data URL, nothing to optimize
          <img src={value} alt="" className="size-20 rounded-md border border-line object-cover" />
        ) : (
          <div className="size-20 rounded-md border border-dashed border-line" aria-hidden="true" />
        )}
        <div className="flex flex-col items-start gap-2 text-sm">
          <input
            id={id}
            type="file"
            accept="image/*"
            onChange={(e) => void pick(e.target.files?.[0])}
            className="max-w-full text-sm"
          />
          {value && (
            <button
              type="button"
              onClick={() => setValue("")}
              className="text-ink-soft underline underline-offset-4"
            >
              {t("remove")}
            </button>
          )}
          {failed && (
            <p role="alert" className="text-[var(--layer-6)]">
              {t("failed")}
            </p>
          )}
        </div>
        <input type="hidden" name={name} value={value} />
      </div>
    </Field>
  );
}
