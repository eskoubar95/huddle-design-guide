'use client'

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSignIn, useSignUp, useUser } from "@clerk/nextjs";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

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
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoaded } = useUser();
  const { signIn, setActive, isLoaded: signInLoaded } = useSignIn();
  const { signUp, setActive: setActiveSignUp, isLoaded: signUpLoaded } = useSignUp();
  
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [username, setUsername] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (isLoaded && user) {
      const redirectUrl = searchParams.get("redirect_url") || "/";
      router.push(redirectUrl);
    }
  }, [user, isLoaded, router, searchParams]);

  // Show loading state while Clerk is initializing
  if (!isLoaded || !signInLoaded || !signUpLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background to-secondary">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const validated = loginSchema.parse({ email, password });
      setIsSubmitting(true);

      if (!signIn) {
        toast.error("Authentication service not available");
        return;
      }

      const result = await signIn.create({
        identifier: validated.email,
        password: validated.password,
      });

      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        toast.success("Welcome back!");
        const redirectUrl = searchParams.get("redirect_url") || "/";
        router.push(redirectUrl);
      } else {
        // Handle multi-step authentication (e.g., MFA, email verification)
        toast.error("Additional authentication required");
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstError = error.issues[0];
        toast.error(firstError.message);
      } else if (error instanceof Error) {
        if (error.message.includes("form_identifier_not_found") || error.message.includes("form_password_incorrect")) {
          toast.error("Invalid email or password");
        } else {
          toast.error(error.message || "Login failed");
        }
      } else {
        toast.error("An unexpected error occurred");
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

      if (!signUp) {
        toast.error("Authentication service not available");
        return;
      }

      const result = await signUp.create({
        username: validated.username,
        emailAddress: validated.email,
        password: validated.password,
      });

      // Send email verification code
      if (result.status === 'missing_requirements') {
        await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
        toast.info("Please check your email for a verification code");
        // In a real app, you'd redirect to a verification page
        // For now, we'll just show a message
        return;
      }

      if (result.status === 'complete') {
        await setActiveSignUp({ session: result.createdSessionId });
        toast.success("Account created successfully!");
        const redirectUrl = searchParams.get("redirect_url") || "/";
        router.push(redirectUrl);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstError = error.issues[0];
        toast.error(firstError.message);
      } else if (error instanceof Error) {
        if (error.message.includes("form_username_invalid")) {
          toast.error("Username is already taken or invalid");
        } else if (error.message.includes("form_identifier_exists")) {
          toast.error("An account with this email already exists");
        } else {
          toast.error(error.message || "Sign up failed");
        }
      } else {
        toast.error("An unexpected error occurred");
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
