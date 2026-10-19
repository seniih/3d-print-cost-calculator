import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";

export default async function LibraryPage() {
  redirect({ href: "/library/printers", locale: await getLocale() });
}
