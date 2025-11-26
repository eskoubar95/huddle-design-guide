'use client'

import { Sidebar } from "@/components/layout/Sidebar";
import { BottomNav } from "@/components/layout/BottomNav";
import { CommandBar } from "@/components/layout/CommandBar";
import { useAuth } from "@/contexts/AuthContext";

export default function TestLayoutPage() {
  const { user, loading } = useAuth();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Layout Components Test Page */}
      <div className="flex">
        {/* Sidebar - should be visible on desktop (lg+) */}
        <Sidebar />

        {/* Main Content Area */}
        <div className="flex-1 lg:pl-64 min-h-screen pb-20 lg:pb-8">
          <div className="container mx-auto p-8 space-y-8">
            <div>
              <h1 className="text-4xl font-bold text-primary mb-4">
                Layout Components Test
              </h1>
              <p className="text-muted-foreground mb-6">
                Test side for validering af migrerede layout komponenter
              </p>
            </div>

            {/* Auth Status */}
            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-2xl font-semibold mb-4">Auth Status</h2>
              <div className="space-y-2">
                <p>
                  <span className="font-medium">Loading:</span>{" "}
                  <span className={loading ? "text-yellow-500" : "text-green-500"}>
                    {loading ? "Yes" : "No"}
                  </span>
                </p>
                <p>
                  <span className="font-medium">User:</span>{" "}
                  <span className={user ? "text-green-500" : "text-muted-foreground"}>
                    {user ? user.email : "Not authenticated"}
                  </span>
                </p>
              </div>
            </div>

            {/* Component Status */}
            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-2xl font-semibold mb-4">Component Status</h2>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span>Sidebar - Imported and rendered</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span>BottomNav - Imported and rendered</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span>CommandBar - Imported and rendered</span>
                </div>
              </div>
            </div>

            {/* Test Instructions */}
            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-2xl font-semibold mb-4">Test Instructions</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">1. Import Test</h3>
                  <p className="text-sm text-muted-foreground">
                    ✅ All components imported successfully (check console for errors)
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">2. Routing Test</h3>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    <li>Click navigation links in Sidebar → URL should change</li>
                    <li>Click navigation links in BottomNav → URL should change</li>
                    <li>Active state should highlight current route</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">3. Supabase Queries Test</h3>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    <li>Sidebar: Unread message count should display (if authenticated)</li>
                    <li>BottomNav: Message count badge should display (if authenticated)</li>
                    <li>CommandBar: Press Cmd/Ctrl+K to open, test search functionality</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">4. Error Handling Test</h3>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    <li>Disconnect network → Check console for error messages</li>
                    <li>Reconnect → Data should refresh automatically</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">5. Performance Test</h3>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    <li>Open React DevTools → Check for memory leaks</li>
                    <li>Unmount components → Subscriptions should cleanup</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">6. Accessibility Test</h3>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    <li>Tab navigation should work through all links</li>
                    <li>Focus states should be visible</li>
                    <li>Screen reader should announce active nav item</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-2xl font-semibold mb-4">Quick Actions</h2>
              <div className="flex flex-wrap gap-4">
                <button
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent("openCommandBar"));
                  }}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Open CommandBar (Cmd/Ctrl+K)
                </button>
                <button
                  onClick={() => {
                    console.log("Test: All layout components loaded");
                    console.log("Sidebar:", Sidebar);
                    console.log("BottomNav:", BottomNav);
                    console.log("CommandBar:", CommandBar);
                  }}
                  className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-colors"
                >
                  Log Component Status
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* BottomNav - should be visible on mobile (lg:hidden) */}
      <BottomNav />

      {/* CommandBar - always available via Cmd/Ctrl+K */}
      <CommandBar />
    </div>
  );
}

