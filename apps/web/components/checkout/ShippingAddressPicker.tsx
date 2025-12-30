"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useShippingAddresses, type ShippingAddress } from "@/lib/hooks/use-shipping-addresses";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AddressAutocomplete, type AddressComponents } from "@/components/ui/address-autocomplete";
import {
  MapPin,
  Check,
  Plus,
  Pencil,
  ChevronDown,
  Home,
  Building,
} from "lucide-react";
import { cn } from "@/lib/utils";

// EU countries for shipping
const EU_COUNTRIES = [
  { code: "AT", name: "Austria" },
  { code: "BE", name: "Belgium" },
  { code: "BG", name: "Bulgaria" },
  { code: "HR", name: "Croatia" },
  { code: "CY", name: "Cyprus" },
  { code: "CZ", name: "Czechia" },
  { code: "DK", name: "Denmark" },
  { code: "EE", name: "Estonia" },
  { code: "FI", name: "Finland" },
  { code: "FR", name: "France" },
  { code: "DE", name: "Germany" },
  { code: "GR", name: "Greece" },
  { code: "HU", name: "Hungary" },
  { code: "IE", name: "Ireland" },
  { code: "IT", name: "Italy" },
  { code: "LV", name: "Latvia" },
  { code: "LT", name: "Lithuania" },
  { code: "LU", name: "Luxembourg" },
  { code: "MT", name: "Malta" },
  { code: "NL", name: "Netherlands" },
  { code: "PL", name: "Poland" },
  { code: "PT", name: "Portugal" },
  { code: "RO", name: "Romania" },
  { code: "SK", name: "Slovakia" },
  { code: "SI", name: "Slovenia" },
  { code: "ES", name: "Spain" },
  { code: "SE", name: "Sweden" },
] as const;

// Schema for shipping address in checkout
const checkoutAddressSchema = z.object({
  street: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  postal_code: z.string().min(1, "Postal code is required"),
  country: z.string().length(2, "Please select a country"),
  state: z.string().optional(),
});

export type CheckoutAddressData = z.infer<typeof checkoutAddressSchema>;

interface ShippingAddressPickerProps {
  /** Called when address changes */
  onAddressChange: (address: CheckoutAddressData, isValid: boolean) => void;
  /** Currently selected address */
  selectedAddress?: CheckoutAddressData | null;
  /** Disable the picker */
  disabled?: boolean;
  className?: string;
}

/**
 * ShippingAddressPicker - Smart address selection for checkout
 * 
 * Features:
 * - Shows user's saved default address immediately
 * - "Change" button to select from saved addresses or add new
 * - Google autocomplete for new addresses
 * - Clean UX without unnecessary form fields visible
 */
