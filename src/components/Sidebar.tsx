import { Home, ShoppingBag, Shirt, Users, User, Bell, Settings, MessageSquare, LogOut, LogIn } from "lucide-react";
import { SidebarNavLink } from "./SidebarNavLink";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "./ui/button";

export const Sidebar = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleAuthAction = () => {
    if (user) {
      signOut();
    } else {
      navigate("/auth");
    }
  };

  return (
    <aside className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 lg:w-64 bg-card border-r border-border z-50">
      {/* Logo */}
      <div className="p-6">
        <h1 className="text-2xl font-bold text-foreground">Huddle</h1>
        <p className="text-xs text-muted-foreground mt-1">Jersey Collection</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-1">
        <SidebarNavLink to="/" icon={Home} label="Home" />
        <SidebarNavLink to="/marketplace" icon={ShoppingBag} label="Marketplace" />
        <SidebarNavLink to="/wardrobe" icon={Shirt} label="Wardrobe" />
        <SidebarNavLink to="/community" icon={Users} label="Community" />
        <SidebarNavLink to="/profile" icon={User} label="Profile" />
        <div className="pt-4 mt-4 border-t border-border">
          <SidebarNavLink to="/messages" icon={MessageSquare} label="Messages" />
          <SidebarNavLink to="/notifications" icon={Bell} label="Notifications" />
          <SidebarNavLink to="/settings" icon={Settings} label="Settings" />
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border space-y-2">
        {user && (
          <div className="text-xs text-muted-foreground mb-2">
            Signed in as <span className="font-medium">{user.email}</span>
          </div>
        )}
        <Button
          variant="outline"
          onClick={handleAuthAction}
          className="w-full justify-start gap-2"
        >
          {user ? (
            <>
              <LogOut className="w-4 h-4" />
              Log Out
            </>
          ) : (
            <>
              <LogIn className="w-4 h-4" />
              Log In
            </>
          )}
        </Button>
        <p className="text-xs text-muted-foreground">© 2024 Huddle</p>
      </div>
    </aside>
  );
};
