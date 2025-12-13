import { NextRequest } from "next/server";
import { rateLimitMiddleware } from "@/lib/api/rate-limit";
import { handleApiError, ApiError } from "@/lib/api/errors";
import { successResponse } from "@/lib/api/responses";
import { requireAuth } from "@/lib/auth";
import { profileCompletionSchema } from "@/lib/validation/profile-schemas";

/**
 * POST /api/v1/profile/complete
 * Complete user profile with required fields + shipping address
 */
const handler = async (req: NextRequest) => {
  try {
    const { userId } = await requireAuth(req);
    const body = await req.json();

    // Validate input
    const validated = profileCompletionSchema.parse(body);

    const { createServiceClient } = await import("@/lib/supabase/server");
    const supabase = await createServiceClient();

    // Update profile with personal information
    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        first_name: validated.firstName,
        last_name: validated.lastName,
        phone: validated.phone,
      })
      .eq("id", userId);

    if (profileError) {
      throw new ApiError(
        "INTERNAL_SERVER_ERROR",
        "Failed to update profile",
        500,
        { details: profileError.message }
      );
    }

    // Check if user already has a default shipping address
    const { data: existingDefault } = await supabase
      .from("shipping_addresses")
      .select("id")
      .eq("user_id", userId)
      .eq("is_default", true)
      .single();

    // If user has existing default and we're adding a new one, unset the old default
    if (existingDefault && validated.shippingAddress.isDefault !== false) {
      await supabase
        .from("shipping_addresses")
        .update({ is_default: false })
        .eq("id", existingDefault.id);
    }

    // Insert shipping address (set as default if it's the first one or explicitly requested)
    const isDefault = validated.shippingAddress.isDefault ?? !existingDefault;

    const { error: addressError } = await supabase
      .from("shipping_addresses")
      .insert({
        user_id: userId,
        full_name: validated.shippingAddress.fullName,
        street: validated.shippingAddress.street,
        city: validated.shippingAddress.city,
        postal_code: validated.shippingAddress.postalCode,
        country: validated.shippingAddress.country,
        phone: validated.shippingAddress.phone,
        is_default: isDefault,
      });

    if (addressError) {
      throw new ApiError(
        "INTERNAL_SERVER_ERROR",
        "Failed to save shipping address",
        500,
        { details: addressError.message }
      );
    }

    // Return success with updated profile status
    const { ProfileValidationService } = await import("@/lib/services/profile-validation-service");
    const validationService = new ProfileValidationService();
    const completeness = await validationService.getProfileCompleteness(userId);

    return successResponse({
      success: true,
      message: "Profile completed successfully",
      completeness,
    });
  } catch (error) {
    return handleApiError(error, req);
  }
};

export const POST = rateLimitMiddleware(handler);
