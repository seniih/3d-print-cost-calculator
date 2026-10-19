"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";

const items = [
  { href: "/calculator", key: "calculator" },
  { href: "/library", key: "library" },
  { href: "/settings", key: "settings" },
] as const;

export function MainNav() {
  const t = useTranslations("Nav");
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1 text-sm">
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={
              "rounded-md px-3 py-1.5 font-medium " +
              (active ? "bg-surface-sunk text-ink" : "text-ink-soft hover:text-ink")
            }
          >
            {t(item.key)}
          </Link>
        );
      })}
    </nav>
  );
}
