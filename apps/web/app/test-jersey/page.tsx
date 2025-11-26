'use client'

import { useState } from "react";
import { JerseyCard } from "@/components/jersey/JerseyCard";
import { UploadJersey } from "@/components/jersey/UploadJersey";
import { Button } from "@/components/ui/button";

export default function TestJerseyPage() {
  const [uploadOpen, setUploadOpen] = useState(false);

  // Mock data for testing
  const mockJerseys = [
    {
      id: "1",
      image: "https://via.placeholder.com/300x400",
      club: "Real Madrid",
      season: "2023/24",
      type: "Home",
      player: "Benzema",
      condition: 9,
      isLiked: false,
      isSaved: false,
      forSale: true,
      price: "€150",
    },
    {
      id: "2",
      image: "",
      club: "Manchester United",
      season: "2022-23",
      type: "Away",
      condition: 7,
      isLiked: true,
      isSaved: false,
      forSale: false,
    },
    {
      id: "3",
      image: "https://via.placeholder.com/300x400",
      club: "Barcelona",
      season: "2023/24",
      type: "Third",
      player: "Messi",
      condition: 10,
      isLiked: false,
      isSaved: true,
      forSale: true,
      price: "€200",
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div>
          <h1 className="text-4xl font-bold text-primary mb-4">
            Jersey Components Test
          </h1>
          <p className="text-muted-foreground mb-6">
            Test side for validering af migrerede Jersey komponenter
          </p>
        </div>

        {/* Component Status */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">Component Status</h2>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span>JerseyCard - Imported and rendered</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span>UploadJersey - Imported and rendered</span>
            </div>
          </div>
        </div>

        {/* Test Instructions */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">Test Instructions</h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">1. JerseyCard Test</h3>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                <li>Click på card → Should navigate to `/jersey/[id]`</li>
                <li>Hover states should work (scale, shadow)</li>
                <li>Keyboard navigation: Tab to card, Enter/Space to navigate</li>
                <li>Missing image should show placeholder</li>
                <li>Like/Save buttons should be clickable (stop propagation)</li>
                <li>Condition badge should display</li>
                <li>For Sale badge should display when forSale=true</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">2. UploadJersey Test</h3>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                <li>Click &quot;Open Upload Dialog&quot; → Dialog should open</li>
                <li>Step 1: Upload images (1-10), drag to reorder</li>
                <li>Step 2: Fill required fields (Club, Season, Jersey Type)</li>
                <li>Step 3: Optional player info and badges</li>
                <li>Step 4: Condition rating and visibility</li>
                <li>Validation: Submit without data → Errors should show</li>
                <li>Submit with valid data → Should upload successfully</li>
                <li>Error handling: Test network failure, file too large</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">Quick Actions</h2>
          <div className="flex flex-wrap gap-4">
            <Button
              onClick={() => setUploadOpen(true)}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              Open Upload Dialog
            </Button>
          </div>
        </div>

        {/* JerseyCard Examples */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">JerseyCard Examples</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mockJerseys.map((jersey) => (
              <JerseyCard key={jersey.id} {...jersey} />
            ))}
          </div>
        </div>
      </div>

      {/* UploadJersey Dialog */}
      <UploadJersey
        isOpen={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onSuccess={() => {
          console.log("Jersey uploaded successfully!");
        }}
      />
    </div>
  );
}

