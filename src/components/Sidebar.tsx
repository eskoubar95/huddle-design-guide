import { Home, ShoppingBag, Shirt, Users, User } from "lucide-react";
import { SidebarNavLink } from "./SidebarNavLink";

export const Sidebar = () => {
  return (
    <aside className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 lg:w-64 bg-card border-r border-border z-50">
      {/* Logo */}
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gradient-primary">Huddle</h1>
        <p className="text-xs text-muted-foreground mt-1">Jersey Collection</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-1">
        <SidebarNavLink to="/" icon={Home} label="Home" />
        <SidebarNavLink to="/marketplace" icon={ShoppingBag} label="Marketplace" />
        <SidebarNavLink to="/wardrobe" icon={Shirt} label="Wardrobe" />
        <SidebarNavLink to="/community" icon={Users} label="Community" />
        <SidebarNavLink to="/profile" icon={User} label="Profile" />
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <p className="text-xs text-muted-foreground">© 2024 Huddle</p>
      </div>
    </aside>
  );
};
