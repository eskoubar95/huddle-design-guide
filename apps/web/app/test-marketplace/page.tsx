'use client'

import { useState } from "react";
import { CreateSaleListing } from "@/components/marketplace/CreateSaleListing";
import { CreateAuction } from "@/components/marketplace/CreateAuction";
import { PlaceBid } from "@/components/marketplace/PlaceBid";
import { CountdownTimer } from "@/components/marketplace/CountdownTimer";
import { Button } from "@/components/ui/button";

export default function TestMarketplacePage() {
  const [saleListingOpen, setSaleListingOpen] = useState(false);
  const [auctionOpen, setAuctionOpen] = useState(false);
  const [placeBidOpen, setPlaceBidOpen] = useState(false);

  // Mock data for testing
  const mockJerseyId = "123e4567-e89b-12d3-a456-426614174000";
  const mockAuctionId = "123e4567-e89b-12d3-a456-426614174001";
  const mockCurrentBid = 150.50;
  const mockStartingBid = 100.00;
  
  // Mock auction end time (1 hour from now)
  const mockEndsAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

  return (
    <div className="min-h-screen bg-background text-foreground p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div>
          <h1 className="text-4xl font-bold text-primary mb-4">
            Marketplace Components Test
          </h1>
          <p className="text-muted-foreground mb-6">
            Test side for validering af migrerede Marketplace komponenter
          </p>
        </div>

        {/* Component Status */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">Component Status</h2>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span>CreateSaleListing - Imported and rendered</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span>CreateAuction - Imported and rendered</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span>PlaceBid - Imported and rendered</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span>CountdownTimer - Imported and rendered</span>
            </div>
          </div>
        </div>

        {/* Test Instructions */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">Test Instructions</h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">1. CreateSaleListing Test</h3>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                <li>Click &quot;Open Create Sale Listing&quot; → Dialog should open</li>
                <li>Validation: Submit without price → Error should show</li>
                <li>Validation: Submit with price ≤ 0 → Error should show</li>
                <li>Submit with valid data → Listing created, success message</li>
                <li>Error: Jersey already listed → Error message shows</li>
                <li>Form data preserved on error</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">2. CreateAuction Test</h3>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                <li>Click &quot;Open Create Auction&quot; → Dialog should open</li>
                <li>Validation: Invalid duration → Error should show</li>
                <li>Validation: Starting bid ≤ 0 → Error should show</li>
                <li>Submit with valid data → Auction created, success message</li>
                <li>Error handling works correctly</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">3. PlaceBid Test</h3>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                <li>Click &quot;Open Place Bid&quot; → Dialog should open</li>
                <li>Validation: Bid too low → Error should show</li>
                <li>Validation: Auction ended → Error should show</li>
                <li>Submit with valid bid → Bid placed, success message</li>
                <li>Error: Outbid during submission → Error shows, refresh</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">4. CountdownTimer Test</h3>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                <li>Timer displays correctly</li>
                <li>Countdown updates every second</li>
                <li>ARIA live region announces updates</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">Quick Actions</h2>
          <div className="flex flex-wrap gap-4">
            <Button
              onClick={() => setSaleListingOpen(true)}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              Open Create Sale Listing
            </Button>
            <Button
              onClick={() => setAuctionOpen(true)}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              Open Create Auction
            </Button>
            <Button
              onClick={() => setPlaceBidOpen(true)}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              Open Place Bid
            </Button>
          </div>
        </div>

        {/* CountdownTimer Example */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">CountdownTimer Example</h2>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">Auction ending in:</p>
              <CountdownTimer endsAt={mockEndsAt} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-2">Expired auction:</p>
              <CountdownTimer endsAt={new Date(Date.now() - 1000).toISOString()} />
            </div>
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <CreateSaleListing
        isOpen={saleListingOpen}
        onClose={() => setSaleListingOpen(false)}
        jerseyId={mockJerseyId}
        onSuccess={() => {
          console.log("Sale listing created successfully!");
        }}
      />

      <CreateAuction
        isOpen={auctionOpen}
        onClose={() => setAuctionOpen(false)}
        jerseyId={mockJerseyId}
        onSuccess={() => {
          console.log("Auction created successfully!");
        }}
      />

      <PlaceBid
        isOpen={placeBidOpen}
        onClose={() => setPlaceBidOpen(false)}
        auctionId={mockAuctionId}
        currentBid={mockCurrentBid}
        startingBid={mockStartingBid}
        onSuccess={() => {
          console.log("Bid placed successfully!");
        }}
      />
    </div>
  );
}

