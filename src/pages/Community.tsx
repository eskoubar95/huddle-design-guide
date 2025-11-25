import { BottomNav } from "@/components/BottomNav";
import { Users } from "lucide-react";

const Community = () => {
  return (
    <div className="min-h-screen pb-20 lg:pb-8">
      <header className="pt-8 pb-6 px-4 lg:px-8 border-b border-border">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold">Community</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Connect with jersey collectors
          </p>
        </div>
      </header>

      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center px-4">
          <div className="w-24 h-24 rounded-full bg-secondary/50 flex items-center justify-center mx-auto mb-4">
            <Users className="w-12 h-12 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-bold mb-2">Coming Soon</h2>
          <p className="text-muted-foreground max-w-sm">
            Share your collection, follow other collectors, and join the conversation
          </p>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Community;
