/**
 * sync-medusa-customer Edge Function
 * 
 * Syncs customer data from Huddle (profiles + shipping_addresses) to Medusa.
 * Triggered by database webhook on profiles/shipping_addresses updates.
 * 
 * Features:
 * - Checks if data has changed before syncing (avoids unnecessary updates)
 * - Syncs first_name, last_name, phone → medusa.customer
 * - Syncs default shipping address → medusa.customer_address
 * 
 * Related: HUD-39 Phase 7
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

interface WebhookPayload {
  type: "INSERT" | "UPDATE" | "DELETE"
  table: string
  schema: string
  record: Record<string, unknown>
  old_record: Record<string, unknown> | null
}

interface MedusaCustomer {
  id: string
  email: string | null
  first_name: string | null
  last_name: string | null
  phone: string | null
}

interface MedusaAddress {
  id: string
  first_name: string | null
  last_name: string | null
  address_1: string | null
  address_2: string | null
  city: string | null
  province: string | null
  postal_code: string | null
  country_code: string | null
  phone: string | null
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    const payload: WebhookPayload = await req.json()
    console.log(`[SYNC-CUSTOMER] Received ${payload.type} on ${payload.table}`)
    
    if (payload.type === "DELETE") {
      return new Response(JSON.stringify({ message: "Skipping DELETE" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }
    
    // Determine user ID based on table
    let userId: string
    if (payload.table === "profiles") {
      userId = payload.record.id as string
    } else if (payload.table === "shipping_addresses") {
      userId = payload.record.user_id as string
    } else {
      return new Response(JSON.stringify({ error: "Unknown table" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }
    
    if (!userId) {
      return new Response(JSON.stringify({ error: "No user ID found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }
    
    console.log(`[SYNC-CUSTOMER] Processing user: ${userId}`)
    
    // 1. Get Huddle profile data
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("medusa_customer_id, first_name, last_name, phone")
      .eq("id", userId)
      .single()
    
    if (profileError || !profile) {
      console.error("[SYNC-CUSTOMER] Profile not found:", profileError)
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }
    
    if (!profile.medusa_customer_id) {
      console.log("[SYNC-CUSTOMER] No Medusa customer ID, skipping sync")
      return new Response(JSON.stringify({ message: "No Medusa customer ID" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }
    
    const customerId = profile.medusa_customer_id as string
    
    // 2. Get current Medusa customer data for comparison
    const { data: medusaCustomers } = await supabase
      .from("customer")
      .select("id, email, first_name, last_name, phone")
      .eq("id", customerId)
      .schema("medusa")
      .single()
    
    const currentCustomer = medusaCustomers as MedusaCustomer | null
    
    // 3. Check if profile data needs sync
    let profileSynced = false
    const profileNeedsSync = !currentCustomer || 
      currentCustomer.first_name !== (profile.first_name || null) ||
      currentCustomer.last_name !== (profile.last_name || null) ||
      currentCustomer.phone !== (profile.phone || null)
    
    if (profileNeedsSync) {
      console.log("[SYNC-CUSTOMER] Profile data changed, syncing...")
      const { error: updateError } = await supabase.rpc("update_medusa_customer", {
        p_customer_id: customerId,
        p_email: null,
        p_first_name: profile.first_name || null,
        p_last_name: profile.last_name || null,
        p_phone: profile.phone || null,
      })
      
      if (updateError) {
        console.error("[SYNC-CUSTOMER] Failed to update customer:", updateError)
      } else {
        console.log("[SYNC-CUSTOMER] Profile synced successfully")
        profileSynced = true
      }
    } else {
      console.log("[SYNC-CUSTOMER] Profile data unchanged, skipping")
    }
    
    // 4. Get default shipping address from Huddle
    const { data: address } = await supabase
      .from("shipping_addresses")
      .select("full_name, street, address_line_2, city, state, postal_code, country, phone")
      .eq("user_id", userId)
      .eq("is_default", true)
      .single()
    
    let addressSynced = false
    
    if (address) {
      // 5. Get current Medusa address for comparison
      const { data: medusaAddresses } = await supabase
        .from("customer_address")
        .select("id, first_name, last_name, address_1, address_2, city, province, postal_code, country_code, phone")
        .eq("customer_id", customerId)
        .eq("is_default_shipping", true)
        .schema("medusa")
        .single()
      
      const currentAddress = medusaAddresses as MedusaAddress | null
      
      // Parse name from Huddle address
      const nameParts = (address.full_name || "").split(" ")
      const firstName = nameParts[0] || null
      const lastName = nameParts.slice(1).join(" ") || null
      const countryCode = (address.country || "").toUpperCase() || null
      
      // Check if address data needs sync
      const addressNeedsSync = !currentAddress ||
        currentAddress.first_name !== firstName ||
        currentAddress.last_name !== lastName ||
        currentAddress.address_1 !== (address.street || null) ||
        currentAddress.address_2 !== (address.address_line_2 || null) ||
        currentAddress.city !== (address.city || null) ||
        currentAddress.province !== (address.state || null) ||
        currentAddress.postal_code !== (address.postal_code || null) ||
        currentAddress.country_code !== countryCode ||
        currentAddress.phone !== (address.phone || null)
      
      if (addressNeedsSync) {
        console.log("[SYNC-CUSTOMER] Address data changed, syncing...")
        const { error: addressError } = await supabase.rpc("sync_medusa_customer_address", {
          p_customer_id: customerId,
          p_first_name: firstName,
          p_last_name: lastName,
          p_address_1: address.street || null,
          p_address_2: address.address_line_2 || null,
          p_city: address.city || null,
          p_province: address.state || null,
          p_postal_code: address.postal_code || null,
          p_country_code: countryCode,
          p_phone: address.phone || null,
        })
        
        if (addressError) {
          console.error("[SYNC-CUSTOMER] Failed to sync address:", addressError)
        } else {
          console.log("[SYNC-CUSTOMER] Address synced successfully")
          addressSynced = true
        }
      } else {
        console.log("[SYNC-CUSTOMER] Address data unchanged, skipping")
      }
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        customerId,
        synced: {
          profile: profileSynced,
          address: addressSynced,
        },
        skipped: {
          profile: !profileNeedsSync,
          address: address ? !addressSynced && !profileSynced : true,
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
    
  } catch (error) {
    console.error("[SYNC-CUSTOMER] Error:", error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    )
  }
})
