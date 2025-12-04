'use client'

import { Settings as SettingsIcon, ChevronRight, User, Bell, Lock, Eye, Globe, HelpCircle } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

const Settings = () => {
  const { signOut } = useClerk();
  const router = useRouter();

  const handleLogout = async () => {
    await signOut();
    router.push("/auth");
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-16 z-30 bg-background/95 backdrop-blur-xl border-b border-border">
        <div className="max-w-3xl mx-auto px-4 lg:px-8 py-4">
          <h1 className="text-2xl font-bold">Settings</h1>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 lg:px-8 py-6 space-y-6">
        {/* Account Section */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3 px-2">ACCOUNT</h2>
          <div className="bg-card rounded-lg border border-border overflow-hidden">
            <button className="w-full p-4 flex items-center justify-between hover:bg-secondary/50 transition-colors">
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-muted-foreground" />
                <span>Edit Profile</span>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
            <div className="border-t border-border" />
            <button className="w-full p-4 flex items-center justify-between hover:bg-secondary/50 transition-colors">
              <div className="flex items-center gap-3">
                <Lock className="w-5 h-5 text-muted-foreground" />
                <span>Change Username</span>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Privacy Section */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3 px-2">PRIVACY</h2>
          <div className="bg-card rounded-lg border border-border overflow-hidden">
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Eye className="w-5 h-5 text-muted-foreground" />
                <div>
                  <div className="font-medium">Default Visibility</div>
                  <div className="text-sm text-muted-foreground">New jerseys are public</div>
                </div>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="border-t border-border" />
            <button className="w-full p-4 flex items-center justify-between hover:bg-secondary/50 transition-colors">
              <div className="flex items-center gap-3">
                <Globe className="w-5 h-5 text-muted-foreground" />
                <span>Who can see my profile</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Everyone</span>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </div>
            </button>
          </div>
        </div>

        {/* Notifications Section */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3 px-2">NOTIFICATIONS</h2>
          <div className="bg-card rounded-lg border border-border overflow-hidden">
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-muted-foreground" />
                <div>
                  <div className="font-medium">Push Notifications</div>
                  <div className="text-sm text-muted-foreground">Get notified about activity</div>
                </div>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="border-t border-border" />
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-5" />
                <div>
                  <div className="font-medium">Auction Updates</div>
                  <div className="text-sm text-muted-foreground">Bids and auction endings</div>
                </div>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="border-t border-border" />
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-5" />
                <div>
                  <div className="font-medium">Social Activity</div>
                  <div className="text-sm text-muted-foreground">Likes, follows, and comments</div>
                </div>
              </div>
              <Switch defaultChecked />
            </div>
          </div>
        </div>

        {/* Support Section */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3 px-2">SUPPORT</h2>
          <div className="bg-card rounded-lg border border-border overflow-hidden">
            <button className="w-full p-4 flex items-center justify-between hover:bg-secondary/50 transition-colors">
              <div className="flex items-center gap-3">
                <HelpCircle className="w-5 h-5 text-muted-foreground" />
                <span>Help & Support</span>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
            <div className="border-t border-border" />
            <button className="w-full p-4 flex items-center justify-between hover:bg-secondary/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-5" />
                <span>Terms of Service</span>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
            <div className="border-t border-border" />
            <button className="w-full p-4 flex items-center justify-between hover:bg-secondary/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-5" />
                <span>Privacy Policy</span>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Logout */}
        <Button
          variant="outline"
          onClick={handleLogout}
          className="w-full justify-start gap-3 text-destructive border-destructive/50 hover:bg-destructive/10"
        >
          <SettingsIcon className="w-5 h-5" />
          Log Out
        </Button>

        {/* Delete Account */}
        <button className="w-full text-sm text-muted-foreground hover:text-destructive transition-colors">
          Delete Account
        </button>

        {/* Version */}
        <div className="text-center text-xs text-muted-foreground pt-4">
          Version 1.0.0
        </div>
      </div>
    </div>
  );
};

export default Settings;

