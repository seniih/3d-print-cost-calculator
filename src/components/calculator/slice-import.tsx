"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useId, useRef, useState } from "react";
import { splitDuration, type SliceInfo } from "@/lib/slicer/parse";
import { readSliceFile, type ReadError } from "@/lib/slicer/read-file";

type Status =
  | { kind: "idle" }
  | { kind: "reading" }
  | { kind: "done"; info: SliceInfo }
  | { kind: "error"; error: ReadError };

/**
 * Picks (or takes a dropped) G-code / 3MF file and hands what it says about
 * print time and filament weight to the calculator. The file is read in the
 * browser; nothing is uploaded.
 */
export function SliceImport({ onRead }: { onRead: (info: SliceInfo) => void }) {
  const t = useTranslations("Calculator.import");
  const format = useFormatter();
  const inputId = useId();
  const input = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [dragging, setDragging] = useState(false);

  async function handle(file: File | undefined) {
    if (!file) return;
    setStatus({ kind: "reading" });
    const result = await readSliceFile(file);
    if (result.ok) {
      onRead(result.info);
      setStatus({ kind: "done", info: result.info });
    } else {
      setStatus({ kind: "error", error: result.error });
    }
    // Lets the same file be picked again after fixing something.
    if (input.current) input.current.value = "";
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        void handle(e.dataTransfer.files[0]);
      }}
      className={
        "rounded-lg border border-dashed p-4 " +
        (dragging ? "border-accent bg-accent-soft" : "border-line bg-surface-sunk/40")
      }
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <label
          htmlFor={inputId}
          className="cursor-pointer rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-ink hover:opacity-90 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--focus)]"
        >
          {t("button")}
          <input
            ref={input}
            id={inputId}
            type="file"
            accept=".gcode,.gco,.gc,.g,.nc,.3mf,.bgcode"
            className="sr-only"
            onChange={(e) => void handle(e.target.files?.[0])}
          />
        </label>
        <p className="text-sm text-ink-soft">{t("hint")}</p>
      </div>

      <div aria-live="polite" className="mt-3 text-sm empty:hidden">
        {status.kind === "reading" && <p className="text-ink-soft">{t("reading")}</p>}
        {status.kind === "error" && (
          <p role="alert" className="text-[var(--layer-6)]">
            {t(`errors.${status.error}`)}
          </p>
        )}
        {status.kind === "done" && <Summary info={status.info} format={format} />}
      </div>
    </div>
  );
}

function Summary({
  info,
  format,
}: {
  info: SliceInfo;
  format: ReturnType<typeof useFormatter>;
}) {
  const t = useTranslations("Calculator.import");
  const grams = info.filaments.reduce((a, f) => a + f.grams, 0);
  const estimated = info.filaments.some((f) => f.estimated);
  const time = info.printSeconds === null ? null : splitDuration(info.printSeconds);
  const timeText = time
    ? t("time", { hours: time.hours, minutes: time.minutes })
    : null;

  return (
    <div className="flex flex-col gap-1">
      <p className="font-medium">
        {t("done", {
          slicer: info.slicer ?? "—",
          grams: info.filaments.length ? format.number(grams, { maximumFractionDigits: 1 }) : "—",
          time: timeText ?? "—",
        })}
      </p>
      {info.filaments.length > 1 && (
        <p className="text-ink-soft">{t("multi", { count: info.filaments.length })}</p>
      )}
      {estimated && <p className="text-ink-soft">{t("estimated")}</p>}
      {info.printSeconds === null && <p className="text-ink-soft">{t("noTime")}</p>}
      {info.filaments.length === 0 && <p className="text-ink-soft">{t("noWeight")}</p>}
    </div>
  );
}
