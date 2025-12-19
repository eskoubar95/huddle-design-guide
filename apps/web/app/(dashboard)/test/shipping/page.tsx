'use client'

/**
 * Test page for ShippingMethodSelector component
 * 
 * Access at: /test/shipping
 * 
 * This page allows you to test the ShippingMethodSelector component
 * with different configurations.
 */

import { useState } from 'react'
import { ShippingMethodSelector } from '@/components/checkout/ShippingMethodSelector'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'

export default function ShippingTestPage() {
  const { toast } = useToast()
  const [selectedOption, setSelectedOption] = useState<any>(null)
  
  // Test data - you can modify these
  const [listingId, setListingId] = useState<string>('')
  const [auctionId, setAuctionId] = useState<string>('')
  const [shippingAddress, setShippingAddress] = useState({
    street: 'Rosenborggade 1',
    city: 'Copenhagen',
    postal_code: '1130',
    country: 'DK',
    state: '',
  })
  const [serviceType, setServiceType] = useState<'home_delivery' | 'pickup_point'>('home_delivery')

  const handleSelect = (option: any) => {
    setSelectedOption(option)
    toast({
      title: 'Shipping option selected',
      description: `${option.name} - €${(option.price / 100).toFixed(2)}`,
    })
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Shipping Method Selector Test</CardTitle>
          <CardDescription>
            Test the ShippingMethodSelector component with different configurations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Configuration */}
          <div className="space-y-4 p-4 bg-muted rounded-lg">
            <h3 className="font-semibold">Configuration</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="listingId">Listing ID (optional)</Label>
                <Input
                  id="listingId"
                  value={listingId}
                  onChange={(e) => setListingId(e.target.value)}
                  placeholder="UUID of listing"
                />
              </div>
              
              <div>
                <Label htmlFor="auctionId">Auction ID (optional)</Label>
                <Input
                  id="auctionId"
                  value={auctionId}
                  onChange={(e) => setAuctionId(e.target.value)}
                  placeholder="UUID of auction"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="street">Street</Label>
                <Input
                  id="street"
                  value={shippingAddress.street}
                  onChange={(e) => setShippingAddress({ ...shippingAddress, street: e.target.value })}
                />
              </div>
              
              <div>
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={shippingAddress.city}
                  onChange={(e) => setShippingAddress({ ...shippingAddress, city: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="postal_code">Postal Code</Label>
                <Input
                  id="postal_code"
                  value={shippingAddress.postal_code}
                  onChange={(e) => setShippingAddress({ ...shippingAddress, postal_code: e.target.value })}
                />
              </div>
              
              <div>
                <Label htmlFor="country">Country (ISO 2-letter)</Label>
                <Input
                  id="country"
                  value={shippingAddress.country}
                  onChange={(e) => setShippingAddress({ ...shippingAddress, country: e.target.value.toUpperCase() })}
                  placeholder="DK, DE, FR, etc."
                  maxLength={2}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="serviceType">Service Type</Label>
              <div className="flex gap-4 mt-2">
                <Button
                  variant={serviceType === 'home_delivery' ? 'default' : 'outline'}
                  onClick={() => setServiceType('home_delivery')}
                >
                  Home Delivery
                </Button>
                <Button
                  variant={serviceType === 'pickup_point' ? 'default' : 'outline'}
                  onClick={() => setServiceType('pickup_point')}
                >
                  Pickup Point
                </Button>
              </div>
            </div>
          </div>

          {/* Component */}
          <div className="p-4 border rounded-lg">
            <h3 className="font-semibold mb-4">ShippingMethodSelector Component</h3>
            <ShippingMethodSelector
              listingId={listingId || undefined}
              auctionId={auctionId || undefined}
              shippingAddress={shippingAddress}
              serviceType={serviceType}
              onSelect={handleSelect}
              selectedOptionId={selectedOption?.id}
            />
          </div>

          {/* Selected Option Display */}
          {selectedOption && (
            <div className="p-4 bg-primary/10 rounded-lg">
              <h3 className="font-semibold mb-2">Selected Option</h3>
              <pre className="text-sm overflow-auto">
                {JSON.stringify(selectedOption, null, 2)}
              </pre>
            </div>
          )}

          {/* Instructions */}
          <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
            <h3 className="font-semibold mb-2">Testing Instructions</h3>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li><strong>Required:</strong> Fill in a valid listing ID or auction ID (from your database)</li>
              <li><strong>Required:</strong> Enter a shipping address (country must be valid ISO 2-letter code like DK, DE, FR)</li>
              <li>Select service type (home_delivery or pickup_point)</li>
              <li>Component will fetch shipping options and display them</li>
              <li>Select an option to see the callback data</li>
              <li>Check browser console for any errors</li>
            </ul>
            <div className="mt-3 p-2 bg-yellow-50 dark:bg-yellow-950 rounded text-sm">
              <p className="font-medium">Note:</p>
              <p className="text-xs mt-1">
                If you see "No shipping options available", it might be because:
                <br />• Eurosender sandbox API key required (add EUROSENDER_API_KEY to .env.local)
                <br />• No Medusa shipping options configured yet
                <br />• Shipping not available to the selected country
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

