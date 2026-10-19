"use client";

import { Link, usePathname } from "@/i18n/navigation";

/** Tabs that link to sibling pages; the current one is marked for screen readers. */
export function SubNav({
  label,
  items,
}: {
  label: string;
  items: { href: string; label: string }[];
}) {
  const pathname = usePathname();
  return (
    <nav aria-label={label} className="flex gap-1 overflow-x-auto border-b border-line">
      {items.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={
              "-mb-px whitespace-nowrap border-b-2 px-4 py-3 font-medium " +
              (active
                ? "border-accent text-ink"
                : "border-transparent text-ink-soft hover:text-ink")
            }
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
