'use client'

import { Control, Controller, UseFormWatch } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import type { JerseyUpdateInput } from "@/lib/validation/jersey-schemas";

interface ConditionNotesSectionProps {
  control: Control<JerseyUpdateInput>;
  watch: UseFormWatch<JerseyUpdateInput>;
}

export function ConditionNotesSection({ control, watch }: ConditionNotesSectionProps) {
  const conditionRating = watch("conditionRating") || 8;
  const notes = watch("notes") || "";

  return (
    <div className="bg-card rounded-lg border border-border p-6 space-y-6">
      <h2 className="text-lg font-bold mb-4">Condition & Notes</h2>

      <div>
        <div className="flex items-center justify-between mb-3">
          <Label htmlFor="conditionRating">Condition Rating</Label>
          <span className="text-2xl font-bold text-primary" aria-live="polite">
            {conditionRating}/10
          </span>
        </div>
        <Controller
          name="conditionRating"
          control={control}
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

      <div>
        <Label htmlFor="notes">Notes</Label>
        <Controller
          name="notes"
          control={control}
          render={({ field }) => (
            <>
              <Textarea
                id="notes"
                placeholder="Any additional details about the jersey (defects, authenticity, history, etc.)"
                {...field}
                rows={4}
                className="mt-2"
                maxLength={1000}
                aria-describedby="notes-count"
              />
              <p className="text-xs text-muted-foreground mt-1" id="notes-count">
                {notes.length}/1000 characters
              </p>
            </>
          )}
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <div>
            <Label htmlFor="visibility">Visibility</Label>
            <p className="text-sm text-muted-foreground mt-1" id="visibility-description">
              {watch("visibility") === "public"
                ? "Everyone can see this jersey"
                : "Only you can see this jersey"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Private</span>
            <Controller
              name="visibility"
              control={control}
              render={({ field }) => (
                <Switch
                  id="visibility"
                  checked={field.value === "public"}
                  onCheckedChange={(checked) =>
                    field.onChange(checked ? "public" : "private")
                  }
                  aria-describedby="visibility-description"
                />
              )}
            />
            <span className="text-sm font-medium">Public</span>
          </div>
        </div>
      </div>
    </div>
  );
}

