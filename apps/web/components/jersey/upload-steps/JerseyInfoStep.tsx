'use client'

import { useState, useEffect as ReactUseEffect } from "react";
import * as React from "react";
import { useFormContext } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Controller } from "react-hook-form";
import { MetadataCombobox } from "@/components/jersey/MetadataCombobox";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Edit2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

const JERSEY_TYPES = [
  "Home",
  "Away",
  "Third",
  "Fourth",
  "Special Edition",
  "GK Home",
  "GK Away",
  "GK Third",
];

interface Season {
  id: string;
  label: string;
  start_year: number;
  end_year: number;
}

interface JerseyInfoStepProps {
  clubId?: string;
  seasonId?: string;
  onClubIdChange: (clubId: string | undefined) => void;
  onSeasonIdChange: (seasonId: string | undefined) => void;
}

export const JerseyInfoStep = ({ clubId, seasonId, onClubIdChange, onSeasonIdChange }: JerseyInfoStepProps) => {
  const form = useFormContext();
  const [showManualClub, setShowManualClub] = useState(false);
  const [showManualSeason, setShowManualSeason] = useState(false);

  // Fetch seasons for dropdown
  const { data: seasonsData, isLoading: seasonsLoading } = useQuery<{ seasons: Season[] }>({
    queryKey: ['seasons'],
    queryFn: async () => {
      const response = await fetch('/api/v1/metadata/seasons');
      if (!response.ok) throw new Error('Failed to fetch seasons');
      return response.json();
    },
    staleTime: 300000, // Cache for 5 minutes
  });

  // Note: selectedSeason is computed but not currently used - kept for potential future use
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _selectedSeason = seasonsData?.seasons?.find((s) => s.id === seasonId);

  // Fetch selected club name when clubId changes
  const { data: selectedClubData } = useQuery<{ clubs: Array<{ id: string; name: string }> }>({
    queryKey: ['club-by-id', clubId],
    queryFn: async () => {
      if (!clubId) return { clubs: [] };
      const response = await fetch(`/api/v1/metadata/clubs?id=${encodeURIComponent(clubId)}`);
      if (!response.ok) return { clubs: [] };
      return response.json();
    },
    enabled: !!clubId,
    staleTime: 300000, // Cache for 5 minutes
  });

  const selectedClub = React.useMemo(() => {
    return selectedClubData?.clubs?.[0];
  }, [selectedClubData?.clubs]);

  // Update club text field when clubId changes
  const handleClubChange = (newClubId: string | undefined) => {
    onClubIdChange(newClubId);
    // If club is selected from metadata, hide manual input
    if (newClubId) {
      setShowManualClub(false);
    }
  };

  // Auto-fill club text field when club data is loaded
  // Use a ref to track the last club ID we've set to prevent infinite loops
  const lastSetClubIdRef = React.useRef<string | undefined>(undefined);
  
  ReactUseEffect(() => {
    if (selectedClub && clubId && !showManualClub && lastSetClubIdRef.current !== clubId) {
      const currentClubValue = form.getValues("club");
      // Only update if the field is empty or doesn't match the selected club name
      if (!currentClubValue || currentClubValue !== selectedClub.name) {
        form.setValue("club", selectedClub.name, { shouldValidate: false });
        lastSetClubIdRef.current = clubId;
      }
    }
    // Reset ref when clubId is cleared
    if (!clubId) {
      lastSetClubIdRef.current = undefined;
    }
  }, [selectedClub?.id, selectedClub?.name, clubId, showManualClub]);

  // Update season text field when seasonId changes
  const handleSeasonChange = (newSeasonId: string) => {
    onSeasonIdChange(newSeasonId);
    const season = seasonsData?.seasons?.find((s) => s.id === newSeasonId);
    if (season) {
      // Auto-fill season text field with label
      form.setValue("season", season.label);
      setShowManualSeason(false);
    }
  };

  // Handle manual club input
  const handleManualClubToggle = () => {
    setShowManualClub(true);
    // Clear clubId when switching to manual
    onClubIdChange(undefined);
    form.setValue("club", "");
  };

  // Handle manual season input
  const handleManualSeasonToggle = () => {
    setShowManualSeason(true);
    // Clear seasonId when switching to manual
    onSeasonIdChange(undefined);
    form.setValue("season", "");
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="space-y-4">
          <div>
            <Label htmlFor="club">Club *</Label>
            <div className="mt-2 space-y-2">
              {!showManualClub ? (
                <>
                  <MetadataCombobox
                    type="club"
                    value={clubId}
                    onValueChange={handleClubChange}
                    placeholder="Search for club..."
                  />
                  {!clubId && (
                    
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleManualClubToggle}
                      className="justify-start"
                    >
                      <Edit2 className="w-4 h-4 mr-2" />
                      Enter manually
                    </Button>
                  )}
                </>
              ) : (
                <div className="space-y-2">
                  <Input
                    id="club"
                    placeholder="e.g., Real Madrid, Manchester United"
                    {...form.register("club")}
                    maxLength={100}
                    aria-required="true"
                    aria-invalid={!!form.formState.errors.club}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowManualClub(false);
                      // Keep the typed value in form
                    }}
                    className="justify-start"
                  >
                    <Search className="w-4 h-4 mr-2" />
                    Use club search
                  </Button>
                </div>
              )}
            </div>
            {form.formState.errors.club && (
              <p className="text-sm text-destructive mt-1">
                {String(form.formState.errors.club.message || 'Please enter a valid club')}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="season">Season *</Label>
            <div className="mt-2 space-y-2">
              {!showManualSeason ? (
                <>
                  <Select
                    value={seasonId || ""}
                    onValueChange={handleSeasonChange}
                    disabled={seasonsLoading}
                  >
                    <SelectTrigger id="seasonId" aria-required="true">
                      <SelectValue placeholder={seasonsLoading ? "Loading seasons..." : "Select season"} />
                    </SelectTrigger>
                    <SelectContent>
                      {seasonsLoading && (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        </div>
                      )}
                      {!seasonsLoading && seasonsData?.seasons?.map((season) => (
                        <SelectItem key={season.id} value={season.id}>
                          {season.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!seasonId && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleManualSeasonToggle}
                      className="justify-start"
                    >
                      <Edit2 className="w-4 h-4 mr-2" />
                      Enter manually
                    </Button>
                  )}
                </>
              ) : (
                <div className="space-y-2">
                  <Input
                    id="season"
                    placeholder="e.g., 2023/24, 2022-23"
                    {...form.register("season")}
                    maxLength={20}
                    aria-required="true"
                    aria-invalid={!!form.formState.errors.season}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowManualSeason(false);
                      // Keep the typed value in form
                    }}
                    className="justify-start"
                  >
                    <Search className="w-4 h-4 mr-2" />
                    Use season dropdown instead
                  </Button>
                </div>
              )}
            </div>
            {form.formState.errors.season && (
              <p className="text-sm text-destructive mt-1">
                {String(form.formState.errors.season.message || 'Please enter a valid season')}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="jerseyType">Jersey Type *</Label>
            <Controller
              name="jerseyType"
              control={form.control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="mt-2" id="jerseyType" aria-required="true">
                    <SelectValue placeholder="Select jersey type" />
                  </SelectTrigger>
                  <SelectContent>
                    {JERSEY_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {form.formState.errors.jerseyType && (
              <p className="text-sm text-destructive mt-1">
                {String(form.formState.errors.jerseyType.message || 'Please select a jersey type')}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

