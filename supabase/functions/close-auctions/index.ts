// @ts-nocheck - Deno runtime (TypeScript doesn't understand Deno types)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AuctionWithBids {
  id: string
  jersey_id: string
  seller_id: string
  current_bid: number | null
  starting_bid: number
  ends_at: string
  status: string
  winner_id: string | null
  currency: string
  bids: Array<{
    id: string
    bidder_id: string
    amount: number
    created_at: string
  }>
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    console.log('Checking for expired auctions...')

    // Find all active auctions that have expired
    const { data: expiredAuctions, error: auctionsError } = await supabaseClient
      .from('auctions')
      .select(`
        id,
        jersey_id,
        seller_id,
        current_bid,
        starting_bid,
        ends_at,
        status,
        winner_id,
        currency,
        bids (
          id,
          bidder_id,
          amount,
          created_at
        )
      `)
      .eq('status', 'active')
      .lt('ends_at', new Date().toISOString())
      .returns<AuctionWithBids[]>()

    if (auctionsError) {
      console.error('Error fetching expired auctions:', auctionsError)
      throw auctionsError
    }

    if (!expiredAuctions || expiredAuctions.length === 0) {
      console.log('No expired auctions found')
      return new Response(
        JSON.stringify({ message: 'No expired auctions found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    console.log(`Found ${expiredAuctions.length} expired auctions`)

    const results = []

    for (const auction of expiredAuctions) {
      console.log(`Processing auction ${auction.id}`)

      // Determine winner - highest bid
      let winnerId: string | null = null
      let winningAmount: number | null = null

      if (auction.bids && auction.bids.length > 0) {
        // Sort bids by amount descending to get highest bid
        const sortedBids = [...auction.bids].sort((a, b) => b.amount - a.amount)
        winnerId = sortedBids[0].bidder_id
        winningAmount = sortedBids[0].amount
      }

      // Update auction status
      const { error: updateError } = await supabaseClient
        .from('auctions')
        .update({
          status: winnerId ? 'completed' : 'expired',
          winner_id: winnerId,
          ended_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', auction.id)

      if (updateError) {
        console.error(`Error updating auction ${auction.id}:`, updateError)
        results.push({ auction_id: auction.id, success: false, error: updateError.message })
        continue
      }

      // If there's a winner, create transaction with fee breakdown
      if (winnerId && winningAmount) {
        // Calculate fees using FeeService logic
        // Note: winningAmount is in major units (EUR), convert to cents
        const itemCents = Math.round(winningAmount * 100)
        
        // Get active fee percentages (defaults: 5% platform, 1% seller)
        // Since we're in Deno edge function, we'll calculate directly
        // Platform fee: 5% of item
        const platformFeeCents = Math.round((itemCents * 5.0) / 100)
        // Seller fee: 1% of item
        const sellerFeeCents = Math.round((itemCents * 1.0) / 100)
        // Seller payout: item - seller fee
        const sellerPayoutCents = itemCents - sellerFeeCents
        
        // For auctions: shipping_amount and total_amount are NULL until winner checkout
        // amount (legacy) = item_amount (cents) until total_amount is set
        const { error: transactionError } = await supabaseClient
          .from('transactions')
          .insert({
            listing_id: auction.id,
            listing_type: 'auction',
            buyer_id: winnerId,
            seller_id: auction.seller_id,
            amount: itemCents, // Legacy field = item_amount until total_amount is set
            currency: auction.currency,
            status: 'pending',
            // Fee breakdown fields (HUD-37)
            item_amount: itemCents,
            platform_fee_amount: platformFeeCents,
            seller_fee_amount: sellerFeeCents,
            seller_payout_amount: sellerPayoutCents,
            // shipping_amount and total_amount are NULL until winner checkout/shipping selected
            shipping_amount: null,
            total_amount: null
          })

        if (transactionError) {
          console.error(`Error creating transaction for auction ${auction.id}:`, transactionError)
        }

        // Create notification for winner
        await supabaseClient
          .from('notifications')
          .insert({
            user_id: winnerId,
            type: 'auction_won',
            title: 'You won an auction!',
            message: `Congratulations! You won the auction with a bid of ${winningAmount} ${auction.currency}.`,
            related_jersey_id: auction.jersey_id,
            related_auction_id: auction.id
          })

        // Create notification for seller
        await supabaseClient
          .from('notifications')
          .insert({
            user_id: auction.seller_id,
            type: 'item_sold',
            title: 'Your jersey sold!',
            message: `Your jersey auction ended successfully with a winning bid of ${winningAmount} ${auction.currency}.`,
            related_jersey_id: auction.jersey_id,
            related_auction_id: auction.id
          })

        console.log(`Auction ${auction.id} completed with winner ${winnerId}`)
      } else {
        // Create notification for seller - no bids
        await supabaseClient
          .from('notifications')
          .insert({
            user_id: auction.seller_id,
            type: 'auction_ended',
            title: 'Auction ended',
            message: 'Your jersey auction ended without any bids.',
            related_jersey_id: auction.jersey_id,
            related_auction_id: auction.id
          })

        console.log(`Auction ${auction.id} expired with no bids`)
      }

      results.push({ 
        auction_id: auction.id, 
        success: true, 
        winner_id: winnerId,
        winning_amount: winningAmount 
      })
    }

    console.log('Auction closure process completed:', results)

    return new Response(
      JSON.stringify({ 
        message: 'Auction closure process completed',
        processed: results.length,
        results 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('Error in close-auctions function:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})