import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function NotFound() {
  const t = useTranslations("NotFound");

  return (
    <div className="mx-auto max-w-xl px-4 py-24">
      <h1 className="display text-5xl">{t("title")}</h1>
      <Link href="/" className="mt-8 inline-block underline underline-offset-4">
        {t("backHome")}
      </Link>
    </div>
  );
}
