'use client'

import { UseFormRegister, FieldErrors, Control, Controller } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/ui/phone-input";
import type { ProfileCompletionInput } from "@/lib/validation/profile-schemas";
import { detectUserCountry } from "@/lib/utils/detect-country";
import { useState, useEffect } from "react";

import type { Country } from "react-phone-number-input";

interface PersonalInfoStepProps {
  register: UseFormRegister<ProfileCompletionInput>;
  control: Control<ProfileCompletionInput>;
  errors: FieldErrors<ProfileCompletionInput>;
}

export function PersonalInfoStep({ register, control, errors }: PersonalInfoStepProps) {
  const [defaultCountry, setDefaultCountry] = useState<Country>("DK");

  useEffect(() => {
    const detected = detectUserCountry();
    setDefaultCountry(detected);
  }, []);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="space-y-6">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">
                First Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="firstName"
                {...register("firstName")}
                placeholder="John"
                aria-invalid={errors.firstName ? "true" : "false"}
              />
              {errors.firstName && (
                <p className="text-sm text-destructive">
                  {errors.firstName.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName">
                Last Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="lastName"
                {...register("lastName")}
                placeholder="Doe"
                aria-invalid={errors.lastName ? "true" : "false"}
              />
              {errors.lastName && (
                <p className="text-sm text-destructive">
                  {errors.lastName.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">
              Phone Number <span className="text-destructive">*</span>
            </Label>
            <Controller
              name="phone"
              control={control}
              render={({ field }) => (
                <PhoneInput
                  {...field}
                  defaultCountry={defaultCountry}
                  placeholder="Enter phone number"
                  international
                />
              )}
            />
            {errors.phone && (
              <p className="text-sm text-destructive">{errors.phone.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              We&apos;ll use this for order updates and support
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
