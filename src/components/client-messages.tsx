import type { ReactNode } from "react";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";

type Namespace = keyof Awaited<ReturnType<typeof getMessages>>;

/** Hands the listed message namespaces to the Client Components below it. */
export async function ClientMessages({
  namespaces,
  children,
}: {
  namespaces: Namespace[];
  children: ReactNode;
}) {
  const all = await getMessages();
  const messages = Object.fromEntries(namespaces.map((ns) => [ns, all[ns]]));
  return <NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>;
}
