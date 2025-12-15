import { requireAuth, type AuthResult } from "@/lib/auth";
import { ApiError } from "@/lib/api/errors";
import { ProfileValidationService } from "@/lib/services/profile-validation-service";

/**
 * Middleware to ensure user has complete buyer profile
 * Throws ApiError(403) with redirectUrl if profile is incomplete
 */
export async function requireBuyerProfile(req: Request): Promise<AuthResult> {
  // First verify authentication
  const authResult = await requireAuth(req);

  // Check buyer eligibility
  const service = new ProfileValidationService();
  const eligibility = await service.getBuyerEligibility(authResult.userId);

  if (!eligibility.isProfileComplete) {
    const { reason, missingFields } = eligibility;

    // Determine redirect URL based on what's missing
    const redirectUrl = '/profile/complete';

    // Create user-friendly message
    let message = "Please complete your profile to continue";
    if (reason === 'missing_default_address') {
      message = "Please add a default shipping address to continue";
    }

    throw new ApiError(
      reason || 'profile_incomplete',
      message,
      403,
      {
        redirectUrl,
        missingFields,
        reason,
      }
    );
  }

  return authResult;
}

/**
 * Middleware to ensure user has complete seller profile + verified identity
 * Throws ApiError(403) with redirectUrl if requirements not met
 */
export async function requireSellerVerification(req: Request): Promise<AuthResult> {
  // First verify authentication
  const authResult = await requireAuth(req);

  // Check seller eligibility
  const service = new ProfileValidationService();
  const eligibility = await service.getSellerEligibility(authResult.userId);

  if (!eligibility.isProfileComplete) {
    const { reason, missingFields, isIdentityVerified } = eligibility;

    // Determine redirect URL based on what's missing
    let redirectUrl = '/profile/complete';
    let message = "Please complete your profile to continue";

    // If profile is complete but identity verification is the issue
    if (missingFields.every(f => f === 'identity_verification')) {
      redirectUrl = '/seller/verify-identity';

      if (reason === 'identity_pending') {
        message = "Your identity verification is pending. Please check back later.";
      } else if (reason === 'identity_rejected') {
        message = "Your identity verification was rejected. Please request a review or try again.";
      } else {
        message = "Please verify your identity to sell on the marketplace";
      }
    } else if (reason === 'missing_default_address') {
      message = "Please add a default shipping address to continue";
    }

    throw new ApiError(
      reason || 'profile_incomplete',
      message,
      403,
      {
        redirectUrl,
        missingFields,
        reason,
        isIdentityVerified,
      }
    );
  }

  return authResult;
}
