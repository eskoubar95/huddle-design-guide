'use client'

import { Control, Controller, UseFormWatch } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge as BadgeUI } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import type { JerseyUpdateInput } from "@/lib/validation/jersey-schemas";

interface PlayerPrintSectionProps {
  control: Control<JerseyUpdateInput>;
  watch: UseFormWatch<JerseyUpdateInput>;
  onToggleBadge: (badge: string) => void;
  clubId?: string;
  seasonId?: string;
}

export function PlayerPrintSection({ 
  control, 
  watch, 
  onToggleBadge,
  clubId,
  seasonId,
}: PlayerPrintSectionProps) {
  const currentBadges = watch("badges") || [];

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

  return (
    <div className="bg-card rounded-lg border border-border p-6 space-y-4">
      <h2 className="text-lg font-bold mb-4">Player Print (Optional)</h2>

      <div>
        <Label htmlFor="playerName">Player Name</Label>
        <Controller
          name="playerName"
          control={control}
          render={({ field }) => (
            <Input
              id="playerName"
              placeholder="e.g., Messi, Ronaldo"
              {...field}
              className="mt-2"
              maxLength={50}
            />
          )}
        />
      </div>

      <div>
        <Label htmlFor="playerNumber">Player Number</Label>
        <Controller
          name="playerNumber"
          control={control}
          render={({ field }) => (
            <Input
              id="playerNumber"
              placeholder="e.g., 10, 7"
              {...field}
              className="mt-2"
              maxLength={3}
            />
          )}
        />
      </div>

      <div>
        <Label>Competition Badges</Label>
        <p className="text-sm text-muted-foreground mb-3">
          Select all badges that appear on this jersey
        </p>
        {competitionsLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading competitions...
          </div>
        ) : availableCompetitions.length > 0 ? (
          <div className="flex flex-wrap gap-2" role="group" aria-label="Competition badges">
            {availableCompetitions.map((badge) => {
              const isSelected = currentBadges.includes(badge);
              return (
                <BadgeUI
                  key={badge}
                  variant={isSelected ? "default" : "outline"}
                  className="cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary"
                  onClick={() => onToggleBadge(badge)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onToggleBadge(badge);
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
          <p className="text-sm text-muted-foreground">
            {clubId && seasonId ? "No competitions found for this club and season." : "Select a club and season to see available competitions."}
          </p>
        )}
      </div>
    </div>
  );
}

