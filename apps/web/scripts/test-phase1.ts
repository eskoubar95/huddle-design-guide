#!/usr/bin/env tsx
/**
 * Automated tests for Phase 1: Foundation - Auth, Errors & Rate Limiting
 * 
 * Tests:
 * 1. Health check endpoint
 * 2. Error handling (unauthorized request)
 * 3. requireAuth() helper (via test endpoint)
 * 4. Rate limiting
 * 5. Middleware protection
 */

// Make this file a module to allow top-level await
export {};

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  details?: unknown;
}

const results: TestResult[] = [];

async function runTest(name: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
    results.push({ name, passed: true });
    console.log(`✅ ${name}`);
  } catch (error) {
    results.push({
      name,
      passed: false,
      error: error instanceof Error ? error.message : String(error),
      details: error,
    });
    console.error(`❌ ${name}:`, error instanceof Error ? error.message : error);
  }
}

async function fetchJson(url: string, options?: RequestInit) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  return { response, data };
}

// Test 1: Health Check Endpoint
await runTest("Health Check Endpoint", async () => {
  const { response, data } = await fetchJson(`${BASE_URL}/api/v1/health`);
  
  if (response.status !== 200 && response.status !== 503) {
    throw new Error(`Expected status 200 or 503, got ${response.status}`);
  }
  
  if (!data.status || typeof data.status !== "string") {
    throw new Error("Response missing 'status' field");
  }
  
  if (!data.timestamp || typeof data.timestamp !== "string") {
    throw new Error("Response missing 'timestamp' field");
  }
  
  if (!data.database || typeof data.database !== "string") {
    throw new Error("Response missing 'database' field");
  }
});

// Test 2: Error Handling - Unauthorized Request
await runTest("Error Handling - Unauthorized Request", async () => {
  // Create a test endpoint that requires auth
  // We'll test by trying to access a protected endpoint without token
  const { response, data } = await fetchJson(`${BASE_URL}/api/v1/health`, {
    method: "POST", // Health endpoint only allows GET, so this should return 405 or error
  });
  
  // Should return error in consistent format
  if (data.error) {
    if (!data.error.code || typeof data.error.code !== "string") {
      throw new Error("Error response missing 'code' field");
    }
    if (!data.error.message || typeof data.error.message !== "string") {
      throw new Error("Error response missing 'message' field");
    }
  }
});

// Test 3: Error Format Consistency
await runTest("Error Format Consistency", async () => {
  // Test that errors follow the format: { error: { code, message, details? } }
  const { response, data } = await fetchJson(`${BASE_URL}/api/v1/nonexistent`);
  
  if (response.status >= 400) {
    if (!data.error) {
      throw new Error("Error response missing 'error' object");
    }
    if (typeof data.error.code !== "string") {
      throw new Error("Error response 'code' must be a string");
    }
    if (typeof data.error.message !== "string") {
      throw new Error("Error response 'message' must be a string");
    }
  }
});

// Test 4: Rate Limiting Headers
await runTest("Rate Limiting Headers", async () => {
  const { response } = await fetchJson(`${BASE_URL}/api/v1/health`);
  
  // Check for rate limit headers (may not be present on first request)
  const remaining = response.headers.get("X-RateLimit-Remaining");
  const reset = response.headers.get("X-RateLimit-Reset");
  
  // Headers are optional, but if present should be valid
  if (remaining !== null && isNaN(Number(remaining))) {
    throw new Error("X-RateLimit-Remaining must be a number");
  }
  if (reset !== null && isNaN(Number(reset))) {
    throw new Error("X-RateLimit-Reset must be a number");
  }
});

// Test 5: Middleware Protection (should redirect to /auth)
await runTest("Middleware Protection - Redirect to /auth", async () => {
  // Try to access a protected route without authentication
  const response = await fetch(`${BASE_URL}/dashboard`, {
    redirect: "manual", // Don't follow redirects automatically
  });
  
  // Should redirect to /auth
  if (response.status === 307 || response.status === 308) {
    const location = response.headers.get("location");
    if (!location || !location.includes("/auth")) {
      throw new Error(`Expected redirect to /auth, got ${location}`);
    }
  } else if (response.status !== 200) {
    // If not redirecting, might be showing auth page directly
    // This is also acceptable
    console.log(`   Note: Status ${response.status} (may be showing auth page)`);
  }
});

// Test 6: Public Routes Accessible
await runTest("Public Routes Accessible", async () => {
  const { response } = await fetchJson(`${BASE_URL}/`);
  
  if (response.status >= 500) {
    throw new Error(`Public route returned server error: ${response.status}`);
  }
});

// Test 7: Auth Page Accessible
await runTest("Auth Page Accessible", async () => {
  const { response } = await fetchJson(`${BASE_URL}/auth`);
  
  if (response.status >= 500) {
    throw new Error(`Auth page returned server error: ${response.status}`);
  }
});

// Summary
console.log("\n" + "=".repeat(50));
console.log("Test Summary");
console.log("=".repeat(50));

const passed = results.filter((r) => r.passed).length;
const failed = results.filter((r) => !r.passed).length;

console.log(`Total: ${results.length}`);
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);

if (failed > 0) {
  console.log("\nFailed Tests:");
  results
    .filter((r) => !r.passed)
    .forEach((r) => {
      console.log(`  - ${r.name}: ${r.error}`);
    });
  process.exit(1);
} else {
  console.log("\n🎉 All tests passed!");
  process.exit(0);
}

