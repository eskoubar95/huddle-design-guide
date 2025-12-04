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
        "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 group relative overflow-hidden",
        isActive
          ? "bg-white/5 text-white shadow-sm" 
          : "text-muted-foreground hover:text-white hover:bg-white/5"
      )}
      aria-current={isActive ? "page" : undefined}
      aria-label={badge !== undefined && badge > 0 ? `${label} (${badge} unread)` : label}
    >
      {isActive && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full shadow-[0_0_10px_hsl(90_100%_50%_/_0.5)]"></span>
      )}
      <Icon className={cn("w-5 h-5 transition-colors", isActive ? "text-primary" : "group-hover:text-white")} aria-hidden="true" />
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

