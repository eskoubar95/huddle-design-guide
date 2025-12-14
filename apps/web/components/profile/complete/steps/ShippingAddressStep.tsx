'use client'

import { UseFormRegister, FieldErrors, Control, Controller, UseFormWatch } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ProfileCompletionInput } from "@/lib/validation/profile-schemas";

interface ShippingAddressStepProps {
  register: UseFormRegister<ProfileCompletionInput>;
  control: Control<ProfileCompletionInput>;
  watch: UseFormWatch<ProfileCompletionInput>;
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
  watch,
  errors,
}: ShippingAddressStepProps) {
  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="street">
              Street Address <span className="text-destructive">*</span>
            </Label>
            <Input
              id="street"
              {...register("shippingAddress.street")}
              placeholder="123 Main St, Apt 4B"
              autoComplete="shipping street-address"
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
                autoComplete="shipping address-level2"
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
                autoComplete="shipping postal-code"
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

          {/* State/Province (conditional - shown for US, CA, AU) */}
          {["US", "CA", "AU"].includes(watch("shippingAddress.country") || "") && (
            <div className="space-y-2">
              <Label htmlFor="state">
                State/Province/Region <span className="text-destructive">*</span>
              </Label>
              <Input
                id="state"
                {...register("shippingAddress.state")}
                placeholder="Enter state, province, or region"
                autoComplete="shipping address-level1"
              />
              {errors.shippingAddress?.state && (
                <p className="text-sm text-destructive">
                  {errors.shippingAddress.state.message}
                </p>
              )}
            </div>
          )}

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
        </div>
      </div>
    </div>
  );
}
