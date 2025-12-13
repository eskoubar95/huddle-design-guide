'use client'

import { UseFormRegister, FieldErrors } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ProfileCompletionInput } from "@/lib/validation/profile-schemas";
import { Controller, Control } from "react-hook-form";

interface ShippingAddressStepProps {
  register: UseFormRegister<ProfileCompletionInput>;
  control: Control<ProfileCompletionInput>;
  errors: FieldErrors<ProfileCompletionInput>;
}

const COUNTRIES = [
  { code: "US", name: "United States" },
  { code: "GB", name: "United Kingdom" },
  { code: "CA", name: "Canada" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "ES", name: "Spain" },
  { code: "IT", name: "Italy" },
  { code: "NL", name: "Netherlands" },
  { code: "DK", name: "Denmark" },
  { code: "SE", name: "Sweden" },
  { code: "NO", name: "Norway" },
  { code: "AU", name: "Australia" },
  { code: "JP", name: "Japan" },
  { code: "BR", name: "Brazil" },
];

export function ShippingAddressStep({
  register,
  control,
  errors,
}: ShippingAddressStepProps) {
  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <Card>
        <CardHeader>
          <CardTitle>Shipping Address</CardTitle>
          <CardDescription>
            Add your default shipping address for deliveries
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">
              Full Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="fullName"
              {...register("shippingAddress.fullName")}
              placeholder="John Doe"
              aria-invalid={errors.shippingAddress?.fullName ? "true" : "false"}
            />
            {errors.shippingAddress?.fullName && (
              <p className="text-sm text-destructive">
                {errors.shippingAddress.fullName.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="street">
              Street Address <span className="text-destructive">*</span>
            </Label>
            <Input
              id="street"
              {...register("shippingAddress.street")}
              placeholder="123 Main St, Apt 4B"
              aria-invalid={
                errors.shippingAddress?.street ? "true" : "false"
              }
            />
            {errors.shippingAddress?.street && (
              <p className="text-sm text-destructive">
                {errors.shippingAddress.street.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">
                City <span className="text-destructive">*</span>
              </Label>
              <Input
                id="city"
                {...register("shippingAddress.city")}
                placeholder="New York"
                aria-invalid={errors.shippingAddress?.city ? "true" : "false"}
              />
              {errors.shippingAddress?.city && (
                <p className="text-sm text-destructive">
                  {errors.shippingAddress.city.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="postalCode">
                Postal Code <span className="text-destructive">*</span>
              </Label>
              <Input
                id="postalCode"
                {...register("shippingAddress.postalCode")}
                placeholder="10001"
                aria-invalid={
                  errors.shippingAddress?.postalCode ? "true" : "false"
                }
              />
              {errors.shippingAddress?.postalCode && (
                <p className="text-sm text-destructive">
                  {errors.shippingAddress.postalCode.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="country">
              Country <span className="text-destructive">*</span>
            </Label>
            <Controller
              name="shippingAddress.country"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger
                    id="country"
                    aria-invalid={
                      errors.shippingAddress?.country ? "true" : "false"
                    }
                  >
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map((country) => (
                      <SelectItem key={country.code} value={country.code}>
                        {country.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.shippingAddress?.country && (
              <p className="text-sm text-destructive">
                {errors.shippingAddress.country.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">
              Phone Number <span className="text-destructive">*</span>
            </Label>
            <Input
              id="phone"
              type="tel"
              {...register("shippingAddress.phone")}
              placeholder="+1 (555) 123-4567"
              aria-invalid={
                errors.shippingAddress?.phone ? "true" : "false"
              }
            />
            {errors.shippingAddress?.phone && (
              <p className="text-sm text-destructive">
                {errors.shippingAddress.phone.message}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              For delivery coordination and updates
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
