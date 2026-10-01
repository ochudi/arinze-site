"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * Internal nav link that knows when it is the current section, so the
 * stylesheet can mark it (aria-current="page"). Matches the section and its
 * children, /writing on /writing/why-i-write, unless told to be exact.
 */
export function NavLink({
  href,
  exact,
  className,
  children,
}: {
  href: string;
  exact?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const current =
    pathname === href || (!exact && pathname.startsWith(`${href}/`));
  return (
    <Link
      href={href}
      className={className}
      aria-current={current ? "page" : undefined}
    >
      {children}
    </Link>
  );
}
