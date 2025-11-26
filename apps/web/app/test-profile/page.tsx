'use client'

import { useState } from "react";
import { EditProfile } from "@/components/profile/EditProfile";
import { NavLink } from "@/components/profile/NavLink";
import { SidebarNavLink } from "@/components/profile/SidebarNavLink";
import { Button } from "@/components/ui/button";
import { Home, ShoppingBag, Shirt, Users, User, MessageSquare } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function TestProfilePage() {
  const { user } = useAuth();
  const [editProfileOpen, setEditProfileOpen] = useState(false);

  // Mock profile data
  const mockProfile = {
    username: user?.email?.split("@")[0] || "testuser",
    bio: "Jersey collector and football enthusiast",
    country: "Denmark",
    avatar_url: undefined,
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div>
          <h1 className="text-4xl font-bold text-primary mb-4">
            Profile Components Test
          </h1>
          <p className="text-muted-foreground mb-6">
            Test side for validering af migrerede Profile komponenter
          </p>
        </div>

        {/* Component Status */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">Component Status</h2>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span>EditProfile - Imported and rendered</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span>NavLink - Imported and rendered</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span>SidebarNavLink - Imported and rendered</span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">Quick Actions</h2>
          <div className="flex flex-wrap gap-4">
            <Button
              onClick={() => setEditProfileOpen(true)}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              Open Edit Profile Dialog
            </Button>
          </div>
        </div>

        {/* NavLink Examples */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">NavLink Examples</h2>
          <div className="flex flex-wrap gap-4">
            <NavLink
              href="/"
              className="px-4 py-2 rounded-lg border border-border hover:bg-secondary transition-colors"
              activeClassName="bg-primary text-primary-foreground"
            >
              Home
            </NavLink>
            <NavLink
              href="/marketplace"
              className="px-4 py-2 rounded-lg border border-border hover:bg-secondary transition-colors"
              activeClassName="bg-primary text-primary-foreground"
            >
              Marketplace
            </NavLink>
            <NavLink
              href="/wardrobe"
              className="px-4 py-2 rounded-lg border border-border hover:bg-secondary transition-colors"
              activeClassName="bg-primary text-primary-foreground"
            >
              Wardrobe
            </NavLink>
            <NavLink
              href="/community"
              className="px-4 py-2 rounded-lg border border-border hover:bg-secondary transition-colors"
              activeClassName="bg-primary text-primary-foreground"
            >
              Community
            </NavLink>
            <NavLink
              href="/profile"
              className="px-4 py-2 rounded-lg border border-border hover:bg-secondary transition-colors"
              activeClassName="bg-primary text-primary-foreground"
            >
              Profile
            </NavLink>
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            Note: Active state is based on current pathname. Navigate to different pages to see active state change.
          </p>
        </div>

        {/* SidebarNavLink Examples */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">SidebarNavLink Examples</h2>
          <div className="max-w-xs space-y-1">
            <SidebarNavLink href="/" icon={Home} label="Home" />
            <SidebarNavLink href="/marketplace" icon={ShoppingBag} label="Marketplace" />
            <SidebarNavLink href="/wardrobe" icon={Shirt} label="Wardrobe" />
            <SidebarNavLink href="/community" icon={Users} label="Community" />
            <SidebarNavLink href="/profile" icon={User} label="Profile" />
            <SidebarNavLink href="/messages" icon={MessageSquare} label="Messages" badge={5} />
            <SidebarNavLink href="/messages" icon={MessageSquare} label="Messages (99+)" badge={150} />
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            Note: Active state is based on current pathname. Badge shows unread count.
          </p>
        </div>
      </div>

      {/* EditProfile Dialog */}
      <EditProfile
        isOpen={editProfileOpen}
        onClose={() => setEditProfileOpen(false)}
        profile={mockProfile}
        onUpdate={() => {
          console.log("Profile updated successfully!");
        }}
      />
    </div>
  );
}


