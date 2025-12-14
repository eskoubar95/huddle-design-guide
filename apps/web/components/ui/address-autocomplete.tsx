'use client'

import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Loader2, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import Script from "next/script";

interface AddressAutocompleteProps {
  value: string;
  onChange: (address: AddressComponents) => void;
  onInputChange?: (value: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  country?: string; // ISO-2 country code to restrict results
  disabled?: boolean;
  className?: string;
}

export interface AddressComponents {
  street: string;
  city: string;
  postalCode: string;
  state?: string;
  country: string;
  fullAddress: string;
}

// Google Maps API type definitions
interface AutocompletePrediction {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

interface PlaceResult {
  address_components?: Array<{
    long_name: string;
    short_name: string;
    types: string[];
  }>;
  formatted_address?: string;
}

interface AutocompleteRequest {
  input: string;
  sessionToken?: unknown;
  componentRestrictions?: { country: string | string[] };
}

interface PlaceDetailsRequest {
  placeId: string;
  fields: string[];
  sessionToken?: unknown;
}

interface AutocompleteService {
  getPlacePredictions(
    request: AutocompleteRequest,
    callback: (predictions: AutocompletePrediction[] | null, status: string) => void
  ): void;
}

interface PlacesService {
  getDetails(
    request: PlaceDetailsRequest,
    callback: (place: PlaceResult | null, status: string) => void
  ): void;
}

declare global {
  interface Window {
    google?: {
      maps: {
        places: {
          AutocompleteService: new () => AutocompleteService;
          PlacesService: new (div: HTMLElement) => PlacesService;
          AutocompleteSessionToken: new () => unknown;
          PlacesServiceStatus: {
            OK: string;
            ZERO_RESULTS: string;
            [key: string]: string;
          };
        };
      };
    };
  }
}

export function AddressAutocomplete({
  value,
  onChange,
  onInputChange,
  placeholder = "Start typing your address...",
  label,
  error,
  country,
  disabled,
  className,
}: AddressAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [predictions, setPredictions] = useState<AutocompletePrediction[]>([]);
  const [searchQuery, setSearchQuery] = useState(value || "");
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteServiceRef = useRef<AutocompleteService | null>(null);
  const placesServiceRef = useRef<PlacesService | null>(null);
  const sessionTokenRef = useRef<unknown>(null);

  // Initialize Google Places API
  useEffect(() => {
    if (typeof window !== 'undefined' && window.google?.maps?.places) {
      const places = window.google.maps.places;
      
      // Create AutocompleteService
      autocompleteServiceRef.current = new places.AutocompleteService();
      
      // Create PlacesService (needs a dummy div)
      const dummyDiv = document.createElement('div');
      placesServiceRef.current = new places.PlacesService(dummyDiv);
      
      // Create session token for billing optimization
      sessionTokenRef.current = new places.AutocompleteSessionToken();
      
      setIsLoading(false);
    }
  }, []);

  // Handle Google Maps API script load
  const handleScriptLoad = () => {
    if (window.google?.maps?.places) {
      const places = window.google.maps.places;
      
      autocompleteServiceRef.current = new places.AutocompleteService();
      const dummyDiv = document.createElement('div');
      placesServiceRef.current = new places.PlacesService(dummyDiv);
      sessionTokenRef.current = new places.AutocompleteSessionToken();
      
      setIsLoading(false);
    }
  };

  // Fetch predictions when user types
  useEffect(() => {
    if (!autocompleteServiceRef.current || !searchQuery || searchQuery.length < 3) {
      setPredictions([]);
      return;
    }

    const request: AutocompleteRequest = {
      input: searchQuery,
      sessionToken: sessionTokenRef.current || undefined,
    };

    // Restrict to country if provided
    if (country) {
      request.componentRestrictions = { country: country.toLowerCase() };
    }

    autocompleteServiceRef.current.getPlacePredictions(
      request,
      (predictions, status) => {
        if (status === window.google?.maps?.places?.PlacesServiceStatus?.OK && predictions) {
          setPredictions(predictions);
        } else {
          setPredictions([]);
        }
      }
    );
  }, [searchQuery, country]);

  // Handle address selection
  const handleSelect = (placeId: string) => {
    if (!placesServiceRef.current) return;

    const request: PlaceDetailsRequest = {
      placeId,
      fields: [
        'address_components',
        'formatted_address',
      ],
      sessionToken: sessionTokenRef.current || undefined,
    };

    placesServiceRef.current.getDetails(request, (place, status) => {
      if (status === window.google?.maps?.places?.PlacesServiceStatus?.OK && place) {
        const components = parseAddressComponents(place);
        onChange(components);
        setSearchQuery(components.fullAddress);
        setIsOpen(false);
        
        // Create new session token for next search
        if (window.google?.maps?.places) {
          sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken();
        }
      }
    });
  };

  // Parse Google Places address components into our format
  const parseAddressComponents = (place: PlaceResult): AddressComponents => {
    const components = place.address_components || [];
    
    let street = '';
    let city = '';
    let postalCode = '';
    let state = '';
    let countryCode = '';

    components.forEach((component) => {
      const types = component.types;
      
      if (types.includes('street_number')) {
        street = component.long_name + ' ';
      }
      if (types.includes('route')) {
        street += component.long_name;
      }
      if (types.includes('locality')) {
        city = component.long_name;
      }
      if (types.includes('postal_code')) {
        postalCode = component.long_name;
      }
      if (types.includes('administrative_area_level_1')) {
        state = component.short_name;
      }
      if (types.includes('country')) {
        countryCode = component.short_name;
      }
    });

    return {
      street: street.trim(),
      city,
      postalCode,
      state: state || undefined,
      country: countryCode,
      fullAddress: place.formatted_address || '',
    };
  };

  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  return (
    <>
      {googleMapsApiKey && (
        <Script
          src={`https://maps.googleapis.com/maps/api/js?key=${googleMapsApiKey}&libraries=places&loading=async`}
          strategy="lazyOnload"
          onLoad={handleScriptLoad}
        />
      )}
      
      <div className={cn("space-y-2", className)}>
        {label && (
          <Label>
            {label} <span className="text-destructive">*</span>
          </Label>
        )}
        
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <div className="relative">
              <Input
                ref={inputRef}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  onInputChange?.(e.target.value);
                  if (e.target.value.length >= 3) {
                    setIsOpen(true);
                  }
                }}
                onFocus={() => {
                  if (searchQuery.length >= 3) {
                    setIsOpen(true);
                  }
                }}
                placeholder={placeholder}
                disabled={disabled || isLoading || !googleMapsApiKey}
                autoComplete="off"
                className={cn(
                  error && "border-destructive"
                )}
              />
              {isLoading && googleMapsApiKey && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
          </PopoverTrigger>
          
          {predictions.length > 0 && (
            <PopoverContent 
              className="w-[var(--radix-popover-trigger-width)] p-0" 
              align="start"
              onOpenAutoFocus={(e) => e.preventDefault()}
            >
              <Command>
                <CommandList>
                  <CommandEmpty>No addresses found.</CommandEmpty>
                  <CommandGroup>
                    {predictions.map((prediction) => (
                      <CommandItem
                        key={prediction.place_id}
                        value={prediction.description}
                        onSelect={() => handleSelect(prediction.place_id)}
                        className="cursor-pointer"
                      >
                        <MapPin className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">{prediction.structured_formatting.main_text}</span>
                          <span className="text-xs text-muted-foreground">{prediction.structured_formatting.secondary_text}</span>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          )}
        </Popover>
        
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
        
        {!googleMapsApiKey && (
          <p className="text-xs text-muted-foreground">
            Address autocomplete requires Google Maps API key
          </p>
        )}
      </div>
    </>
  );
}
