import { useNavigate } from "react-router-dom";
import { Upload, Store, Gavel, MapPin, Sparkles } from "lucide-react";

export const QuickActions = () => {
  const navigate = useNavigate();

  const actions = [
    {
      icon: Upload,
      title: "Upload Jersey",
      description: "Add to wardrobe",
      gradient: "from-primary/20 to-primary-glow/20",
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
      onClick: () => navigate("/wardrobe"),
    },
    {
      icon: Store,
      title: "List For Sale",
      description: "Start earning",
      gradient: "from-accent/20 to-accent-glow/20",
      iconBg: "bg-accent/10",
      iconColor: "text-accent",
      onClick: () => navigate("/wardrobe"),
    },
    {
      icon: Gavel,
      title: "Start Auction",
      description: "Maximize value",
      gradient: "from-success/20 to-success/10",
      iconBg: "bg-success/10",
      iconColor: "text-success",
      onClick: () => navigate("/wardrobe"),
    },
    {
      icon: MapPin,
      title: "Find Nearby",
      description: "Local collection",
      gradient: "from-foreground/10 to-transparent",
      iconBg: "bg-secondary",
      iconColor: "text-foreground",
      onClick: () => navigate("/marketplace"),
    },
  ];

  return (
    <div className="space-y-4 animate-fade-in" style={{ animationDelay: "100ms" }}>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-1 h-8 bg-gradient-accent rounded-full" />
        <h2 className="text-2xl font-bold">Quick Actions</h2>
        <Sparkles className="w-5 h-5 text-accent animate-pulse" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {actions.map((action) => (
          <button
            key={action.title}
            onClick={action.onClick}
            className="group relative overflow-hidden p-6 rounded-2xl bg-card border border-border hover:border-primary/30 transition-all hover:shadow-card hover:-translate-y-1"
          >
            {/* Animated gradient background */}
            <div className={`absolute inset-0 bg-gradient-to-br ${action.gradient} opacity-0 group-hover:opacity-100 transition-opacity`} />
            
            <div className="relative space-y-4">
              <div className={`w-14 h-14 rounded-2xl ${action.iconBg} flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all`}>
                <action.icon className={`w-7 h-7 ${action.iconColor}`} />
              </div>

              <div className="space-y-1 text-left">
                <div className="text-lg font-bold">{action.title}</div>
                <div className="text-sm text-muted-foreground">{action.description}</div>
              </div>

              {/* Hover arrow */}
              <div className="absolute bottom-4 right-4 w-6 h-6 rounded-full bg-primary/0 group-hover:bg-primary/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                <span className="text-primary text-sm">→</span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};