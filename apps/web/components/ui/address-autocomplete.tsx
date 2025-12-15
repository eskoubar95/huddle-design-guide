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
  onManualEntry?: () => void; // Callback when "Couldn't Find" is clicked
  placeholder?: string;
  label?: string;
  error?: string;
  country?: string; // ISO-2 country code to restrict results
  disabled?: boolean;
  className?: string;
}

export interface AddressComponents {
  street: string;
  addressLine2?: string; // Apartment, suite, floor, etc.
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
  onManualEntry,
  placeholder = "Start typing your address...",
  label,
  error,
  country,
  disabled,
  className,
}: AddressAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [apiReady, setApiReady] = useState(false);
  const [predictions, setPredictions] = useState<AutocompletePrediction[]>([]);
  const [searchQuery, setSearchQuery] = useState(value || "");
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteServiceRef = useRef<AutocompleteService | null>(null);
  const placesServiceRef = useRef<PlacesService | null>(null);
  const sessionTokenRef = useRef<unknown>(null);


  // Initialize Google Places API - check if already loaded
  useEffect(() => {
    const initGooglePlaces = () => {
      if (typeof window !== 'undefined' && window.google?.maps?.places) {
        const places = window.google.maps.places;
        
        try {
          // Create AutocompleteService
          autocompleteServiceRef.current = new places.AutocompleteService();
          
          // Create PlacesService (needs a dummy div)
          const dummyDiv = document.createElement('div');
          placesServiceRef.current = new places.PlacesService(dummyDiv);
          
          // Create session token for billing optimization
          sessionTokenRef.current = new places.AutocompleteSessionToken();
          
          setApiReady(true);
          setIsLoading(false);
        } catch (error) {
          console.error('Error initializing Google Places:', error);
          setIsLoading(false);
        }
      }
    };

    // Check if already loaded
    if (typeof window !== 'undefined' && window.google?.maps?.places) {
      initGooglePlaces();
    }

    // Fallback timeout - enable input after 3 seconds even if API not loaded
    const timeout = setTimeout(() => {
      if (!apiReady) {
        console.warn('Google Places API not loaded after 3 seconds, enabling input anyway');
        setIsLoading(false);
      }
    }, 3000);

    return () => clearTimeout(timeout);
  }, [apiReady]);

  // Handle Google Maps API script load
  const handleScriptLoad = () => {
    if (window.google?.maps?.places) {
      const places = window.google.maps.places;
      
      try {
        autocompleteServiceRef.current = new places.AutocompleteService();
        const dummyDiv = document.createElement('div');
        placesServiceRef.current = new places.PlacesService(dummyDiv);
        sessionTokenRef.current = new places.AutocompleteSessionToken();
        
        setApiReady(true);
        setIsLoading(false);
      } catch (error) {
        console.error('Error initializing Google Places:', error);
        setIsLoading(false);
      }
    } else {
      // Script loaded but API not ready - wait a bit
      const checkInterval = setInterval(() => {
        if (window.google?.maps?.places) {
          handleScriptLoad();
          clearInterval(checkInterval);
        }
      }, 100);

      // Stop checking after 5 seconds
      setTimeout(() => clearInterval(checkInterval), 5000);
    }
  };

  // Fetch predictions when user types
  useEffect(() => {
    if (!apiReady || !autocompleteServiceRef.current || !searchQuery || searchQuery.length < 3) {
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
  }, [searchQuery, country, apiReady]);

  // Handle address selection
  const handleSelect = (placeId: string, predictionMainText: string) => {
    if (!placesServiceRef.current) return;

    const request: PlaceDetailsRequest = {
      placeId,
      fields: [
        'address_components',
        'formatted_address',
        // Explicitly request all address component types we need
        'name', // Place name (useful for debugging)
      ],
      sessionToken: sessionTokenRef.current || undefined,
    };

    placesServiceRef.current.getDetails(request, (place, status) => {
      if (status === window.google?.maps?.places?.PlacesServiceStatus?.OK && place) {
        // Debug: Log address components to help diagnose parsing issues
        if (process.env.NODE_ENV === 'development') {
          console.log('Google Places API address components:', place.address_components);
          console.log('Prediction main_text:', predictionMainText);
        }
        const components = parseAddressComponents(place, predictionMainText);
        if (process.env.NODE_ENV === 'development') {
          console.log('Parsed address components:', components);
        }
        onChange(components);
        setSearchQuery(components.fullAddress);
        setIsOpen(false);
        
        // Create new session token for next search
        if (window.google?.maps?.places) {
          sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken();
        }
      } else {
        console.error('Google Places API error:', status);
      }
    });
  };

  // Parse Google Places address components into our format
  // predictionMainText is used to extract street number when Google doesn't return it separately
  const parseAddressComponents = (place: PlaceResult, predictionMainText?: string): AddressComponents => {
    const components = place.address_components || [];
    
    let streetNumber = '';
    let route = '';
    let subpremise = ''; // Apartment, floor, suite, etc.
    let city = '';
    let postalCode = '';
    let state = '';
    let countryCode = '';

    components.forEach((component) => {
      const types = component.types;
      
      if (types.includes('street_number')) {
        streetNumber = component.long_name;
      }
      if (types.includes('route')) {
        route = component.long_name;
      }
      if (types.includes('subpremise')) {
        // Apartment, floor, suite, unit, etc.
        subpremise = component.long_name;
      }
      // City can be in locality, sublocality, or administrative_area_level_2
      if (types.includes('locality') && !city) {
        city = component.long_name;
      } else if (types.includes('sublocality') && !city) {
        city = component.long_name;
      } else if (types.includes('administrative_area_level_2') && !city) {
        city = component.long_name;
      }
      if (types.includes('postal_code')) {
        postalCode = component.long_name;
      }
      if (types.includes('administrative_area_level_1')) {
        state = component.short_name;
      }
      if (types.includes('country')) {
        // Always use short_name for country (ISO-2 code)
        countryCode = component.short_name || component.long_name;
      }
    });

    // If street_number is not a separate component, try to extract from prediction main_text
    // This is the most reliable source since it contains what the user selected (e.g., "Rua X 11")
    if (!streetNumber && predictionMainText) {
      // Extract street number from prediction (e.g., "Rua Doutor António Granjo 11" -> "11")
      const mainTextMatch = predictionMainText.match(/\s+(\d+)$/);
      if (mainTextMatch) {
        streetNumber = mainTextMatch[1];
        if (process.env.NODE_ENV === 'development') {
          console.log('Extracted street number from prediction:', streetNumber);
        }
      }
    }

    // Fallback: try to extract from route
    if (!streetNumber && route) {
      const routeMatch = route.match(/\s+(\d+)(?:\s|$)/);
      if (routeMatch) {
        streetNumber = routeMatch[1];
        // Remove the number from route
        route = route.replace(/\s+\d+(?:\s|$)/, '').trim();
      }
    }

    // Fallback: try to extract from formatted_address
    if (!streetNumber && place.formatted_address) {
      // Look for pattern like "Rua X 11" or "Street 11," at the start
      const addressMatch = place.formatted_address.match(/^([^,]+?)\s+(\d+)(?:\s*,|\s+)/);
      if (addressMatch && addressMatch[2]) {
        streetNumber = addressMatch[2];
      }
    }

    // Combine street number and route (street number last for European format like "Rua X 11")
    // or street number first for US format ("11 Main St")
    // Use route + number if route doesn't contain number
    const street = streetNumber 
      ? `${route} ${streetNumber}`.trim() 
      : route;

    // Debug logging
    if (process.env.NODE_ENV === 'development') {
      console.log('Parsed values:', {
        streetNumber,
        route,
        street,
        countryCode,
        subpremise,
        predictionMainText,
      });
    }

    return {
      street: street || route, // Fallback to route if no street number
      addressLine2: subpremise || undefined,
      city,
      postalCode,
      state: state || undefined,
      country: countryCode || '', // Ensure it's always a string
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
                disabled={disabled}
                autoComplete="off"
                className={cn(
                  error && "border-destructive"
                )}
              />
              {isLoading && googleMapsApiKey && !apiReady && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
          </PopoverTrigger>
          
          {(predictions.length > 0 || (searchQuery.length >= 3 && apiReady)) && (
            <PopoverContent 
              className="w-[var(--radix-popover-trigger-width)] p-0" 
              align="start"
              onOpenAutoFocus={(e) => e.preventDefault()}
            >
              <Command>
                <CommandList>
                  {predictions.length > 0 ? (
                    <>
                      <CommandGroup>
                        {predictions.map((prediction) => (
                          <CommandItem
                            key={prediction.place_id}
                            value={prediction.description}
                            onSelect={() => handleSelect(prediction.place_id, prediction.structured_formatting.main_text)}
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
                      {onManualEntry && (
                        <CommandGroup>
                          <CommandItem
                            onSelect={() => {
                              setIsOpen(false);
                              onManualEntry();
                            }}
                            className="cursor-pointer text-muted-foreground"
                          >
                            <span className="text-sm">Couldn&apos;t Find</span>
                          </CommandItem>
                        </CommandGroup>
                      )}
                    </>
                  ) : (
                    <>
                      <CommandEmpty>No addresses found.</CommandEmpty>
                      {onManualEntry && (
                        <CommandGroup>
                          <CommandItem
                            onSelect={() => {
                              setIsOpen(false);
                              onManualEntry();
                            }}
                            className="cursor-pointer text-muted-foreground"
                          >
                            <span className="text-sm">Couldn&apos;t Find - Enter manually</span>
                          </CommandItem>
                        </CommandGroup>
                      )}
                    </>
                  )}
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
