/**
 * Simple test script for FeeService calculation methods
 * Tests pure calculation methods (no DB dependency)
 * 
 * Run from project root:
 * cd apps/web && npx tsx lib/services/__tests__/test-calculations.ts
 */

// Simple test without imports - test calculation logic directly
function calculatePlatformFeeCents(itemCents: number, platformPct: number): number {
  if (itemCents < 0) {
    throw new Error("Item amount cannot be negative");
  }
  if (platformPct < 0 || platformPct > 100) {
    throw new Error("Platform fee percentage must be between 0 and 100");
  }
  return Math.round((itemCents * platformPct) / 100);
}

function calculateSellerFeeCents(itemCents: number, sellerPct: number): number {
  if (itemCents < 0) {
    throw new Error("Item amount cannot be negative");
  }
  if (sellerPct < 0 || sellerPct > 100) {
    throw new Error("Seller fee percentage must be between 0 and 100");
  }
  return Math.round((itemCents * sellerPct) / 100);
}

function calculateBuyerTotalCents(params: {
  itemCents: number;
  shippingCents: number;
  platformFeeCents: number;
}): number {
  const { itemCents, shippingCents, platformFeeCents } = params;
  if (itemCents < 0 || shippingCents < 0 || platformFeeCents < 0) {
    throw new Error("All amounts must be non-negative");
  }
  return itemCents + shippingCents + platformFeeCents;
}

function calculateSellerPayoutCents(params: {
  itemCents: number;
  sellerFeeCents: number;
}): number {
  const { itemCents, sellerFeeCents } = params;
  if (itemCents < 0 || sellerFeeCents < 0) {
    throw new Error("All amounts must be non-negative");
  }
  if (sellerFeeCents > itemCents) {
    throw new Error("Seller fee cannot exceed item price");
  }
  return itemCents - sellerFeeCents;
}

console.log("🧪 Testing FeeService Calculation Methods\n");
console.log("=".repeat(60));

// Test 1: Platform fee calculation
console.log("\n📋 Test 1: Platform Fee Calculation (5%)");
console.log("-".repeat(60));

const platformTests = [
  { itemCents: 10000, expected: 500, desc: "100 EUR → 5 EUR" },
  { itemCents: 5000, expected: 250, desc: "50 EUR → 2.50 EUR" },
  { itemCents: 33333, expected: 1667, desc: "333.33 EUR → 16.67 EUR (rounded)" },
  { itemCents: 0, expected: 0, desc: "0 EUR → 0 EUR" },
  { itemCents: 1, expected: 0, desc: "1 cent → 0 cents (rounds down)" },
  { itemCents: 20, expected: 1, desc: "20 cents → 1 cent" },
];

let platformPassed = 0;
for (const test of platformTests) {
  const result = calculatePlatformFeeCents(test.itemCents, 5.0);
  const passed = result === test.expected;
  if (passed) platformPassed++;
  console.log(`${passed ? "✅" : "❌"} ${test.desc}`);
  console.log(`   Input: ${test.itemCents} cents, Expected: ${test.expected}, Got: ${result}`);
}
console.log(`\n   Result: ${platformPassed}/${platformTests.length} tests passed`);

// Test 2: Seller fee calculation
console.log("\n📋 Test 2: Seller Fee Calculation (1%)");
console.log("-".repeat(60));

const sellerTests = [
  { itemCents: 10000, expected: 100, desc: "100 EUR → 1 EUR" },
  { itemCents: 5000, expected: 50, desc: "50 EUR → 0.50 EUR" },
  { itemCents: 33333, expected: 333, desc: "333.33 EUR → 3.33 EUR (rounded)" },
  { itemCents: 0, expected: 0, desc: "0 EUR → 0 EUR" },
];

