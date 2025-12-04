'use client'

import { Control, Controller } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { JerseyUpdateInput } from "@/lib/validation/jersey-schemas";

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

interface JerseyInfoSectionProps {
  control: Control<JerseyUpdateInput>;
  errors: {
    club?: { message?: string };
    season?: { message?: string };
    jerseyType?: { message?: string };
  };
}

export function JerseyInfoSection({ control, errors }: JerseyInfoSectionProps) {
  return (
    <div className="bg-card rounded-lg border border-border p-6 space-y-4">
      <h2 className="text-lg font-bold mb-4">Jersey Information</h2>
      
      <div>
        <Label htmlFor="club">Club *</Label>
        <Controller
          name="club"
          control={control}
          render={({ field }) => (
            <Input
              id="club"
              placeholder="e.g., Real Madrid, Manchester United"
              {...field}
              className="mt-2"
              maxLength={100}
              aria-required="true"
              aria-invalid={!!errors.club}
            />
          )}
        />
        {errors.club && (
          <p className="text-sm text-destructive mt-1">
            {errors.club.message}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="season">Season *</Label>
        <Controller
          name="season"
          control={control}
          render={({ field }) => (
            <Input
              id="season"
              placeholder="e.g., 2023/24, 2022-23"
              {...field}
              className="mt-2"
              maxLength={20}
              aria-required="true"
              aria-invalid={!!errors.season}
            />
          )}
        />
        {errors.season && (
          <p className="text-sm text-destructive mt-1">
            {errors.season.message}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="jerseyType">Jersey Type *</Label>
        <Controller
          name="jerseyType"
          control={control}
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
        {errors.jerseyType && (
          <p className="text-sm text-destructive mt-1">
            {errors.jerseyType.message}
          </p>
        )}
      </div>
    </div>
  );
}