export function ShippingAddressPicker({
  onAddressChange,
  selectedAddress,
  disabled = false,
  className,
}: ShippingAddressPickerProps) {
  // Fetch user's saved addresses
  const { data: savedAddresses, isLoading: addressesLoading } = useShippingAddresses();
  
  // Local state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"select" | "new">("select");
  const [currentAddress, setCurrentAddress] = useState<CheckoutAddressData | null>(null);
  const [hasInitialized, setHasInitialized] = useState(false);

  // Form for new address
  const {
    register,
    setValue,
    watch,
    reset,
    formState: { errors, isValid },
  } = useForm<CheckoutAddressData>({
    resolver: zodResolver(checkoutAddressSchema),
    mode: "onChange",
    defaultValues: {
      street: "",
      city: "",
      postal_code: "",
      country: "",
      state: "",
    },
  });

  const watchedForm = watch();
  const [showManualFields, setShowManualFields] = useState(false);

  // Initialize with default address when addresses load
  useEffect(() => {
    if (!hasInitialized && savedAddresses && savedAddresses.length > 0) {
      const defaultAddr = savedAddresses.find(a => a.is_default) || savedAddresses[0];
      const checkoutAddr: CheckoutAddressData = {
        street: defaultAddr.street,
        city: defaultAddr.city,
        postal_code: defaultAddr.postal_code,
        country: defaultAddr.country,
        state: defaultAddr.state || "",
      };
      setCurrentAddress(checkoutAddr);
      onAddressChange(checkoutAddr, true);
      setHasInitialized(true);
    }
  }, [savedAddresses, hasInitialized, onAddressChange]);

  // Sync with external selectedAddress prop
  useEffect(() => {
    if (selectedAddress && !currentAddress) {
      setCurrentAddress(selectedAddress);
    }
  }, [selectedAddress, currentAddress]);

  // Handle selecting a saved address
  const handleSelectSavedAddress = useCallback((address: ShippingAddress) => {
    const checkoutAddr: CheckoutAddressData = {
      street: address.street,
      city: address.city,
      postal_code: address.postal_code,
      country: address.country,
      state: address.state || "",
    };
    setCurrentAddress(checkoutAddr);
    onAddressChange(checkoutAddr, true);
    setIsDialogOpen(false);
  }, [onAddressChange]);

  // Handle adding a new address (from Google autocomplete)
  const handleGoogleAddressSelect = useCallback((address: AddressComponents) => {
    setValue("street", address.street, { shouldValidate: true });
    setValue("city", address.city, { shouldValidate: true });
    setValue("postal_code", address.postalCode, { shouldValidate: true });
    setValue("country", address.country.toUpperCase(), { shouldValidate: true });
    if (address.state) {
      setValue("state", address.state, { shouldValidate: true });
    }
    setShowManualFields(true);
  }, [setValue]);

  // Confirm new address
  const handleConfirmNewAddress = useCallback(() => {
    if (isValid) {
      const newAddr: CheckoutAddressData = {
        street: watchedForm.street,
        city: watchedForm.city,
        postal_code: watchedForm.postal_code,
        country: watchedForm.country,
        state: watchedForm.state || "",
      };
      setCurrentAddress(newAddr);
      onAddressChange(newAddr, true);
      setIsDialogOpen(false);
      setShowManualFields(false);
      reset();
    }
  }, [isValid, watchedForm, onAddressChange, reset]);

  // Open dialog to add new address
  const handleOpenNewAddress = useCallback(() => {
    setDialogMode("new");
    setShowManualFields(false);
    reset();
  }, [reset]);

  // Open dialog to select from saved
  const handleOpenSelect = useCallback(() => {
    setDialogMode("select");
    setIsDialogOpen(true);
  }, []);

  // Format address for display
  const formatAddressDisplay = (addr: CheckoutAddressData | ShippingAddress) => {
    const countryName = EU_COUNTRIES.find(c => c.code === addr.country)?.name || addr.country;
    return `${addr.street}, ${addr.postal_code} ${addr.city}, ${countryName}`;
  };

  // Loading state
  if (addressesLoading) {
    return (
      <div className={cn("space-y-3", className)}>
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-20 w-full rounded-lg" />
      </div>
    );
  }

  // No addresses yet - show form directly
  if (!savedAddresses || savedAddresses.length === 0) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4" />
          <span>No saved addresses. Enter your shipping address:</span>
        </div>
        <InlineAddressForm
          onAddressChange={(addr, valid) => {
            setCurrentAddress(addr);
            onAddressChange(addr, valid);
          }}
          disabled={disabled}
        />
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* Current Selected Address Card */}
      {currentAddress ? (
        <div className="relative">
          <div className="p-4 bg-card border rounded-lg">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 min-w-0">
                <div className="mt-0.5 p-2 bg-primary/10 rounded-lg shrink-0">
                  <Home className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">Delivery Address</p>
                    <Check className="h-4 w-4 text-green-600" />
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5 truncate">
                    {currentAddress.street}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {currentAddress.postal_code} {currentAddress.city}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {EU_COUNTRIES.find(c => c.code === currentAddress.country)?.name || currentAddress.country}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleOpenSelect}
                disabled={disabled}
                className="shrink-0"
              >
                <Pencil className="h-4 w-4 mr-1" />
                Change
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <Button
          variant="outline"
          onClick={handleOpenSelect}
          disabled={disabled}
          className="w-full justify-start text-muted-foreground"
        >
          <MapPin className="h-4 w-4 mr-2" />
          Select shipping address
          <ChevronDown className="h-4 w-4 ml-auto" />
        </Button>
      )}

      {/* Address Selection Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {dialogMode === "select" ? "Select Delivery Address" : "Add New Address"}
            </DialogTitle>
            <DialogDescription>
              {dialogMode === "select"
                ? "Choose from your saved addresses or add a new one"
                : "Enter your new delivery address"}
            </DialogDescription>
          </DialogHeader>

          {dialogMode === "select" ? (
            <div className="space-y-4">
              {/* Saved Addresses List */}
              <RadioGroup
                value={currentAddress ? formatAddressDisplay(currentAddress) : ""}
                className="space-y-3"
              >
                {savedAddresses.map((address) => (
                  <div
                    key={address.id}
                    onClick={() => handleSelectSavedAddress(address)}
                    className={cn(
                      "relative flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-colors",
                      "hover:bg-muted/50",
                      currentAddress && formatAddressDisplay(currentAddress) === formatAddressDisplay(address)
                        ? "border-primary bg-primary/5"
                        : ""
                    )}
                  >
                    <RadioGroupItem
                      value={formatAddressDisplay(address)}
                      id={address.id}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Label htmlFor={address.id} className="text-sm font-medium cursor-pointer">
                          {address.full_name}
                        </Label>
                        {address.is_default && (
                          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                            Default
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {address.street}
                        {address.address_line_2 && `, ${address.address_line_2}`}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {address.postal_code} {address.city}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {EU_COUNTRIES.find(c => c.code === address.country)?.name || address.country}
                      </p>
                    </div>
                  </div>
                ))}
              </RadioGroup>

              {/* Add New Address Button */}
              <Button
                variant="outline"
                onClick={handleOpenNewAddress}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Use a different address
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Google Autocomplete */}
              {!showManualFields && (
                <AddressAutocomplete
                  value=""
                  onChange={handleGoogleAddressSelect}
                  onManualEntry={() => setShowManualFields(true)}
                  label="Search Address"
                  placeholder="Start typing your address..."
                />
              )}

              {/* Manual Fields */}
              {showManualFields && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-street">Address</Label>
                    <Input
                      id="new-street"
                      {...register("street")}
                      placeholder="Street name and number"
                      className={errors.street ? "border-destructive" : ""}
                    />
                    {errors.street && (
                      <p className="text-sm text-destructive">{errors.street.message}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="new-postal">Postal code</Label>
                      <Input
                        id="new-postal"
                        {...register("postal_code")}
                        placeholder="12345"
                        className={errors.postal_code ? "border-destructive" : ""}
                      />
                      {errors.postal_code && (
                        <p className="text-sm text-destructive">{errors.postal_code.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="new-city">City</Label>
                      <Input
                        id="new-city"
                        {...register("city")}
                        placeholder="City name"
                        className={errors.city ? "border-destructive" : ""}
                      />
                      {errors.city && (
                        <p className="text-sm text-destructive">{errors.city.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="new-country">Country</Label>
                    <Select
                      value={watchedForm.country}
                      onValueChange={(value) => setValue("country", value, { shouldValidate: true })}
                    >
                      <SelectTrigger className={errors.country ? "border-destructive" : ""}>
                        <SelectValue placeholder="Select a country" />
                      </SelectTrigger>
                      <SelectContent>
                        {EU_COUNTRIES.map((country) => (
                          <SelectItem key={country.code} value={country.code}>
                            {country.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.country && (
                      <p className="text-sm text-destructive">{errors.country.message}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setDialogMode("select")}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  onClick={handleConfirmNewAddress}
                  disabled={!isValid}
                  className="flex-1"
                >
                  Use This Address
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/**
 * Inline address form for when user has no saved addresses
 */
function InlineAddressForm({
  onAddressChange,
  disabled,
}: {
  onAddressChange: (address: CheckoutAddressData, isValid: boolean) => void;
  disabled?: boolean;
}) {
  const [showManualFields, setShowManualFields] = useState(false);

  const {
    register,
    setValue,
    watch,
    formState: { errors, isValid },
  } = useForm<CheckoutAddressData>({
    resolver: zodResolver(checkoutAddressSchema),
    mode: "onChange",
    defaultValues: {
      street: "",
      city: "",
      postal_code: "",
      country: "",
      state: "",
    },
  });

  const watchedForm = watch();

  // Notify parent on changes
  useEffect(() => {
    const timeout = setTimeout(() => {
      onAddressChange(watchedForm, isValid);
    }, 300);
    return () => clearTimeout(timeout);
  }, [watchedForm, isValid, onAddressChange]);

  const handleGoogleSelect = useCallback((address: AddressComponents) => {
    setValue("street", address.street, { shouldValidate: true });
    setValue("city", address.city, { shouldValidate: true });
    setValue("postal_code", address.postalCode, { shouldValidate: true });
    setValue("country", address.country.toUpperCase(), { shouldValidate: true });
    if (address.state) {
      setValue("state", address.state, { shouldValidate: true });
    }
    setShowManualFields(true);
  }, [setValue]);

  return (
    <div className="space-y-4">
      {/* Google Autocomplete */}
      {!showManualFields && (
        <AddressAutocomplete
          value=""
          onChange={handleGoogleSelect}
          onManualEntry={() => setShowManualFields(true)}
          placeholder="Start typing your address..."
          disabled={disabled}
        />
      )}

      {/* Manual Fields */}
      {showManualFields && (
        <>
          <div className="space-y-2">
            <Label htmlFor="inline-street">Address</Label>
            <Input
              id="inline-street"
              {...register("street")}
              placeholder="Street name and number"
              disabled={disabled}
              className={errors.street ? "border-destructive" : ""}
            />
            {errors.street && (
              <p className="text-sm text-destructive">{errors.street.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="inline-postal">Postal code</Label>
              <Input
                id="inline-postal"
                {...register("postal_code")}
                placeholder="12345"
                disabled={disabled}
                className={errors.postal_code ? "border-destructive" : ""}
              />
              {errors.postal_code && (
                <p className="text-sm text-destructive">{errors.postal_code.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="inline-city">City</Label>
              <Input
                id="inline-city"
                {...register("city")}
                placeholder="City name"
                disabled={disabled}
                className={errors.city ? "border-destructive" : ""}
              />
              {errors.city && (
                <p className="text-sm text-destructive">{errors.city.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="inline-country">Country</Label>
            <Select
              value={watchedForm.country}
              onValueChange={(value) => setValue("country", value, { shouldValidate: true })}
              disabled={disabled}
            >
              <SelectTrigger className={errors.country ? "border-destructive" : ""}>
                <SelectValue placeholder="Select a country" />
              </SelectTrigger>
              <SelectContent>
                {EU_COUNTRIES.map((country) => (
                  <SelectItem key={country.code} value={country.code}>
                    {country.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.country && (
              <p className="text-sm text-destructive">{errors.country.message}</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

