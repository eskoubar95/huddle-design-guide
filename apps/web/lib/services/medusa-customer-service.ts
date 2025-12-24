import { createClerkClient, type User } from "@clerk/backend";
import { createServiceClient } from "@/lib/supabase/server";

const clerk = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY!,
});

// Note: Vi bruger database function i stedet for Medusa API
// da Medusa API authentication ikke virker korrekt i v2

// Profile data from Huddle's profiles table
interface HuddleProfile {
  medusa_customer_id: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
}

// Shipping address from Huddle's shipping_addresses table
interface ShippingAddress {
  full_name: string | null;
  street: string;
  address_line_2: string | null;
  city: string;
  state: string | null;
  postal_code: string;
  country: string;
  phone: string | null;
}

/**
 * Opret eller synkroniser Medusa customer med Clerk user + Huddle profile data
 * Non-blocking: Logs errors men throw'er ikke (profile creation skal ikke fejle pga. Medusa)
 * 
 * Syncs:
 * - Email fra Clerk
 * - first_name/last_name fra Huddle profiles (fallback til Clerk)
 * - phone fra Huddle profiles
 * - Default shipping address til medusa.customer_address
 */
export async function syncMedusaCustomer(clerkUserId: string): Promise<string | null> {
  try {
    // 1. Hent Clerk user data
    const clerkUser = await clerk.users.getUser(clerkUserId);
    
    // 2. Hent Huddle profile data (inkl. phone, first_name, last_name)
    const supabase = await createServiceClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("medusa_customer_id, first_name, last_name, phone")
      .eq("id", clerkUserId)
      .single();

    if (!profile) {
      console.error(`[MEDUSA-SYNC] Profile not found for Clerk user ${clerkUserId}`);
      return null;
    }

    // 3. Hent default shipping address (maybeSingle handles no rows gracefully)
    const { data: defaultAddress } = await supabase
      .from("shipping_addresses")
      .select("full_name, street, address_line_2, city, state, postal_code, country, phone")
      .eq("user_id", clerkUserId)
      .eq("is_default", true)
      .maybeSingle();

    // 4. Hvis Medusa customer ID allerede findes, synkroniser data
    if (profile.medusa_customer_id) {
      await updateMedusaCustomerFull(
        profile.medusa_customer_id, 
        clerkUser, 
        profile as HuddleProfile, 
        defaultAddress as ShippingAddress | null
      );
      return profile.medusa_customer_id;
    }

    // 5. Opret ny Medusa customer med alle data
    const medusaCustomer = await createMedusaCustomerFull(
      clerkUser, 
      profile as HuddleProfile, 
      defaultAddress as ShippingAddress | null
    );

    // 6. Gem Medusa customer ID i profile
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ medusa_customer_id: medusaCustomer.id })
      .eq("id", clerkUserId);

    if (updateError) {
      console.error("[MEDUSA-SYNC] Failed to update profile with medusa_customer_id:", updateError);
      // Continue - customer er oprettet i Medusa, kan sync'es senere
    }

    return medusaCustomer.id;
  } catch (error) {
    // Non-blocking: Log error men throw ikke
    console.error("[MEDUSA-SYNC] Failed to sync Medusa customer:", error);
    return null;
  }
}

/**
 * Opret ny Medusa customer med alle data (email, names, phone, address)
 * Uses direct SQL INSERTs via RPC for customer + customer_address
 */
