'use client'

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarNavLinkProps {
  href: string;
  icon: LucideIcon;
  label: string;
  badge?: number;
}

export const SidebarNavLink = ({ href, icon: Icon, label, badge }: SidebarNavLinkProps) => {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-lg transition-smooth text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
        isActive
          ? "bg-secondary text-foreground border-l-2 border-primary"
          : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
      )}
      aria-current={isActive ? "page" : undefined}
      aria-label={badge !== undefined && badge > 0 ? `${label} (${badge} unread)` : label}
    >
      <Icon className="w-5 h-5" aria-hidden="true" />
      <span>{label}</span>
      {badge !== undefined && badge > 0 && (
        <span
          className="ml-auto min-w-5 h-5 px-1.5 rounded-full bg-primary flex items-center justify-center"
          aria-label={`${badge} unread`}
        >
          <span className="text-xs text-primary-foreground font-bold">
            {badge > 99 ? "99+" : badge}
          </span>
        </span>
      )}
    </Link>
  );
};


