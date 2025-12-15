'use client'

import { UseFormGetValues } from "react-hook-form";
import { Card, CardContent } from "@/components/ui/card";
import type { ProfileCompletionInput } from "@/lib/validation/profile-schemas";
import { User, MapPin } from "lucide-react";

interface Country {
  iso_2: string;
  display_name: string;
}

interface SummaryStepProps {
  getValues: UseFormGetValues<ProfileCompletionInput>;
  countries: Country[];
}

export function SummaryStep({ getValues, countries }: SummaryStepProps) {
  const values = getValues();

  // Find country display name from database (case-insensitive)
  const countryDisplayName = countries.find(
    (c) => c.iso_2.toLowerCase() === (values.shippingAddress.country || "").toLowerCase()
  )?.display_name || values.shippingAddress.country;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <Card>
        <CardContent className="pt-6">
          {/* 2-column layout on larger screens */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Personal Information */}
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

            {/* Shipping Address */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <h3 className="font-semibold">Shipping Address</h3>
              </div>
              <div className="ml-6 space-y-1">
                <p className="text-sm text-muted-foreground">
                  {values.shippingAddress.street}
                  {values.shippingAddress.addressLine2 && (
                    <span className="text-sm text-muted-foreground">
                      , {values.shippingAddress.addressLine2}
                    </span>
                )}
                </p>
                
                <p className="text-sm text-muted-foreground">
                {values.shippingAddress.postalCode} {values.shippingAddress.city}
                </p>
                <p className="text-sm text-muted-foreground">
                  {countryDisplayName}
                </p>
              </div>
            </div>
          </div>

          {/* Disclaimer */}
          <div className="bg-muted p-4 rounded-lg mt-6">
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
