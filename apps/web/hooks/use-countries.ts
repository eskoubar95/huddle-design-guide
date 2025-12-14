import { useQuery } from "@tanstack/react-query";

interface Country {
  iso_2: string;
  iso_3: string;
  num_code: string;
  name: string;
  display_name: string;
  region_id: string | null;
}

interface CountriesResponse {
  countries: Country[];
}

/**
 * Hook to fetch countries from Medusa region_country table
 * Data is cached for 1 hour since countries rarely change
 */
export function useCountries(regionId?: string) {
  return useQuery<Country[]>({
    queryKey: ["countries", regionId],
    queryFn: async () => {
      const url = regionId
        ? `/api/v1/countries?region_id=${encodeURIComponent(regionId)}`
        : "/api/v1/countries";
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to fetch countries");
      }
      const data: CountriesResponse = await response.json();
      return data.countries || [];
    },
    staleTime: 60 * 60 * 1000, // Cache for 1 hour
    gcTime: 24 * 60 * 60 * 1000, // Keep in cache for 24 hours
    retry: 2,
  });
}
