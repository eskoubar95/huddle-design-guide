import { BottomNav } from "@/components/BottomNav";
import { Settings, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const Profile = () => {
  return (
    <div className="min-h-screen pb-20">
      {/* Header with gradient */}
      <div className="relative h-32 bg-gradient-card">
        <div
          className="absolute inset-0 opacity-40"
          style={{ background: "var(--gradient-glow)" }}
        />
      </div>

      {/* Profile Content */}
      <div className="max-w-md mx-auto px-4">
        {/* Avatar & Info */}
        <div className="relative -mt-16 mb-6">
          <div className="w-32 h-32 rounded-full bg-secondary border-4 border-background flex items-center justify-center text-4xl font-bold text-primary mb-4">
            JC
          </div>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold mb-1">Jersey Collector</h1>
              <p className="text-sm text-muted-foreground mb-2">@jerseycollector</p>
              <p className="text-sm text-foreground/80 mb-3">
                Passionate football jersey collector 🎽⚽
              </p>
              <div className="flex gap-4 text-sm">
                <div>
                  <span className="font-bold text-foreground">24</span>
                  <span className="text-muted-foreground ml-1">Jerseys</span>
                </div>
                <div>
                  <span className="font-bold text-foreground">156</span>
                  <span className="text-muted-foreground ml-1">Followers</span>
                </div>
                <div>
                  <span className="font-bold text-foreground">89</span>
                  <span className="text-muted-foreground ml-1">Following</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 mt-4">
            <Button className="flex-1 bg-primary hover:bg-primary/90 shadow-glow">
              Edit Profile
            </Button>
            <Button variant="outline" size="icon" className="border-border hover:border-primary">
              <Share2 className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" className="border-border hover:border-primary">
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="p-4 rounded-xl bg-card border border-border">
            <p className="text-2xl font-bold text-primary mb-1">12</p>
            <p className="text-sm text-muted-foreground">For Sale</p>
          </div>
          <div className="p-4 rounded-xl bg-card border border-border">
            <p className="text-2xl font-bold text-accent mb-1">3</p>
            <p className="text-sm text-muted-foreground">Active Auctions</p>
          </div>
        </div>

        {/* Collection Preview */}
        <div>
          <h2 className="text-lg font-bold mb-3">Collection Preview</h2>
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="aspect-[3/4] rounded-lg bg-secondary border border-border"
              />
            ))}
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Profile;
