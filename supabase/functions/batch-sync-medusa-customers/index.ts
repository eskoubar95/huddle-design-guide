/**
 * batch-sync-medusa-customers Edge Function
 * 
 * Syncs ALL customers from Huddle to Medusa.
 * Can be triggered manually or via cron job.
 * 
 * Features:
 * - Iterates over all profiles with medusa_customer_id
 * - Checks if data has changed before syncing
 * - Returns summary of synced/skipped customers
 * 
 * Usage:
 * - Manual: POST /functions/v1/batch-sync-medusa-customers
 * - Cron: Schedule via pg_cron or Supabase Dashboard
 * 
 * Related: HUD-39 Phase 7
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

interface SyncResult {
  userId: string
  customerId: string
  profileSynced: boolean
  addressSynced: boolean
  error?: string
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  const startTime = Date.now()
  const results: SyncResult[] = []
  let processed = 0
  let synced = 0
  let skipped = 0
  let errors = 0

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    console.log("[BATCH-SYNC] Starting batch sync of all customers...")
    
    // 1. Get all profiles with medusa_customer_id
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, medusa_customer_id, first_name, last_name, phone")
      .not("medusa_customer_id", "is", null)
    
    if (profilesError) {
      throw new Error(`Failed to fetch profiles: ${profilesError.message}`)
    }
    
    console.log(`[BATCH-SYNC] Found ${profiles?.length || 0} customers to sync`)
    
    if (!profiles || profiles.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "No customers to sync",
          stats: { processed: 0, synced: 0, skipped: 0, errors: 0 }
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }
    
    // 2. Process each profile
    for (const profile of profiles) {
      processed++
      const result: SyncResult = {
        userId: profile.id,
        customerId: profile.medusa_customer_id,
        profileSynced: false,
        addressSynced: false,
      }
      
      try {
        // Get current Medusa customer
        const { data: medusaCustomer } = await supabase
          .from("customer")
          .select("id, first_name, last_name, phone")
          .eq("id", profile.medusa_customer_id)
          .schema("medusa")
          .single()
        
        // Check if profile needs sync
        const profileNeedsSync = !medusaCustomer ||
          medusaCustomer.first_name !== (profile.first_name || null) ||
          medusaCustomer.last_name !== (profile.last_name || null) ||
          medusaCustomer.phone !== (profile.phone || null)
        
        if (profileNeedsSync) {
          const { error: updateError } = await supabase.rpc("update_medusa_customer", {
            p_customer_id: profile.medusa_customer_id,
            p_email: null,
            p_first_name: profile.first_name || null,
            p_last_name: profile.last_name || null,
            p_phone: profile.phone || null,
          })
          
          if (!updateError) {
            result.profileSynced = true
          }
        }
        
        // Get default shipping address
        const { data: address } = await supabase
          .from("shipping_addresses")
          .select("full_name, street, address_line_2, city, state, postal_code, country, phone")
          .eq("user_id", profile.id)
          .eq("is_default", true)
          .single()
        
        if (address) {
          // Get current Medusa address
          const { data: medusaAddress } = await supabase
            .from("customer_address")
            .select("first_name, last_name, address_1, address_2, city, province, postal_code, country_code, phone")
            .eq("customer_id", profile.medusa_customer_id)
            .eq("is_default_shipping", true)
            .schema("medusa")
            .single()
          
          const nameParts = (address.full_name || "").split(" ")
          const firstName = nameParts[0] || null
          const lastName = nameParts.slice(1).join(" ") || null
          const countryCode = (address.country || "").toUpperCase() || null
          
          const addressNeedsSync = !medusaAddress ||
            medusaAddress.first_name !== firstName ||
            medusaAddress.last_name !== lastName ||
            medusaAddress.address_1 !== (address.street || null) ||
            medusaAddress.address_2 !== (address.address_line_2 || null) ||
            medusaAddress.city !== (address.city || null) ||
            medusaAddress.province !== (address.state || null) ||
            medusaAddress.postal_code !== (address.postal_code || null) ||
            medusaAddress.country_code !== countryCode ||
            medusaAddress.phone !== (address.phone || null)
          
          if (addressNeedsSync) {
            const { error: addressError } = await supabase.rpc("sync_medusa_customer_address", {
              p_customer_id: profile.medusa_customer_id,
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
            
            if (!addressError) {
              result.addressSynced = true
            }
          }
        }
        
        if (result.profileSynced || result.addressSynced) {
          synced++
        } else {
          skipped++
        }
        
      } catch (err) {
        result.error = err instanceof Error ? err.message : "Unknown error"
        errors++
      }
      
      results.push(result)
    }
    
    const duration = Date.now() - startTime
    
    console.log(`[BATCH-SYNC] Completed in ${duration}ms: ${synced} synced, ${skipped} skipped, ${errors} errors`)
    
    return new Response(
      JSON.stringify({ 
        success: true,
        stats: {
          processed,
          synced,
          skipped,
          errors,
          durationMs: duration,
        },
        results: results.filter(r => r.profileSynced || r.addressSynced || r.error), // Only include changed/errored
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
    
  } catch (error) {
    console.error("[BATCH-SYNC] Error:", error)
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
        stats: { processed, synced, skipped, errors }
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    )
  }
})

