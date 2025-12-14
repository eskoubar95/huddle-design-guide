'use client'

import { useState } from "react";
import { UseFormRegister, FieldErrors, Control, Controller, UseFormWatch, type UseFormSetValue } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { AddressAutocomplete, type AddressComponents } from "@/components/ui/address-autocomplete";
import type { ProfileCompletionInput } from "@/lib/validation/profile-schemas";

interface Country {
  iso_2: string;
  display_name: string;
}

interface ShippingAddressStepProps {
  register: UseFormRegister<ProfileCompletionInput>;
  control: Control<ProfileCompletionInput>;
  watch: UseFormWatch<ProfileCompletionInput>;
  errors: FieldErrors<ProfileCompletionInput>;
  countries: Country[];
  setValue: UseFormSetValue<ProfileCompletionInput>;
}

export function ShippingAddressStep({
  register,
  control,
  watch,
  errors,
  countries,
  setValue,
}: ShippingAddressStepProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedCountry = watch("shippingAddress.country");
  const streetValue = watch("shippingAddress.street");

  const selectedCountryName = countries.find(
    (c) => c.iso_2 === selectedCountry
  )?.display_name || "Select country";

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="space-y-6">
        <div className="space-y-4">
          {/* Address Autocomplete - auto-fills all address fields */}
          <Controller
            name="shippingAddress.street"
            control={control}
            render={({ field }) => (
              <AddressAutocomplete
                value={field.value || ""}
                onChange={(address) => {
                  // Update all address fields when user selects an address
                  setValue("shippingAddress.street", address.street);
                  setValue("shippingAddress.city", address.city);
                  setValue("shippingAddress.postalCode", address.postalCode);
                  if (address.state) {
                    setValue("shippingAddress.state", address.state);
                  }
                  setValue("shippingAddress.country", address.country);
                  field.onChange(address.street);
                }}
                onInputChange={(value) => {
                  field.onChange(value);
                }}
                label="Street Address"
                placeholder="Start typing your address..."
                country={selectedCountry}
                error={errors.shippingAddress?.street?.message}
              />
            )}
          />

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
          {["US", "CA", "AU"].includes(selectedCountry || "") && (
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
                <Popover open={isOpen} onOpenChange={setIsOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={isOpen}
                      className="w-full justify-between"
                    >
                      {selectedCountryName}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search country..." />
                      <CommandList>
                        <CommandEmpty>No country found.</CommandEmpty>
                        <CommandGroup>
                          {countries.map((country) => (
                            <CommandItem
                              key={country.iso_2}
                              value={country.display_name}
                              onSelect={() => {
                                field.onChange(country.iso_2);
                                setIsOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  country.iso_2 === field.value
                                    ? "opacity-100"
                                    : "opacity-0"
                                )}
                              />
                              {country.display_name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
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
