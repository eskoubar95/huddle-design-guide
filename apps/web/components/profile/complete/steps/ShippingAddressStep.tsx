'use client'

import { useState, useEffect } from "react";
import { UseFormRegister, FieldErrors, Control, Controller, UseFormWatch } from "react-hook-form";
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
import type { ProfileCompletionInput } from "@/lib/validation/profile-schemas";

interface ShippingAddressStepProps {
  register: UseFormRegister<ProfileCompletionInput>;
  control: Control<ProfileCompletionInput>;
  watch: UseFormWatch<ProfileCompletionInput>;
  errors: FieldErrors<ProfileCompletionInput>;
}

interface Country {
  iso_2: string;
  display_name: string;
}

export function ShippingAddressStep({
  register,
  control,
  watch,
  errors,
}: ShippingAddressStepProps) {
  const [countries, setCountries] = useState<Country[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const selectedCountry = watch("shippingAddress.country");

  useEffect(() => {
    const fetchCountries = async () => {
      try {
        setIsLoading(true);
        const response = await fetch("/api/v1/countries");
        if (!response.ok) {
          throw new Error("Failed to fetch countries");
        }
        const data = await response.json();
        setCountries(data.countries || []);
      } catch (error) {
        console.error("Error fetching countries:", error);
        // Fallback to empty array on error
        setCountries([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCountries();
  }, []);

  const selectedCountryName = countries.find(
    (c) => c.iso_2 === selectedCountry
  )?.display_name || "Select country";

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
                      disabled={isLoading}
                    >
                      {isLoading
                        ? "Loading countries..."
                        : selectedCountryName}
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
