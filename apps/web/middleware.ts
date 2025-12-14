import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/wardrobe(.*)",
  "/marketplace(.*)",
  "/profile(.*)",
  "/settings(.*)",
]);

export default clerkMiddleware(async (auth, request) => {
  // Protect routes that require authentication
  if (isProtectedRoute(request)) {
    // auth() returns a Promise in Next.js 16, so we await it
    const authResult = await auth();
    const { userId, sessionId } = authResult;

    if (!userId) {
      // Log redirect reason (no PII)
      if (process.env.NODE_ENV === "development") {
        console.log("[MIDDLEWARE] Redirecting to auth", {
          path: request.nextUrl.pathname,
          reason: "no_user_id",
          hasSessionId: !!sessionId,
        });
      }

      // Redirect to auth page if not authenticated
      const authUrl = new URL("/auth", request.url);
      authUrl.searchParams.set("redirect_url", request.url);
      return NextResponse.redirect(authUrl);
    }

    // Log successful auth (no PII)
    if (process.env.NODE_ENV === "development") {
      console.log("[MIDDLEWARE] Authenticated request", {
        path: request.nextUrl.pathname,
        hasSessionId: !!sessionId,
      });
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};

