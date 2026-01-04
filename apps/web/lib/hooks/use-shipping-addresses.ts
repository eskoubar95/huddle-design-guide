import { useQuery } from "@tanstack/react-query";
import { useApiRequest } from "@/lib/api/client";

export interface ShippingAddress {
  id: string;
  user_id: string;
  full_name: string;
  street: string;
  address_line_2: string | null;
  city: string;
  state: string | null;
  postal_code: string;
  country: string;
  phone: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

interface ShippingAddressesResponse {
  addresses: ShippingAddress[];
}

/**
 * Hook to fetch user's shipping addresses
 * Returns addresses sorted by is_default first, then created_at descending
 */
export function useShippingAddresses(userId?: string) {
  const apiRequest = useApiRequest();

  return useQuery({
    queryKey: ["shipping-addresses", userId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (userId) params.set("userId", userId);
      const queryString = params.toString();
      const data = await apiRequest<ShippingAddressesResponse>(
        `/shipping/addresses${queryString ? `?${queryString}` : ""}`
      );
      return data.addresses;
    },
    enabled: true, // Fetch addresses (uses auth token to determine user if userId not provided)
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to get just the default shipping address
 * Convenience wrapper around useShippingAddresses
 */
export function useDefaultShippingAddress(userId?: string) {
  const { data: addresses, ...rest } = useShippingAddresses(userId);
  
  // Find default address (backend should sort by is_default first, but we search to be safe)
  const defaultAddress = addresses?.find(a => a.is_default) || addresses?.[0] || null;
  
  return {
    data: defaultAddress,
    ...rest,
  };
}

