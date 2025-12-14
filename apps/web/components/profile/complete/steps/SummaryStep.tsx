'use client'

import { UseFormGetValues } from "react-hook-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { ProfileCompletionInput } from "@/lib/validation/profile-schemas";
import { User, MapPin } from "lucide-react";

interface SummaryStepProps {
  getValues: UseFormGetValues<ProfileCompletionInput>;
}

const COUNTRIES: Record<string, string> = {
  US: "United States",
  GB: "United Kingdom",
  CA: "Canada",
  DE: "Germany",
  FR: "France",
  ES: "Spain",
  IT: "Italy",
  NL: "Netherlands",
  DK: "Denmark",
  SE: "Sweden",
  NO: "Norway",
  AU: "Australia",
  JP: "Japan",
  BR: "Brazil",
};

export function SummaryStep({ getValues }: SummaryStepProps) {
  const values = getValues();

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <Card>
        <CardHeader>
          <CardTitle>Review Your Information</CardTitle>
          <CardDescription>
            Please verify all details are correct before submitting
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <User className="w-4 h-4 text-muted-foreground" />
              <h3 className="font-semibold">Personal Information</h3>
            </div>
            <div className="space-y-2 ml-6">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Name:</span>
                <span className="font-medium">
                  {values.firstName} {values.lastName}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Phone:</span>
                <span className="font-medium">{values.phone}</span>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <h3 className="font-semibold">Shipping Address</h3>
            </div>
            <div className="ml-6 space-y-1">
              <p className="text-sm font-medium">
                {values.shippingAddress.fullName}
              </p>
              <p className="text-sm text-muted-foreground">
                {values.shippingAddress.street}
              </p>
              <p className="text-sm text-muted-foreground">
                {values.shippingAddress.city} {values.shippingAddress.postalCode}
              </p>
              <p className="text-sm text-muted-foreground">
                {COUNTRIES[values.shippingAddress.country] ||
                  values.shippingAddress.country}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Phone: {values.shippingAddress.phone}
              </p>
            </div>
          </div>

          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm text-muted-foreground">
              By completing your profile, you agree to provide accurate
              information for marketplace transactions. You can update these
              details anytime in your profile settings.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
