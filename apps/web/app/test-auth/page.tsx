'use client'

import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export default function TestAuthPage() {
  const { user, session, loading, signOut } = useAuth();

  const handleSignIn = async () => {
    // For testing - you can implement actual sign in flow here
    const supabase = createClient();
    console.log("Sign in clicked - implement sign in flow", supabase);
  };

  return (
    <div className="container mx-auto p-8 max-w-2xl">
      <h1 className="text-4xl font-bold mb-8">AuthContext Test Page</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Auth State</CardTitle>
          <CardDescription>Test AuthContext integration</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium mb-2">Loading State:</p>
            <p className="text-lg">{loading ? "⏳ Loading..." : "✅ Loaded"}</p>
          </div>

          <div>
            <p className="text-sm font-medium mb-2">User:</p>
            {user ? (
              <div className="space-y-2">
                <p className="text-lg">✅ Authenticated</p>
                <p className="text-sm text-muted-foreground">Email: {user.email}</p>
                <p className="text-sm text-muted-foreground">ID: {user.id}</p>
              </div>
            ) : (
              <p className="text-lg">❌ Not authenticated</p>
            )}
          </div>

          <div>
            <p className="text-sm font-medium mb-2">Session:</p>
            {session ? (
              <div className="space-y-2">
                <p className="text-lg">✅ Active session</p>
                <p className="text-sm text-muted-foreground">
                  Expires: {new Date(session.expires_at! * 1000).toLocaleString()}
                </p>
              </div>
            ) : (
              <p className="text-lg">❌ No session</p>
            )}
          </div>

          <div className="flex gap-4 pt-4">
            {user ? (
              <Button onClick={signOut} variant="destructive">
                Sign Out
              </Button>
            ) : (
              <Button onClick={handleSignIn}>
                Sign In (Test)
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Type Safety Test</CardTitle>
          <CardDescription>Verify IntelliSense types</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p>✅ user: User | null</p>
            <p>✅ session: Session | null</p>
            <p>✅ loading: boolean</p>
            <p>✅ signOut: () =&gt; Promise&lt;void&gt;</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

