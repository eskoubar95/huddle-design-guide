import { Link, useLocation } from "react-router-dom";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarNavLinkProps {
  to: string;
  icon: LucideIcon;
  label: string;
  badge?: number;
}

export const SidebarNavLink = ({ to, icon: Icon, label, badge }: SidebarNavLinkProps) => {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Link
      to={to}
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-lg transition-smooth text-sm font-medium",
        isActive
          ? "bg-secondary text-foreground border-l-2 border-primary"
          : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
      )}
    >
      <Icon className="w-5 h-5" />
      <span>{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="ml-auto min-w-5 h-5 px-1.5 rounded-full bg-primary flex items-center justify-center">
          <span className="text-xs text-primary-foreground font-bold">
            {badge > 99 ? "99+" : badge}
          </span>
        </span>
      )}
    </Link>
  );
};