async function createMedusaCustomerFull(
  clerkUser: User, 
  profile: HuddleProfile,
  address: ShippingAddress | null
): Promise<{ id: string }> {
  const email = clerkUser.emailAddresses[0]?.emailAddress;
  if (!email) {
    throw new Error("Clerk user must have email");
  }

  // Use profile names (Huddle) or fallback to Clerk names
  const firstName = profile.first_name || clerkUser.firstName || null;
  const lastName = profile.last_name || clerkUser.lastName || null;
  const phone = profile.phone || null;

  const supabase = await createServiceClient();
  
  // 1. Create customer via RPC
  const { data: customerId, error } = await (supabase.rpc as unknown as {
    (name: string, args: Record<string, unknown>): Promise<{
      data: string | null;
      error: { code?: string; message: string } | null;
    }>;
  })('create_medusa_customer', {
    p_email: email,
    p_first_name: firstName,
    p_last_name: lastName,
  });

  if (error) {
    console.error("[MEDUSA-SYNC] Failed to create customer via RPC:", error);
    throw new Error(`Failed to create Medusa customer: ${error.message}`);
  }

  if (!customerId) {
    throw new Error(`Failed to create Medusa customer: No ID returned`);
  }

  // 2. Update phone on customer via the updated update_medusa_customer RPC (now supports phone)
  if (phone) {
    try {
      await (supabase.rpc as unknown as {
        (name: string, args: Record<string, unknown>): Promise<{
          data: void | null;
          error: { code?: string; message: string } | null;
        }>;
      })('update_medusa_customer', {
        p_customer_id: customerId,
        p_phone: phone,
      });
    } catch (err) {
      console.error("[MEDUSA-SYNC] Failed to update customer phone:", err);
    }
  }

  // 3. Sync shipping address to medusa.customer_address if available
  if (address) {
    await syncMedusaCustomerAddress(customerId, address);
  }

  return { id: customerId };
}

/**
 * Opdater eksisterende Medusa customer med alle data
 */
async function updateMedusaCustomerFull(
  customerId: string, 
  clerkUser: User,
  profile: HuddleProfile,
  address: ShippingAddress | null
): Promise<void> {
  const email = clerkUser.emailAddresses[0]?.emailAddress;
  if (!email) {
    return;
  }

  // Use profile names (Huddle) or fallback to Clerk names
  const firstName = profile.first_name || clerkUser.firstName || null;
  const lastName = profile.last_name || clerkUser.lastName || null;
  const phone = profile.phone || null;

  const supabase = await createServiceClient();
  
  // 1. Update customer base data
  const { error } = await (supabase.rpc as unknown as {
    (name: string, args: Record<string, unknown>): Promise<{
      data: void | null;
      error: { code?: string; message: string } | null;
    }>;
  })('update_medusa_customer', {
    p_customer_id: customerId,
    p_email: email,
    p_first_name: firstName,
    p_last_name: lastName,
    p_phone: phone,
  });

  if (error) {
    console.error("[MEDUSA-SYNC] Failed to update customer via RPC:", error);
  }

  // 3. Sync shipping address
  if (address) {
    await syncMedusaCustomerAddress(customerId, address);
  }
}

/**
 * Sync shipping address to medusa.customer_address table
 * Creates or updates the default shipping address
 */
async function syncMedusaCustomerAddress(
  customerId: string,
  address: ShippingAddress
): Promise<void> {
  const supabase = await createServiceClient();
  
  try {
    // Use RPC to upsert customer address
    await (supabase.rpc as unknown as {
      (name: string, args: Record<string, unknown>): Promise<{
        data: string | null;
        error: { code?: string; message: string } | null;
      }>;
    })('sync_medusa_customer_address', {
      p_customer_id: customerId,
      // Note: Consider storing first_name/last_name separately in shipping_addresses
      // to avoid name parsing issues with multi-part names
      p_first_name: address.full_name?.trim().split(/\s+/)[0] || null,
      p_last_name: address.full_name?.trim().split(/\s+/).slice(1).join(' ') || null,
      p_address_1: address.street,
      p_address_2: address.address_line_2 || null,
      p_city: address.city,
      p_province: address.state || null,
      p_postal_code: address.postal_code,
      p_country_code: address.country?.toUpperCase() || null,
      p_phone: address.phone || null,
    });
  } catch (err) {
    console.error("[MEDUSA-SYNC] Failed to sync customer address:", err);
  }
}

