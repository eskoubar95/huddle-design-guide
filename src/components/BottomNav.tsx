import { Home, ShoppingBag, Shirt, Users, User } from "lucide-react";
import { useLocation, Link } from "react-router-dom";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/", icon: Home, label: "Home" },
  { to: "/marketplace", icon: ShoppingBag, label: "Shop" },
  { to: "/wardrobe", icon: Shirt, label: "Wardrobe" },
  { to: "/community", icon: Users, label: "Community" },
  { to: "/profile", icon: User, label: "Profile" },
];

export const BottomNav = () => {
  const location = useLocation();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border">
      <div className="grid grid-cols-5 h-16">
        {navItems.map(({ to, icon: Icon, label }) => {
          const isActive = location.pathname === to;
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                "flex flex-col items-center justify-center gap-1 transition-colors",
                isActive ? "text-foreground" : "text-muted-foreground"
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
