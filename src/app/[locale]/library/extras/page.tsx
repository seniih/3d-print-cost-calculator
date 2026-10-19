import { Suspense } from "react";
import { locale } from "next/root-params";
import { getSettings, listExtraItems } from "@/lib/library/data";
import { ExtraList } from "@/components/library/extra-list";
import { LoadingList } from "../loading-list";

export default function ExtrasPage() {
  return (
    <Suspense fallback={<LoadingList />}>
      <Extras />
    </Suspense>
  );
}

async function Extras() {
  const [extras, settings] = await Promise.all([listExtraItems(), getSettings(await locale())]);
  return <ExtraList extras={extras} currency={settings.currency} />;
}
