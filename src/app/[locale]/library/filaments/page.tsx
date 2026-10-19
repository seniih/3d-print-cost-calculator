import { Suspense } from "react";
import { locale } from "next/root-params";
import { getSettings, listFilaments } from "@/lib/library/data";
import { FilamentList } from "@/components/library/filament-list";
import { LoadingList } from "../loading-list";

export default function FilamentsPage() {
  return (
    <Suspense fallback={<LoadingList />}>
      <Filaments />
    </Suspense>
  );
}

async function Filaments() {
  const [filaments, settings] = await Promise.all([listFilaments(), getSettings(await locale())]);
  return <FilamentList filaments={filaments} currency={settings.currency} />;
}
