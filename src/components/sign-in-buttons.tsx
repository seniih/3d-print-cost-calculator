"use client";

import { useLocale } from "next-intl";
import { useState } from "react";
import { authClient } from "@/lib/auth/client";

type Provider = "google" | "github";

export function SignInButtons({
  providers,
  labels,
}: {
  providers: Record<Provider, boolean>;
  labels: Record<Provider, string>;
}) {
  const locale = useLocale();
  const [pending, setPending] = useState<Provider | null>(null);

  const signIn = async (provider: Provider) => {
    setPending(provider);
    // If the visitor is a guest with saved work, Better Auth links the
    // accounts and the anonymous plugin moves their data over.
    await authClient.signIn.social({ provider, callbackURL: `/${locale}` });
  };

  return (
    <div className="mt-8 flex flex-col gap-3">
      {(["google", "github"] as const)
        .filter((p) => providers[p])
        .map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => signIn(p)}
            disabled={pending !== null}
            className="h-12 rounded-md border border-line bg-surface px-4 font-medium hover:bg-surface-sunk disabled:opacity-60"
          >
            {labels[p]}
          </button>
        ))}
    </div>
  );
}
