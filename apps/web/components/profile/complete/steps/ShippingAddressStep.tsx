'use client'

import { useState, useEffect } from "react";
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
  const cityValue = watch("shippingAddress.city");
  const postalCodeValue = watch("shippingAddress.postalCode");

  // Case-insensitive country lookup (Google returns "PT", database may have "pt" or "PT")
  const selectedCountryName = countries.find(
    (c) => c.iso_2.toLowerCase() === (selectedCountry || "").toLowerCase()
  )?.display_name || "Select country";

  // Check if address fields are already filled (user came back to this step or data was auto-filled)
  // Only show manual fields if multiple fields are filled (indicating a complete address selection)
  // Not just streetValue, which gets updated as user types
  const hasCompleteAddress = !!(streetValue && cityValue && postalCodeValue);
  
  // Show manual fields if address is complete OR if user explicitly chose manual entry
  const [showManualFields, setShowManualFields] = useState<boolean>(hasCompleteAddress);
  
  // Update showManualFields when address becomes complete (e.g., from Google API selection)
  useEffect(() => {
    if (hasCompleteAddress && !showManualFields) {
      setShowManualFields(true);
    }
  }, [hasCompleteAddress, showManualFields]);

  const shouldShowFields = showManualFields;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="space-y-6">
        <div className="space-y-4">
          {/* Address Autocomplete - only shown initially or when no address selected */}
          {!shouldShowFields && (
            <Controller
              name="shippingAddress.street"
              control={control}
              render={({ field }) => (
                <AddressAutocomplete
                  value={field.value || ""}
                  onChange={(address) => {
                    // Update all address fields when user selects an address
                    setValue("shippingAddress.street", address.street);
                    if (address.addressLine2) {
                      setValue("shippingAddress.addressLine2", address.addressLine2);
                    } else {
                      // Clear addressLine2 if not provided
                      setValue("shippingAddress.addressLine2", "");
                    }
                    setValue("shippingAddress.city", address.city);
                    setValue("shippingAddress.postalCode", address.postalCode);
                    if (address.state) {
                      setValue("shippingAddress.state", address.state);
                    }
                    // Set country from Google API result (always set if available)
                    // Country should be ISO-2 code (e.g., "PT" for Portugal)
                    // Match with database iso_2 (case-insensitive)
                    if (address.country) {
                      const countryCode = address.country.trim().toLowerCase();
                      // Find matching country in our database
                      const matchingCountry = countries.find(
                        (c) => c.iso_2.toLowerCase() === countryCode
                      );
                      if (matchingCountry) {
                        setValue("shippingAddress.country", matchingCountry.iso_2);
                        if (process.env.NODE_ENV === 'development') {
                          console.log('Setting country to:', matchingCountry.iso_2, matchingCountry.display_name);
                        }
                      } else {
                        // Fallback: use the code from Google if not found in database
                        console.warn("Country not found in database:", address.country);
                        setValue("shippingAddress.country", countryCode);
                      }
                    } else {
                      console.warn("No country found in address components");
                    }
                    field.onChange(address.street);
                    setShowManualFields(true); // Show all fields after selection
                  }}
                  onInputChange={() => {
                    // Don't update form field while typing - only update when address is selected
                    // This prevents showing manual fields prematurely
                  }}
                  onManualEntry={() => {
                    setShowManualFields(true); // Show manual fields when "Couldn't Find" is clicked
                  }}
                  label="Type Address"
                  placeholder="Start typing your address..."
                  country={selectedCountry}
                  error={errors.shippingAddress?.street?.message}
                />
              )}
            />
          )}

          {/* Manual address fields - shown after selection or "Couldn't Find" */}
          {shouldShowFields && (
            <>
              {/* Address Line 1 */}
              <div className="space-y-2">
                <Label htmlFor="street">
                  Address Line 1 <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="street"
                  {...register("shippingAddress.street")}
                  placeholder="Street address, P.O. box, company name"
                  autoComplete="shipping address-line1"
                  aria-invalid={errors.shippingAddress?.street ? "true" : "false"}
                />
                {errors.shippingAddress?.street && (
                  <p className="text-sm text-destructive">
                    {errors.shippingAddress.street.message}
                  </p>
                )}
              </div>

              {/* Address Line 2 (optional) */}
              <div className="space-y-2">
                <Label htmlFor="addressLine2">
                  Address Line 2 <span className="text-muted-foreground text-xs">(optional)</span>
                </Label>
                <Input
                  id="addressLine2"
                  {...register("shippingAddress.addressLine2")}
                  placeholder="Apartment, suite, unit, building, floor, etc."
                  autoComplete="shipping address-line2"
                  aria-invalid={errors.shippingAddress?.addressLine2 ? "true" : "false"}
                />
                {errors.shippingAddress?.addressLine2 && (
                  <p className="text-sm text-destructive">
                    {errors.shippingAddress.addressLine2.message}
                  </p>
                )}
              </div>
            </>
          )}

          {/* City, Postal Code, State, Country - only shown after address selection */}
          {shouldShowFields && (
            <>
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
                                      country.iso_2.toLowerCase() === (field.value || "").toLowerCase()
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
