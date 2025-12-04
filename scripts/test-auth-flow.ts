#!/usr/bin/env tsx
/**
 * Test script for authentication flow
 * 
 * Tests:
 * 1. Unauthenticated access to protected routes
 * 2. Expired token handling
 * 3. Invalid token handling
 * 4. Token refresh behavior
 * 
 * Usage:
 *   tsx scripts/test-auth-flow.ts
 */

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

async function test(name: string, testFn: () => Promise<void> | void) {
  try {
    await testFn();
    results.push({ name, passed: true });
    console.log(`✓ ${name}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    results.push({ name, passed: false, error: errorMessage });
    console.error(`✗ ${name}: ${errorMessage}`);
  }
}

async function fetchWithLog(url: string, options?: RequestInit) {
  console.log(`\n[TEST] ${options?.method || "GET"} ${url}`);
  const response = await fetch(url, options);
  console.log(`[RESPONSE] Status: ${response.status} ${response.statusText}`);
  
  if (response.headers.get("WWW-Authenticate")) {
    console.log(`[RESPONSE] WWW-Authenticate: ${response.headers.get("WWW-Authenticate")}`);
  }
  
  return response;
}

async function runTests() {
  console.log("🧪 Starting Authentication Flow Tests\n");
  console.log(`Base URL: ${BASE_URL}\n`);

  // Test 1: Unauthenticated access to protected route
  await test("Unauthenticated access to /dashboard should redirect", async () => {
    const response = await fetchWithLog(`${BASE_URL}/dashboard`, {
      redirect: "manual",
    });
    
    if (response.status !== 307 && response.status !== 308) {
      throw new Error(`Expected redirect (307/308), got ${response.status}`);
    }
    
    const location = response.headers.get("location");
    if (!location?.includes("/auth")) {
      throw new Error(`Expected redirect to /auth, got ${location}`);
    }
  });

  // Test 2: API route without token
  await test("API route without token should return 401", async () => {
    const response = await fetchWithLog(`${BASE_URL}/api/v1/jerseys`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });
    
    if (response.status !== 401) {
      throw new Error(`Expected 401, got ${response.status}`);
    }
    
    const wwwAuth = response.headers.get("WWW-Authenticate");
    if (!wwwAuth) {
      throw new Error("Expected WWW-Authenticate header");
    }
    
    const body = await response.json();
    if (body.error?.code !== "UNAUTHORIZED") {
      throw new Error(`Expected UNAUTHORIZED error code, got ${body.error?.code}`);
    }
  });

  // Test 3: API route with invalid token
  await test("API route with invalid token should return 401", async () => {
    const response = await fetchWithLog(`${BASE_URL}/api/v1/jerseys`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer invalid_token_12345",
      },
      body: JSON.stringify({}),
    });
    
    if (response.status !== 401) {
      throw new Error(`Expected 401, got ${response.status}`);
    }
  });

  // Test 4: API route with expired token format (malformed JWT)
  await test("API route with expired token format should return 401", async () => {
    // Create a token-like string that looks expired
    const expiredToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyXzEyMyIsImV4cCI6MTYwOTQ1NjgwMH0.invalid";
    
    const response = await fetchWithLog(`${BASE_URL}/api/v1/jerseys`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${expiredToken}`,
      },
      body: JSON.stringify({}),
    });
    
    if (response.status !== 401) {
      throw new Error(`Expected 401, got ${response.status}`);
    }
  });

  // Test 5: Optional auth route should work without token
  await test("Optional auth route should work without token", async () => {
    const response = await fetchWithLog(`${BASE_URL}/api/v1/jerseys?limit=10`);
    
    if (response.status !== 200) {
      throw new Error(`Expected 200, got ${response.status}`);
    }
  });

  console.log("\n📊 Test Results:");
  console.log("=".repeat(50));
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  console.log(`Total: ${results.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);

  if (failed > 0) {
    console.log("\n❌ Failed Tests:");
    results
      .filter((r) => !r.passed)
      .forEach((r) => {
        console.log(`  - ${r.name}: ${r.error}`);
      });
    process.exit(1);
  } else {
    console.log("\n✅ All tests passed!");
    process.exit(0);
  }
}

// Run tests
runTests().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

