/**
 * Manual Verification Script for FeeService
 * 
 * Run with: npx tsx apps/web/lib/services/__tests__/manual-verification.ts
 * Or: ts-node apps/web/lib/services/__tests__/manual-verification.ts
 */

import { FeeService } from "../fee-service";

async function runManualVerification() {
  console.log("🧪 Manual Verification: FeeService\n");
  console.log("=" .repeat(60));

  const feeService = new FeeService();

  // Test 1: Defaults fallback
  console.log("\n📋 Test 1: Defaults Fallback");
  console.log("-".repeat(60));
  try {
    const fees = await feeService.getActiveFeePercentages();
    console.log("✅ getActiveFeePercentages() succeeded");
    console.log(`   Platform: ${fees.platformPct}%`);
    console.log(`   Seller: ${fees.sellerPct}%`);
    
    if (fees.platformPct === 5.0 && fees.sellerPct === 1.0) {
      console.log("✅ Defaults are correct (5% platform, 1% seller)");
    } else {
      console.log(`⚠️  Unexpected defaults: platform=${fees.platformPct}%, seller=${fees.sellerPct}%`);
    }
  } catch (error) {
    console.error("❌ getActiveFeePercentages() failed:", error);
  }

  // Test 2: Platform fee calculation
  console.log("\n📋 Test 2: Platform Fee Calculation");
  console.log("-".repeat(60));
  const testCases = [
    { itemCents: 10000, expected: 500, desc: "100 EUR → 5 EUR (5%)" },
    { itemCents: 5000, expected: 250, desc: "50 EUR → 2.50 EUR (5%)" },
    { itemCents: 33333, expected: 1667, desc: "333.33 EUR → 16.67 EUR (5%, rounded)" },
    { itemCents: 0, expected: 0, desc: "0 EUR → 0 EUR" },
    { itemCents: 1, expected: 0, desc: "1 cent → 0 cents (rounds down)" },
    { itemCents: 20, expected: 1, desc: "20 cents → 1 cent (5%)" },
  ];

  for (const testCase of testCases) {
    try {
      const result = feeService.calculatePlatformFeeCents(testCase.itemCents, 5.0);
      const passed = result === testCase.expected;
      console.log(`${passed ? "✅" : "❌"} ${testCase.desc}`);
      console.log(`   Input: ${testCase.itemCents} cents, Expected: ${testCase.expected}, Got: ${result}`);
      if (!passed) {
        console.log(`   ⚠️  Mismatch!`);
      }
    } catch (error) {
      console.error(`❌ Error calculating platform fee for ${testCase.itemCents}:`, error);
    }
  }

  // Test 3: Seller fee calculation
  console.log("\n📋 Test 3: Seller Fee Calculation");
  console.log("-".repeat(60));
  const sellerTestCases = [
    { itemCents: 10000, expected: 100, desc: "100 EUR → 1 EUR (1%)" },
    { itemCents: 5000, expected: 50, desc: "50 EUR → 0.50 EUR (1%)" },
    { itemCents: 33333, expected: 333, desc: "333.33 EUR → 3.33 EUR (1%, rounded)" },
    { itemCents: 0, expected: 0, desc: "0 EUR → 0 EUR" },
  ];

  for (const testCase of sellerTestCases) {
    try {
      const result = feeService.calculateSellerFeeCents(testCase.itemCents, 1.0);
      const passed = result === testCase.expected;
      console.log(`${passed ? "✅" : "❌"} ${testCase.desc}`);
      console.log(`   Input: ${testCase.itemCents} cents, Expected: ${testCase.expected}, Got: ${result}`);
      if (!passed) {
        console.log(`   ⚠️  Mismatch!`);
      }
    } catch (error) {
      console.error(`❌ Error calculating seller fee for ${testCase.itemCents}:`, error);
    }
  }

  // Test 4: Buyer total calculation
  console.log("\n📋 Test 4: Buyer Total Calculation");
  console.log("-".repeat(60));
  try {
    const result = feeService.calculateBuyerTotalCents({
      itemCents: 10000,
      shippingCents: 1000,
      platformFeeCents: 500,
    });
    const expected = 11500; // 100 + 10 + 5 = 115 EUR
    const passed = result === expected;
    console.log(`${passed ? "✅" : "❌"} Buyer total calculation`);
    console.log(`   Item: 100 EUR, Shipping: 10 EUR, Platform Fee: 5 EUR`);
    console.log(`   Expected: ${expected} cents (115 EUR), Got: ${result} cents`);
    if (!passed) {
      console.log(`   ⚠️  Mismatch!`);
    }
  } catch (error) {
    console.error("❌ Error calculating buyer total:", error);
  }

  // Test 5: Seller payout calculation
  console.log("\n📋 Test 5: Seller Payout Calculation");
  console.log("-".repeat(60));
  try {
    const result = feeService.calculateSellerPayoutCents({
      itemCents: 10000,
      sellerFeeCents: 100,
    });
    const expected = 9900; // 100 - 1 = 99 EUR
    const passed = result === expected;
    console.log(`${passed ? "✅" : "❌"} Seller payout calculation`);
    console.log(`   Item: 100 EUR, Seller Fee: 1 EUR`);
    console.log(`   Expected: ${expected} cents (99 EUR), Got: ${result} cents`);
    if (!passed) {
      console.log(`   ⚠️  Mismatch!`);
    }
  } catch (error) {
    console.error("❌ Error calculating seller payout:", error);
  }

  // Test 6: Complete breakdown from major units
  console.log("\n📋 Test 6: Complete Breakdown from Major Units");
  console.log("-".repeat(60));
  try {
    const breakdown = await feeService.buildBreakdownFromMajorUnits({
      itemMajor: 100.0,
      shippingMajor: 10.0,
    });

    console.log("✅ Breakdown calculation succeeded");
    console.log("\n   Cents (minor units):");
    console.log(`   - Item: ${breakdown.itemCents} cents`);
    console.log(`   - Shipping: ${breakdown.shippingCents} cents`);
    console.log(`   - Platform Fee: ${breakdown.platformFeeCents} cents`);
    console.log(`   - Seller Fee: ${breakdown.sellerFeeCents} cents`);
    console.log(`   - Buyer Total: ${breakdown.buyerTotalCents} cents`);
    console.log(`   - Seller Payout: ${breakdown.sellerPayoutCents} cents`);

    console.log("\n   Major Units (EUR) for display:");
    console.log(`   - Item: ${breakdown.display.itemMajor} EUR`);
    console.log(`   - Shipping: ${breakdown.display.shippingMajor} EUR`);
    console.log(`   - Platform Fee: ${breakdown.display.platformFeeMajor} EUR`);
    console.log(`   - Seller Fee: ${breakdown.display.sellerFeeMajor} EUR`);
    console.log(`   - Buyer Total: ${breakdown.display.buyerTotalMajor} EUR`);
    console.log(`   - Seller Payout: ${breakdown.display.sellerPayoutMajor} EUR`);

    // Verify calculations
    const expectedBuyerTotal = 10000 + 1000 + 500; // 11500 cents
    const expectedSellerPayout = 10000 - 100; // 9900 cents
    
    if (breakdown.buyerTotalCents === expectedBuyerTotal) {
      console.log("\n✅ Buyer total is correct");
    } else {
      console.log(`\n❌ Buyer total mismatch: expected ${expectedBuyerTotal}, got ${breakdown.buyerTotalCents}`);
    }

    if (breakdown.sellerPayoutCents === expectedSellerPayout) {
      console.log("✅ Seller payout is correct");
    } else {
      console.log(`❌ Seller payout mismatch: expected ${expectedSellerPayout}, got ${breakdown.sellerPayoutCents}`);
    }
  } catch (error) {
    console.error("❌ Error building breakdown:", error);
  }

  // Test 7: Error handling
  console.log("\n📋 Test 7: Error Handling");
  console.log("-".repeat(60));
  
  // Negative amount
  try {
    feeService.calculatePlatformFeeCents(-1000, 5.0);
    console.log("❌ Should have thrown error for negative amount");
  } catch (error) {
    console.log("✅ Correctly throws error for negative amount");
  }

  // Invalid percentage
  try {
    feeService.calculatePlatformFeeCents(10000, 101.0);
    console.log("❌ Should have thrown error for percentage > 100");
  } catch (error) {
    console.log("✅ Correctly throws error for percentage > 100");
  }

  // Seller fee exceeds item price
  try {
    feeService.calculateSellerPayoutCents({
      itemCents: 10000,
      sellerFeeCents: 15000,
    });
    console.log("❌ Should have thrown error when fee exceeds item price");
  } catch (error) {
    console.log("✅ Correctly throws error when fee exceeds item price");
  }

  console.log("\n" + "=".repeat(60));
  console.log("✅ Manual Verification Complete!");
  console.log("=".repeat(60));
}

// Run verification
runManualVerification().catch((error) => {
  console.error("❌ Verification failed:", error);
  process.exit(1);
});

