import { Suspense } from "react";
import { locale } from "next/root-params";
import { getSettings, listPrinters } from "@/lib/library/data";
import { PrinterList } from "@/components/library/printer-list";
import { LoadingList } from "../loading-list";

export default function PrintersPage() {
  return (
    <Suspense fallback={<LoadingList />}>
      <Printers />
    </Suspense>
  );
}

async function Printers() {
  const [printers, settings] = await Promise.all([listPrinters(), getSettings(await locale())]);
  return <PrinterList printers={printers} currency={settings.currency} />;
}
