import { createClerkClient } from "@clerk/backend";
import { createServiceClient } from "@/lib/supabase/server";

const clerk = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY!,
});

// Note: Vi bruger database function i stedet for Medusa API
// da Medusa API authentication ikke virker korrekt i v2

/**
 * Opret eller synkroniser Medusa customer med Clerk user
 * Non-blocking: Logs errors men throw'er ikke (profile creation skal ikke fejle pga. Medusa)
 */
export async function syncMedusaCustomer(clerkUserId: string): Promise<string | null> {
  try {
    // 1. Hent Clerk user data
    const clerkUser = await clerk.users.getUser(clerkUserId);
    
    // 2. Tjek om Medusa customer allerede eksisterer
    const supabase = await createServiceClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("medusa_customer_id")
      .eq("id", clerkUserId)
      .single();

    if (!profile) {
      console.error(`[MEDUSA-SYNC] Profile not found for Clerk user ${clerkUserId}`);
      return null;
    }

    // 3. Hvis Medusa customer ID allerede findes, synkroniser data
    if (profile.medusa_customer_id) {
      await updateMedusaCustomer(profile.medusa_customer_id, clerkUser);
      return profile.medusa_customer_id;
    }

    // 4. Opret ny Medusa customer
    const medusaCustomer = await createMedusaCustomer(clerkUser);

    // 5. Gem Medusa customer ID i profile
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
 * Opret ny Medusa customer direkte i databasen via Supabase function
 * Vi bruger database function fordi Medusa API authentication ikke virker
 * Functionen opretter customer i medusa.customer tabel med SECURITY DEFINER
 */
async function createMedusaCustomer(clerkUser: any): Promise<{ id: string }> {
  const email = clerkUser.emailAddresses[0]?.emailAddress;
  if (!email) {
    throw new Error("Clerk user must have email");
  }

  // Opret customer direkte i medusa.customer tabel via Supabase RPC function
  // Vi bruger create_medusa_customer function (oprettet via migration)
  // Dette virker fordi vi har service role client adgang
  const supabase = await createServiceClient();
  
  const { data: customerId, error } = await (supabase.rpc as unknown as {
    (name: string, args: Record<string, unknown>): Promise<{
      data: string | null;
      error: { code?: string; message: string } | null;
    }>;
  })('create_medusa_customer', {
    p_email: email,
    p_first_name: clerkUser.firstName || null,
    p_last_name: clerkUser.lastName || null,
  });

  if (error) {
    console.error("[MEDUSA-SYNC] Failed to create customer via RPC:", error);
    throw new Error(`Failed to create Medusa customer: ${error.message}`);
  }

  if (!customerId) {
    throw new Error(`Failed to create Medusa customer: No ID returned`);
  }

  return { id: customerId };
}

/**
 * Opdater eksisterende Medusa customer direkte i databasen via Supabase function
 * Vi bruger database function fordi Medusa API authentication ikke virker
 * Functionen opdaterer customer i medusa.customer tabel med SECURITY DEFINER
 */
async function updateMedusaCustomer(customerId: string, clerkUser: any): Promise<void> {
  const email = clerkUser.emailAddresses[0]?.emailAddress;
  if (!email) {
    // Skip hvis ingen email (kan ikke opdatere uden email)
    return;
  }

  const supabase = await createServiceClient();
  
  const { error } = await (supabase.rpc as unknown as {
    (name: string, args: Record<string, unknown>): Promise<{
      data: void | null;
      error: { code?: string; message: string } | null;
    }>;
  })('update_medusa_customer', {
    p_customer_id: customerId,
    p_email: email,
    p_first_name: clerkUser.firstName || null,
    p_last_name: clerkUser.lastName || null,
  });

  if (error) {
    // Log error men throw ikke (non-critical - customer eksisterer allerede)
    console.error("[MEDUSA-SYNC] Failed to update customer via RPC:", error);
  }
}

