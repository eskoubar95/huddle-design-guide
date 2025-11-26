'use client'

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

const loginSchema = z.object({
  email: z.string().trim().email({ message: "Invalid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
});

const signupSchema = z.object({
  username: z.string().trim().min(3, { message: "Username must be at least 3 characters" }).max(20, { message: "Username must be less than 20 characters" }),
  email: z.string().trim().email({ message: "Invalid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [username, setUsername] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      router.push("/");
    }
  }, [user, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const validated = loginSchema.parse({ email, password });
      setIsSubmitting(true);

      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: validated.email,
        password: validated.password,
      });

      if (error) {
        // Handle specific Supabase auth errors
        if (error.message.includes("Invalid login credentials")) {
          toast({
            title: "Login Failed",
            description: "Invalid email or password",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Login Failed",
            description: error.message,
            variant: "destructive",
          });
        }
        return;
      }

      if (data.user) {
        toast({
          title: "Welcome back!",
          description: "You've successfully logged in",
        });
        router.push("/");
      }
    } catch (error) {
      // Handle validation errors
      if (error instanceof z.ZodError) {
        const firstError = error.issues[0];
        toast({
          title: "Validation Error",
          description: firstError.message,
          variant: "destructive",
        });
      } else {
        // Unexpected errors
        console.error("Login error:", error);
        toast({
          title: "Error",
          description: "An unexpected error occurred. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const validated = signupSchema.parse({ username, email, password, confirmPassword });
      setIsSubmitting(true);

      const supabase = createClient();
      
      // Pre-validate username uniqueness before signup (only if profiles table exists)
      // If table doesn't exist (PGRST205), skip pre-check and rely on post-check
      const { data: existingProfile, error: checkError } = await supabase
        .from("profiles")
        .select("username")
        .eq("username", validated.username)
        .maybeSingle();

      // If table doesn't exist, skip pre-check (migrations not run yet)
      if (checkError && checkError.code === "PGRST205") {
        console.warn("Profiles table not found - skipping username pre-check. Migrations may not be applied.");
        // Continue with signup - will catch username conflict in post-check
      } else if (checkError && checkError.code !== "PGRST116") {
        // Other error (not "not found")
        console.warn("Error checking username availability:", checkError);
        // Continue anyway - will catch in post-check
      } else if (existingProfile) {
        // Username already exists
        toast({
          title: "Username Taken",
          description: "This username is already in use. Please choose another.",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email: validated.email,
        password: validated.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            username: validated.username,
          },
        },
      });

      if (error) {
        if (error.message.includes("User already registered")) {
          toast({
            title: "Account Exists",
            description: "An account with this email already exists. Please log in instead.",
            variant: "destructive",
          });
          // Switch to login tab
          setIsLogin(true);
        } else if (error.message.includes("duplicate key") || error.message.includes("unique constraint") || error.message.includes("username")) {
          // Database constraint error (username already exists)
          toast({
            title: "Username Taken",
            description: "This username is already in use. Please choose another.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Signup Failed",
            description: error.message,
            variant: "destructive",
          });
        }
        return;
      }

      if (data.user) {
        // Wait a moment for trigger to create profile, then verify it was created
        // If username was duplicate, trigger will fail and profile won't exist
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const { data: profileCheck, error: profileError } = await supabase
          .from("profiles")
          .select("username")
          .eq("id", data.user.id)
          .maybeSingle();

        // If profile doesn't exist, check why
        if (!profileCheck) {
          // If table doesn't exist, that's a migration issue - continue anyway
          if (profileError && profileError.code === "PGRST205") {
            console.warn("Profiles table not found - migrations may not be applied. User created but profile not created.");
            // Continue - user account is created, profile will be created when migrations run
          } else if (profileError) {
            // Profile should exist but doesn't - might be username conflict
            // Check if username already exists (trigger failed due to duplicate)
            const { data: existingUsername, error: usernameCheckError } = await supabase
              .from("profiles")
              .select("username")
              .eq("username", validated.username)
              .maybeSingle();

            // Only show error if table exists and username is taken
            if (!usernameCheckError && existingUsername) {
              // Username was duplicate - trigger failed
              toast({
                title: "Username Taken",
                description: "This username is already in use. Please choose another.",
                variant: "destructive",
              });
              // Sign out the user since account creation partially failed
              await supabase.auth.signOut();
              setIsSubmitting(false);
              return;
            }
          }
        }

        // Check if email is verified
        if (!data.user.email_confirmed_at) {
          // Email not verified - Supabase may have logged them in automatically
          // Show message and don't redirect
          toast({
            title: "Verification Email Sent",
            description: "Please check your email to verify your account. You can sign in after verification.",
          });
          // Switch to login tab so user can try logging in after verification
          setIsLogin(true);
          // Clear form
          setEmail("");
          setPassword("");
          setConfirmPassword("");
          setUsername("");
          // Don't redirect - let them stay on auth page
        } else {
          // Email already verified - proceed normally
          toast({
            title: "Account Created!",
            description: "Welcome to Huddle! Your account has been created.",
          });
          router.push("/");
        }
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstError = error.issues[0];
        toast({
          title: "Validation Error",
          description: firstError.message,
          variant: "destructive",
        });
      } else {
        console.error("Signup error:", error);
        toast({
          title: "Error",
          description: "An unexpected error occurred. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background to-secondary">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">Huddle</h1>
          <p className="text-muted-foreground">Jersey Collection Community</p>
        </div>

        {/* Auth Card */}
        <div className="bg-card rounded-lg border border-border p-6 shadow-lg">
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2 text-sm font-medium border-b-2 transition-colors ${
                isLogin
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Log In
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2 text-sm font-medium border-b-2 transition-colors ${
                !isLogin
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Sign Up
            </button>
          </div>

          {isLogin ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label htmlFor="login-email">Email</Label>
                <Input
                  id="login-email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-2"
                  required
                />
              </div>

              <div>
                <Label htmlFor="login-password">Password</Label>
                <Input
                  id="login-password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-2"
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Logging in..." : "Log In"}
              </Button>

              <button
                type="button"
                className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Forgot password?
              </button>
            </form>
          ) : (
            <form onSubmit={handleSignup} className="space-y-4">
              <div>
                <Label htmlFor="signup-username">Username</Label>
                <Input
                  id="signup-username"
                  type="text"
                  placeholder="jerseyking"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="mt-2"
                  required
                />
              </div>

              <div>
                <Label htmlFor="signup-email">Email</Label>
                <Input
                  id="signup-email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-2"
                  required
                />
              </div>

              <div>
                <Label htmlFor="signup-password">Password</Label>
                <Input
                  id="signup-password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-2"
                  required
                />
              </div>

              <div>
                <Label htmlFor="signup-confirm">Confirm Password</Label>
                <Input
                  id="signup-confirm"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="mt-2"
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Creating account..." : "Create Account"}
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                By signing up, you agree to our Terms of Service and Privacy Policy
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;
