'use client'

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSignIn, useSignUp, useUser } from "@clerk/nextjs";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { toast } from "sonner";
import * as Sentry from "@sentry/nextjs";

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

const AuthContent = () => {
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
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  /**
   * Check profile completeness and redirect to onboarding if incomplete
   * Returns the final redirect URL (either /profile/complete or original redirectUrl)
   */
  const handlePostAuthRedirect = async (originalRedirectUrl: string): Promise<string> => {
    try {
      const response = await fetch("/api/v1/profile/completeness");
      if (response.ok) {
        const data = await response.json();
        // Redirect to onboarding if profile is incomplete or missing default shipping address
        if (!data.isProfileComplete || !data.hasDefaultShippingAddress) {
          const onboardingUrl = new URL("/profile/complete", window.location.origin);
          onboardingUrl.searchParams.set("redirect_url", originalRedirectUrl);
          return onboardingUrl.toString();
        }
      }
    } catch (error) {
      // If completeness check fails, just proceed to original redirect
      console.error("Failed to check profile completeness:", error);
    }
    return originalRedirectUrl;
  };

  // Redirect if already logged in
  useEffect(() => {
    if (isLoaded && user) {
      const redirectToCompleteness = async () => {
        const originalRedirectUrl = searchParams.get("redirect_url") || "/";
        const finalRedirectUrl = await handlePostAuthRedirect(originalRedirectUrl);
        router.push(finalRedirectUrl);
      };
      redirectToCompleteness();
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
        const originalRedirectUrl = searchParams.get("redirect_url") || "/";
        const finalRedirectUrl = await handlePostAuthRedirect(originalRedirectUrl);
        router.push(finalRedirectUrl);
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
        setIsVerifying(true); // Skift til verification step
        toast.info("Please check your email for a verification code");
        return; // Stop sign up flow, vis verification UI
      }

      if (result.status === 'complete') {
        await setActiveSignUp({ session: result.createdSessionId });
        toast.success("Account created successfully!");
        const originalRedirectUrl = searchParams.get("redirect_url") || "/";
        const finalRedirectUrl = await handlePostAuthRedirect(originalRedirectUrl);
        router.push(finalRedirectUrl);
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

  const handleVerification = async (e: React.FormEvent) => {
    e.preventDefault();

    if (verificationCode.length !== 6) {
      toast.error("Please enter a valid 6-digit code");
      return;
    }

    try {
      setIsSubmitting(true);

      if (!signUp) {
        toast.error("Authentication service not available");
        return;
      }

      // Attempt email verification
      const result = await signUp.attemptEmailAddressVerification({
        code: verificationCode,
      });

      if (result.status === 'complete') {
        // Verification successful - complete sign up
        await setActiveSignUp({ session: result.createdSessionId });
        toast.success("Email verified! Account created successfully.");
        
        // Check profile completeness and redirect to onboarding if needed
        const originalRedirectUrl = searchParams.get("redirect_url") || "/";
        const finalRedirectUrl = await handlePostAuthRedirect(originalRedirectUrl);
        router.push(finalRedirectUrl);
      } else {
        // Should not happen, but handle just in case
        toast.error("Verification incomplete. Please try again.");
      }
    } catch (error) {
      if (error instanceof Error) {
        // Handle specific Clerk errors
        if (error.message.includes("form_code_incorrect")) {
          toast.error("Invalid verification code. Please check and try again.");
          setVerificationCode(""); // Clear input
        } else if (error.message.includes("form_code_expired")) {
          toast.error("Verification code has expired. Please request a new one.");
          setVerificationCode(""); // Clear input
        } else if (error.message.includes("form_code_invalid")) {
          toast.error("Invalid code format. Please enter a 6-digit code.");
          setVerificationCode("");
        } else if (error.message.includes("rate_limit")) {
          toast.error("Too many attempts. Please wait a moment and try again.");
        } else {
          toast.error("Verification failed. Please try again or request a new code.");
        }

        // Optional: Capture errors in Sentry for production monitoring
        if (process.env.NODE_ENV === 'production') {
          Sentry.captureException(error, {
            tags: {
              component: 'auth-verification',
              error_type: error.message.includes("form_code") ? 'verification_error' : 'unknown_error',
            },
            extra: {
              verification_step: 'email_verification',
              // Note: Do NOT log verification code or PII
            },
          });
        }
      } else {
        toast.error("An unexpected error occurred");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0) {
      toast.info(`Please wait ${resendCooldown} seconds before requesting a new code.`);
      return;
    }

    try {
      setIsResending(true);

      if (!signUp) {
        toast.error("Authentication service not available");
        return;
      }

      // Resend verification code
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      toast.success("Verification code sent! Please check your email.");
      setVerificationCode(""); // Clear existing code

      // Set 60 second cooldown
      setResendCooldown(60);
      const interval = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message || "Failed to resend code. Please try again.");
      } else {
        toast.error("An unexpected error occurred");
      }
    } finally {
      setIsResending(false);
    }
  };

  const handleOAuthSignIn = async (provider: 'google' | 'facebook' | 'discord') => {
    if (!signIn || !signInLoaded) {
      toast.error("Authentication service not available");
      return;
    }

    try {
      setIsSubmitting(true);
      await signIn.authenticateWithRedirect({
        strategy: `oauth_${provider}`,
        redirectUrl: `${window.location.origin}/auth/sso-callback`,
        redirectUrlComplete: searchParams.get("redirect_url") || "/",
      });
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message || `Failed to sign in with ${provider}`);
      } else {
        toast.error("An unexpected error occurred");
      }
      setIsSubmitting(false);
    }
  };

  const handleOAuthSignUp = async (provider: 'google' | 'facebook' | 'discord') => {
    if (!signUp || !signUpLoaded) {
      toast.error("Authentication service not available");
      return;
    }

    try {
      setIsSubmitting(true);
      await signUp.authenticateWithRedirect({
        strategy: `oauth_${provider}`,
        redirectUrl: `${window.location.origin}/auth/sso-callback`,
        redirectUrlComplete: searchParams.get("redirect_url") || "/",
      });
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message || `Failed to sign up with ${provider}`);
      } else {
        toast.error("An unexpected error occurred");
      }
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
              onClick={() => {
                setIsLogin(true);
                setIsVerifying(false);
                setVerificationCode("");
              }}
              className={`flex-1 py-2 text-sm font-medium border-b-2 transition-colors ${
                isLogin
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Log In
            </button>
            <button
              onClick={() => {
                setIsLogin(false);
                setIsVerifying(false);
                setVerificationCode("");
              }}
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
              {/* SSO Buttons */}
              <div className="grid grid-cols-3 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleOAuthSignIn('google')}
                  disabled={isSubmitting || !signInLoaded}
                  className="flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span className="hidden sm:inline">Google</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleOAuthSignIn('facebook')}
                  disabled={isSubmitting || !signInLoaded}
                  className="flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="#1877F2" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  <span className="hidden sm:inline">FB</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleOAuthSignIn('discord')}
                  disabled={isSubmitting || !signInLoaded}
                  className="flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="#5865F2" viewBox="0 0 24 24">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                  </svg>
                  <span className="hidden sm:inline">Discord</span>
                </Button>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">Or continue with email</span>
                </div>
              </div>

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
          ) : !isVerifying ? (
            <form onSubmit={handleSignup} className="space-y-4">
              {/* SSO Buttons */}
              <div className="grid grid-cols-3 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleOAuthSignUp('google')}
                  disabled={isSubmitting || !signUpLoaded}
                  className="flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span className="hidden sm:inline">Google</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleOAuthSignUp('facebook')}
                  disabled={isSubmitting || !signUpLoaded}
                  className="flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="#1877F2" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  <span className="hidden sm:inline">FB</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleOAuthSignUp('discord')}
                  disabled={isSubmitting || !signUpLoaded}
                  className="flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="#5865F2" viewBox="0 0 24 24">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                  </svg>
                  <span className="hidden sm:inline">Discord</span>
                </Button>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">Or continue with email</span>
                </div>
              </div>

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

              {/* Clerk CAPTCHA widget - required for bot protection */}
              <div id="clerk-captcha" className="flex justify-center" />

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Creating account..." : "Create Account"}
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                By signing up, you agree to our Terms of Service and Privacy Policy
              </p>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="text-center">
                <h2 className="text-2xl font-semibold mb-2">Verify your email</h2>
                <p className="text-sm text-muted-foreground">
                  We sent a verification code to <span className="font-medium">{email}</span>
                </p>
              </div>

              <form onSubmit={handleVerification} className="space-y-4">
                <div>
                  <Label htmlFor="verification-code">Verification Code</Label>
                  <div className="mt-2 flex justify-center">
                    <InputOTP
                      maxLength={6}
                      value={verificationCode}
                      onChange={(value) => setVerificationCode(value)}
                      disabled={isSubmitting}
                      aria-label="Email verification code"
                    >
                      <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                        <InputOTPSlot index={3} />
                        <InputOTPSlot index={4} />
                        <InputOTPSlot index={5} />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                  <p 
                    id="verification-code-description"
                    className="text-xs text-muted-foreground text-center mt-2"
                  >
                    Enter the 6-digit code from your email
                  </p>
                </div>

                <Button type="submit" className="w-full" disabled={isSubmitting || verificationCode.length !== 6}>
                  {isSubmitting ? "Verifying..." : "Verify Email"}
                </Button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={handleResendCode}
                    disabled={isResending || isSubmitting || resendCooldown > 0}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto"
                  >
                    {isResending && (
                      <div className="w-3 h-3 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
                    )}
                    {isResending ? "Sending..." : resendCooldown > 0 ? `Resend code (${resendCooldown}s)` : "Resend code"}
                  </button>
                </div>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setIsVerifying(false);
                      setVerificationCode("");
                    }}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    ← Back to sign up
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const Auth = () => {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background to-secondary">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      }
    >
      <AuthContent />
    </Suspense>
  );
};

export default Auth;
