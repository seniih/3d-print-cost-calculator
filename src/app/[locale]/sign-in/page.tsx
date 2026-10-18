import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getEnv } from "@/lib/env";
import { SignInButtons } from "@/components/sign-in-buttons";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("SignIn");
  return { title: t("title") };
}

export default async function SignInPage() {
  const t = await getTranslations("SignIn");

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="display text-4xl">{t("title")}</h1>
      <Suspense fallback={<div className="mt-8 h-28 rounded-lg bg-surface-sunk" />}>
        <SignInOptions />
      </Suspense>
      <Link href="/" className="mt-10 inline-block text-sm text-ink-soft underline underline-offset-4">
        {t("backHome")}
      </Link>
    </div>
  );
}

/** Which providers exist depends on runtime env, not on the build. */
async function SignInOptions() {
  await connection();
  const [t, env] = [await getTranslations("SignIn"), getEnv()];

  if (env.mode === "local") {
    return <p className="mt-6 leading-relaxed text-ink-soft">{t("localMode")}</p>;
  }

  return (
    <>
      <p className="mt-4 leading-relaxed text-ink-soft">{t("lead")}</p>
      <SignInButtons
        providers={env.providers}
        labels={{ google: t("google"), github: t("github") }}
      />
      <p className="mt-6 text-sm text-ink-soft">{t("guestNote")}</p>
    </>
  );
}
