'use client'

import Link from "next/link";
import { usePathname } from "next/navigation";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface NavLinkProps {
  href: string;
  className?: string;
  activeClassName?: string;
  children: React.ReactNode;
}

export const NavLink = forwardRef<HTMLAnchorElement, NavLinkProps>(
  ({ href, className, activeClassName, children }, ref) => {
    const pathname = usePathname();
    const isActive = pathname === href;

    // Use type assertion to avoid React 19 vs Next.js Link type conflicts
    const linkChildren = children as Parameters<typeof Link>[0]['children'];

    return (
      <Link
        ref={ref}
        href={href}
        className={cn(className, isActive && activeClassName)}
        aria-current={isActive ? "page" : undefined}
      >
        {linkChildren}
      </Link>
    );
  }
);

NavLink.displayName = "NavLink";
