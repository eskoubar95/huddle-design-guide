import { ApiError } from "@/lib/api/errors";

export interface ProfileCompletenessResult {
  isProfileComplete: boolean;
  hasDefaultShippingAddress: boolean;
  missingFields: string[];
}

export interface SellerEligibilityResult extends ProfileCompletenessResult {
  isIdentityVerified: boolean;
  reason?: 'profile_incomplete' | 'missing_default_address' | 'identity_required' | 'identity_rejected' | 'identity_pending';
}

export interface BuyerEligibilityResult extends ProfileCompletenessResult {
  reason?: 'profile_incomplete' | 'missing_default_address';
}

/**
 * Service for validating profile completeness and marketplace eligibility
 * Handles buyer and seller verification requirements
 */
export class ProfileValidationService {
  /**
   * Check if user's profile is complete and has default shipping address
   */
  async getProfileCompleteness(userId: string): Promise<ProfileCompletenessResult> {
    const { createServiceClient } = await import("@/lib/supabase/server");
    const supabase = await createServiceClient();

    // Get profile data
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("first_name, last_name, phone, is_profile_complete")
      .eq("id", userId)
      .single();

    if (profileError || !profile) {
      throw new ApiError("NOT_FOUND", "Profile not found", 404);
    }

    // Check for missing profile fields
    const missingFields: string[] = [];
    if (!profile.first_name?.trim()) missingFields.push("first_name");
    if (!profile.last_name?.trim()) missingFields.push("last_name");
    if (!profile.phone?.trim()) missingFields.push("phone");

    // Check for default shipping address
    const { data: defaultAddress } = await supabase
      .from("shipping_addresses")
      .select("id")
      .eq("user_id", userId)
      .eq("is_default", true)
      .maybeSingle();

    const hasDefaultShippingAddress = !!defaultAddress;
    if (!hasDefaultShippingAddress) {
      missingFields.push("default_shipping_address");
    }

    const isProfileComplete = missingFields.length === 0;

    return {
      isProfileComplete,
      hasDefaultShippingAddress,
      missingFields,
    };
  }

  /**
   * Check if user is eligible to sell (complete profile + verified identity)
   */
  async getSellerEligibility(userId: string): Promise<SellerEligibilityResult> {
    const { createServiceClient } = await import("@/lib/supabase/server");
    const supabase = await createServiceClient();

    // Get profile data including identity verification status
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("first_name, last_name, phone, is_profile_complete, stripe_identity_verification_status")
      .eq("id", userId)
      .single();

    if (profileError || !profile) {
      throw new ApiError("NOT_FOUND", "Profile not found", 404);
    }

    // Check for missing profile fields
    const missingFields: string[] = [];
    if (!profile.first_name?.trim()) missingFields.push("first_name");
    if (!profile.last_name?.trim()) missingFields.push("last_name");
    if (!profile.phone?.trim()) missingFields.push("phone");

    // Check for default shipping address
    const { data: defaultAddress, error: defaultAddressError } = await supabase
      .from("shipping_addresses")
      .select("id")
      .eq("user_id", userId)
      .eq("is_default", true)
      .maybeSingle();

    // Handle database errors - don't treat errors as "missing address"
    if (defaultAddressError) {
      throw new ApiError(
        "INTERNAL_SERVER_ERROR",
        "Failed to fetch shipping address",
        500
      );
    }

    const hasDefaultShippingAddress = !!defaultAddress;
    if (!hasDefaultShippingAddress) {
      missingFields.push("default_shipping_address");
    }

    // Profile completeness (name/phone + address only, not identity)
    const isProfileComplete = missingFields.length === 0;

    // Check identity verification status (seller-only requirement, separate from profile completeness)
    const identityStatus = profile.stripe_identity_verification_status;
    const isIdentityVerified = identityStatus === 'verified';

    // Determine reason for ineligibility
    let reason: SellerEligibilityResult['reason'] | undefined;
    if (!isProfileComplete || !isIdentityVerified) {
      if (missingFields.some(f => ['first_name', 'last_name', 'phone'].includes(f))) {
        reason = 'profile_incomplete';
      } else if (!hasDefaultShippingAddress) {
        reason = 'missing_default_address';
      } else if (identityStatus === 'pending') {
        reason = 'identity_pending';
      } else if (identityStatus === 'rejected') {
        reason = 'identity_rejected';
      } else {
        reason = 'identity_required';
      }
    }

    return {
      isProfileComplete,
      hasDefaultShippingAddress,
      isIdentityVerified,
      missingFields,
      reason,
    };
  }

  /**
   * Check if user is eligible to buy (complete profile + shipping address, no identity required)
   */
  async getBuyerEligibility(userId: string): Promise<BuyerEligibilityResult> {
    const completeness = await this.getProfileCompleteness(userId);

    // Determine reason for ineligibility
    let reason: BuyerEligibilityResult['reason'] | undefined;
    if (!completeness.isProfileComplete) {
      if (completeness.missingFields.some(f => ['first_name', 'last_name', 'phone'].includes(f))) {
        reason = 'profile_incomplete';
      } else if (!completeness.hasDefaultShippingAddress) {
        reason = 'missing_default_address';
      }
    }

    return {
      ...completeness,
      reason,
    };
  }
}
