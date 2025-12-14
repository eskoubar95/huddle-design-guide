'use client'

import { useFormContext, Controller } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Badge as BadgeUI } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { Loader2, CheckCircle2, Shirt, User } from "lucide-react";
import { motion } from "framer-motion";

interface ConditionNotesStepProps {
  clubId?: string;
  seasonId?: string;
  isAI?: boolean;
}

export const ConditionNotesStep = ({ clubId, seasonId, isAI }: ConditionNotesStepProps) => {
  const form = useFormContext();
  const clubName = form.watch("club");
  const seasonName = form.watch("season");
  const jerseyType = form.watch("jerseyType");
  const playerName = form.watch("playerName");
  const playerNumber = form.watch("playerNumber");

  // Fetch club details for summary (crest)
  const { data: clubData } = useQuery({
    queryKey: ['club-summary', clubId],
    queryFn: async () => {
      if (!clubId) return null;
      const res = await fetch(`/api/v1/metadata/clubs?id=${encodeURIComponent(clubId)}`);
      if (!res.ok) return null;
      const data = await res.json();
      return data.clubs?.[0];
    },
    enabled: !!clubId,
    staleTime: 300000,
  });

  // Fetch competitions for club and season
  const { data: competitionsData, isLoading: competitionsLoading } = useQuery<{ competitions: Array<{ id: string; name: string }> }>({
    queryKey: ['metadata-competitions', clubId, seasonId],
    queryFn: async () => {
      if (!clubId || !seasonId) return { competitions: [] };
      const response = await fetch(`/api/v1/metadata/competitions?clubId=${encodeURIComponent(clubId)}&seasonId=${encodeURIComponent(seasonId)}`);
      if (!response.ok) {
        return { competitions: [] };
      }
      return response.json();
    },
    enabled: !!clubId && !!seasonId,
    staleTime: 300000, // Cache for 5 minutes
  });

  const availableCompetitions = competitionsData?.competitions?.map(c => c.name) || [];
  
  // Handle single badge selection (only one badge can be selected)
  const handleBadgeToggle = (badge: string) => {
    const currentBadges = form.getValues("badges") || [];
    if (currentBadges.includes(badge)) {
      // If clicking the selected badge, deselect it
      form.setValue("badges", []);
    } else {
      // Select only this badge (replace any existing selection)
      form.setValue("badges", [badge]);
    }
  };

  const selectedBadge = (form.watch("badges") || [])[0]; // Get first (and only) badge

  return (
    <div className="space-y-6">
      {/* AI Summary Section */}
      {isAI && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-primary/10 via-background to-background border border-primary/20 rounded-xl p-5 mb-6 shadow-sm"
        >
          <div className="flex items-center gap-2 mb-4">
            <div className="bg-primary/20 p-1.5 rounded-full">
              <CheckCircle2 className="w-4 h-4 text-primary" />
            </div>
            <h3 className="font-semibold text-sm text-foreground">AI Analysis Result</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Club & Season */}
            <div className="flex items-start gap-3 bg-background/50 p-3 rounded-lg border border-border/50">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shrink-0 border border-border overflow-hidden p-1">
                {clubData?.crest_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={clubData.crest_url} alt={clubName} className="w-full h-full object-contain" />
                ) : (
                  <Shirt className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Club & Season</p>
                <p className="text-sm font-medium leading-tight">{clubName || "Unknown"}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{seasonName || "Unknown"} • {jerseyType}</p>
              </div>
            </div>

            {/* Player Info */}
            {(playerName || playerNumber) && (
              <div className="flex items-start gap-3 bg-background/50 p-3 rounded-lg border border-border/50">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0 border border-border">
                  <User className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Player</p>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium leading-tight">{playerName || "Unknown"}</p>
                    {playerNumber && (
                      <BadgeUI variant="outline" className="text-[10px] h-5 px-1.5 font-mono">
                        #{playerNumber}
                      </BadgeUI>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}

      <div>
        <div className="space-y-6">
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label htmlFor="conditionRating">Condition Rating</Label>
              <span className="text-2xl font-bold text-primary" aria-live="polite">
                {form.watch("conditionRating") || 8}/10
              </span>
            </div>
            <Controller
              name="conditionRating"
              control={form.control}
              render={({ field }) => (
                <Slider
                  id="conditionRating"
                  value={[field.value || 8]}
                  onValueChange={(value) => field.onChange(value[0])}
                  min={1}
                  max={10}
                  step={1}
                  className="mt-2"
                  aria-label="Condition rating"
                />
              )}
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-2">
              <span>Poor</span>
              <span>Good</span>
              <span>Excellent</span>
            </div>
          </div>

          {/* 2-column layout: Notes (left) and Badge (right) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Any additional details about the jersey (defects, authenticity, history, etc.)"
                {...form.register("notes")}
                rows={4}
                className="mt-2"
                maxLength={1000}
                aria-describedby="notes-count"
              />
              <p className="text-xs text-muted-foreground mt-1" id="notes-count">
                {(form.watch("notes") || "").length}/1000 characters
              </p>
            </div>

            <div>
              <Label>Badge</Label>
              {competitionsLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading competitions...
                </div>
              ) : availableCompetitions.length > 0 ? (
                <div className="flex flex-wrap gap-2 mt-2" role="group" aria-label="Competition badge">
                  {availableCompetitions.map((badge) => {
                    const isSelected = selectedBadge === badge;
                    return (
                      <BadgeUI
                        key={badge}
                        variant={isSelected ? "default" : "outline"}
                        className="cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary"
                        onClick={() => handleBadgeToggle(badge)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            handleBadgeToggle(badge);
                          }
                        }}
                        aria-pressed={isSelected}
                      >
                        {badge}
                      </BadgeUI>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground mt-2">
                  {clubId && seasonId ? "No competitions found for this club and season." : "Select a club and season to see available competitions."}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