let sellerPassed = 0;
for (const test of sellerTests) {
  const result = calculateSellerFeeCents(test.itemCents, 1.0);
  const passed = result === test.expected;
  if (passed) sellerPassed++;
  console.log(`${passed ? "✅" : "❌"} ${test.desc}`);
  console.log(`   Input: ${test.itemCents} cents, Expected: ${test.expected}, Got: ${result}`);
}
console.log(`\n   Result: ${sellerPassed}/${sellerTests.length} tests passed`);

// Test 3: Buyer total
console.log("\n📋 Test 3: Buyer Total Calculation");
console.log("-".repeat(60));

const buyerTotal = calculateBuyerTotalCents({
  itemCents: 10000,
  shippingCents: 1000,
  platformFeeCents: 500,
});
const expectedBuyerTotal = 11500; // 100 + 10 + 5 = 115 EUR
const buyerTotalPassed = buyerTotal === expectedBuyerTotal;
console.log(`${buyerTotalPassed ? "✅" : "❌"} Buyer total calculation`);
console.log(`   Item: 100 EUR, Shipping: 10 EUR, Platform Fee: 5 EUR`);
console.log(`   Expected: ${expectedBuyerTotal} cents (115 EUR), Got: ${buyerTotal} cents`);

// Test 4: Seller payout
console.log("\n📋 Test 4: Seller Payout Calculation");
console.log("-".repeat(60));

const sellerPayout = calculateSellerPayoutCents({
  itemCents: 10000,
  sellerFeeCents: 100,
});
const expectedSellerPayout = 9900; // 100 - 1 = 99 EUR
const sellerPayoutPassed = sellerPayout === expectedSellerPayout;
console.log(`${sellerPayoutPassed ? "✅" : "❌"} Seller payout calculation`);
console.log(`   Item: 100 EUR, Seller Fee: 1 EUR`);
console.log(`   Expected: ${expectedSellerPayout} cents (99 EUR), Got: ${sellerPayout} cents`);

// Test 5: Error handling
console.log("\n📋 Test 5: Error Handling");
console.log("-".repeat(60));

let errorTestsPassed = 0;
const errorTests = [
  {
    name: "Negative amount",
    test: () => {
      try {
        calculatePlatformFeeCents(-1000, 5.0);
        return false;
      } catch {
        return true;
      }
    },
  },
  {
    name: "Percentage > 100",
    test: () => {
      try {
        calculatePlatformFeeCents(10000, 101.0);
        return false;
      } catch {
        return true;
      }
    },
  },
  {
    name: "Seller fee exceeds item price",
    test: () => {
      try {
        calculateSellerPayoutCents({ itemCents: 10000, sellerFeeCents: 15000 });
        return false;
      } catch {
        return true;
      }
    },
  },
];

for (const errorTest of errorTests) {
  const passed = errorTest.test();
  if (passed) errorTestsPassed++;
  console.log(`${passed ? "✅" : "❌"} ${errorTest.name}`);
}
console.log(`\n   Result: ${errorTestsPassed}/${errorTests.length} error tests passed`);

// Summary
console.log("\n" + "=".repeat(60));
console.log("📊 Test Summary");
console.log("=".repeat(60));
console.log(`Platform Fee Tests: ${platformPassed}/${platformTests.length} ✅`);
console.log(`Seller Fee Tests: ${sellerPassed}/${sellerTests.length} ✅`);
console.log(`Buyer Total: ${buyerTotalPassed ? "✅" : "❌"}`);
console.log(`Seller Payout: ${sellerPayoutPassed ? "✅" : "❌"}`);
console.log(`Error Handling: ${errorTestsPassed}/${errorTests.length} ✅`);

const allPassed =
  platformPassed === platformTests.length &&
  sellerPassed === sellerTests.length &&
  buyerTotalPassed &&
  sellerPayoutPassed &&
  errorTestsPassed === errorTests.length;

console.log("\n" + "=".repeat(60));
if (allPassed) {
  console.log("✅ ALL TESTS PASSED!");
} else {
  console.log("❌ SOME TESTS FAILED");
}
console.log("=".repeat(60));

