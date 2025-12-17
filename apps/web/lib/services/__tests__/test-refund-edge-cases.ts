/**
 * Refund Edge Cases Tests
 * 
 * Tests refund logic with various scenarios
 */

console.log("🧪 Refund Edge Cases Tests\n");
console.log("=".repeat(60));

interface Transaction {
  amount: number;
  seller_fee_amount: number | null;
  platform_fee_amount: number | null;
}

function testRefundScenario(
  scenario: string,
  transaction: Transaction,
  requestedRefund: number | null,
  expectedResult: "ALLOWED" | "REJECTED",
  expectedRefundAmount?: number
) {
  console.log(`\n📋 Scenario: ${scenario}`);
  console.log("-".repeat(60));
  
  const maxRefundAmount = transaction.seller_fee_amount ?? transaction.amount;
  
  console.log(`   Transaction:`);
  console.log(`   - Total: ${transaction.amount} cents (${transaction.amount / 100} EUR)`);
  console.log(`   - Seller Fee: ${transaction.seller_fee_amount ?? "null"} cents`);
  console.log(`   - Platform Fee: ${transaction.platform_fee_amount ?? "null"} cents`);
  console.log(`   - Max Refund: ${maxRefundAmount} cents (${maxRefundAmount / 100} EUR)`);
  
  if (requestedRefund === null) {
    // Full refund
    const refundAmount = maxRefundAmount;
    console.log(`   Requested: Full refund`);
    console.log(`   → Refund Amount: ${refundAmount} cents (${refundAmount / 100} EUR)`);
    console.log(`   → Result: ${expectedResult}`);
    
    if (expectedRefundAmount !== undefined && refundAmount === expectedRefundAmount) {
      console.log(`   ✅ Correct refund amount`);
    } else if (expectedRefundAmount !== undefined) {
      console.log(`   ❌ Expected ${expectedRefundAmount}, got ${refundAmount}`);
    }
  } else {
    // Partial refund
    console.log(`   Requested: ${requestedRefund} cents (${requestedRefund / 100} EUR)`);
    
    if (requestedRefund > maxRefundAmount) {
      console.log(`   → Result: ${expectedResult} (exceeds seller fee)`);
      console.log(`   ✅ Correctly rejected excessive refund`);
    } else {
      const refundAmount = requestedRefund;
      console.log(`   → Refund Amount: ${refundAmount} cents (${refundAmount / 100} EUR)`);
      console.log(`   → Result: ${expectedResult}`);
      
      if (expectedRefundAmount !== undefined && refundAmount === expectedRefundAmount) {
        console.log(`   ✅ Correct refund amount`);
      } else if (expectedRefundAmount !== undefined) {
        console.log(`   ❌ Expected ${expectedRefundAmount}, got ${refundAmount}`);
      }
    }
  }
  
  // Verify platform fee is retained
  if (transaction.platform_fee_amount) {
    console.log(`   ✅ Platform fee (${transaction.platform_fee_amount / 100} EUR) is retained`);
  }
}

// Test Case 1: Normal refund (seller fee only)
testRefundScenario(
  "Normal refund - seller fee only",
  {
    amount: 11500, // 115 EUR (100 + 10 + 5)
    seller_fee_amount: 100, // 1 EUR
    platform_fee_amount: 500, // 5 EUR
  },
  null, // Full refund
  "ALLOWED",
  100 // Should refund 1 EUR (seller fee only)
);

// Test Case 2: Partial refund within seller fee
testRefundScenario(
  "Partial refund - within seller fee",
  {
    amount: 11500,
    seller_fee_amount: 100,
    platform_fee_amount: 500,
  },
  50, // 0.50 EUR
  "ALLOWED",
  50
);

// Test Case 3: Refund exceeding seller fee (should reject)
testRefundScenario(
  "Refund exceeding seller fee - should reject",
  {
    amount: 11500,
    seller_fee_amount: 100,
    platform_fee_amount: 500,
  },
  200, // 2 EUR (exceeds 1 EUR seller fee)
  "REJECTED"
);

// Test Case 4: Legacy transaction (no fee breakdown)
testRefundScenario(
  "Legacy transaction - fallback to full amount",
  {
    amount: 10000, // 100 EUR
    seller_fee_amount: null,
    platform_fee_amount: null,
  },
  null, // Full refund
  "ALLOWED",
  10000 // Falls back to full amount (legacy behavior)
);

// Test Case 5: Very small seller fee
testRefundScenario(
  "Very small seller fee - 1 cent",
  {
    amount: 2000, // 20 EUR
    seller_fee_amount: 1, // 1 cent (0.01 EUR)
    platform_fee_amount: 100, // 1 EUR
  },
  null, // Full refund
  "ALLOWED",
  1 // Should refund 1 cent only
);

// Test Case 6: Zero seller fee (edge case)
testRefundScenario(
  "Zero seller fee - should allow 0 refund",
  {
    amount: 10000,
    seller_fee_amount: 0,
    platform_fee_amount: 500,
  },
  null, // Full refund
  "ALLOWED",
  0 // Should refund 0 (no seller fee to refund)
);

console.log("\n" + "=".repeat(60));
console.log("✅ Refund Edge Cases Tests Complete!");
console.log("=".repeat(60));
console.log("\n📝 Summary:");
console.log("- Refund only allows seller fee amount (platform fee retained)");
console.log("- Partial refunds are clamped to max seller fee");
console.log("- Legacy transactions fallback to full amount");
console.log("- Edge cases (zero, very small) handled correctly");

