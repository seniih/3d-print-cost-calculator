import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getViewer } from "@/lib/auth/viewer";
import { SignOutButton } from "@/components/sign-out-button";

export async function AccountStatus() {
  const [viewer, t] = await Promise.all([getViewer(), getTranslations("Header")]);

  switch (viewer.kind) {
    case "local":
      return (
        <span
          title={t("localModeHint")}
          className="rounded-md bg-accent-soft px-2 py-1 text-sm font-medium text-ink"
        >
          {t("localMode")}
        </span>
      );
    case "user":
      return (
        <div className="flex items-center gap-3 text-sm">
          <span className="max-w-40 truncate font-medium">{viewer.user.name}</span>
          <SignOutButton label={t("signOut")} />
        </div>
      );
    case "guest":
    case "anonymous":
      return (
        <div className="flex items-center gap-3 text-sm">
          {viewer.kind === "guest" && (
            <span title={t("guestHint")} className="text-ink-soft">
              {t("guest")}
            </span>
          )}
          <Link
            href="/sign-in"
            className="rounded-md bg-ink px-3 py-1.5 font-medium text-bg hover:opacity-90"
          >
            {t("signIn")}
          </Link>
        </div>
      );
  }
}
