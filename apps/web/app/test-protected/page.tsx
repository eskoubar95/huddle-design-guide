'use client'

import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

export default function TestProtectedPage() {
  const { user, loading } = useAuth();

  return (
    <div className="min-h-screen bg-background text-foreground p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div>
          <h1 className="text-4xl font-bold text-primary mb-4">
            ProtectedRoute Component Test
          </h1>
          <p className="text-muted-foreground mb-6">
            Test side for validering af migreret ProtectedRoute komponent
          </p>
        </div>

        {/* Component Status */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">Component Status</h2>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span>ProtectedRoute - Imported and rendered</span>
            </div>
          </div>
        </div>

        {/* Auth Status */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">Current Auth Status</h2>
          <div className="space-y-2">
            <p className="text-sm">
              <span className="font-medium">Loading:</span> {loading ? "Yes" : "No"}
            </p>
            <p className="text-sm">
              <span className="font-medium">User:</span> {user ? user.email : "Not authenticated"}
            </p>
            <p className="text-sm">
              <span className="font-medium">User ID:</span> {user?.id || "N/A"}
            </p>
          </div>
        </div>

        {/* Protected Content */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">Protected Content</h2>
          <p className="text-sm text-muted-foreground mb-4">
            The content below is wrapped in ProtectedRoute. If you are not authenticated, you should be redirected to /auth.
          </p>
          <ProtectedRoute>
            <div className="p-6 bg-success/10 border border-success/30 rounded-lg">
              <h3 className="text-lg font-semibold text-success mb-2">
                ✅ Protected Content Rendered
              </h3>
              <p className="text-sm text-muted-foreground">
                This content is only visible to authenticated users. If you can see this, the ProtectedRoute is working correctly!
              </p>
              <div className="mt-4 space-y-2">
                <p className="text-sm">
                  <span className="font-medium">User Email:</span> {user?.email}
                </p>
                <p className="text-sm">
                  <span className="font-medium">User ID:</span> {user?.id}
                </p>
              </div>
            </div>
          </ProtectedRoute>
        </div>

        {/* Test Instructions */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">Test Instructions</h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">1. Authentication Test</h3>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                <li>If authenticated: Protected content should be visible</li>
                <li>If not authenticated: Should redirect to /auth</li>
                <li>Check browser console for any errors</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">2. Loading State Test</h3>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                <li>During initial load: Spinner should show with "Loading..." text</li>
                <li>Loading state should be announced to screen readers</li>
                <li>After loading: Content should render or redirect should happen</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">3. Redirect Test</h3>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                <li>Sign out → Should redirect to /auth</li>
                <li>Redirect should happen quickly</li>
                <li>No flash of protected content before redirect</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">4. Accessibility Test</h3>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                <li>Loading state is announced (aria-live="polite")</li>
                <li>Spinner has aria-label="Loading"</li>
                <li>Keyboard navigation works</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

