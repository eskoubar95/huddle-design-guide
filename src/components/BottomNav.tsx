import { Home, ShoppingBag, ShirtIcon, Users, User } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/", icon: Home, label: "Home" },
  { to: "/marketplace", icon: ShoppingBag, label: "Market" },
  { to: "/wardrobe", icon: ShirtIcon, label: "Wardrobe" },
  { to: "/community", icon: Users, label: "Community" },
  { to: "/profile", icon: User, label: "Profile" },
];

export const BottomNav = () => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-xl border-t border-border">
      <div className="flex items-center justify-around h-16 max-w-md mx-auto px-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={cn(
              "flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-lg transition-smooth",
              "text-muted-foreground hover:text-foreground"
            )}
            activeClassName="text-primary"
          >
            {({ isActive }) => (
              <>
                <item.icon
                  className={cn(
                    "w-5 h-5 transition-smooth",
                    isActive && "drop-shadow-[0_0_8px_hsl(var(--primary))]"
                  )}
                />
                <span className="text-xs font-medium">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
};
