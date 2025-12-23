#!/usr/bin/env tsx
/**
 * Test script: Get order details from Eurosender API
 * Tests: getOrderDetails for orderCode "311525-25"
 */

async function testOrderDetails() {
  // Load environment variables
  const dotenv = await import('dotenv');
  const path = await import('path');
  const cwd = process.cwd();
  const envPath = cwd.endsWith('apps/web') 
    ? path.join(cwd, '.env.local')
    : path.join(cwd, 'apps/web/.env.local');
  dotenv.config({ path: envPath });

  // Import EurosenderService
  const { EurosenderService } = await import('../apps/web/lib/services/eurosender-service');

  const orderCode = '311525-25'; // Order code from our test
  
  console.log('🧪 Testing Eurosender Order Details');
  console.log('=====================================\n');
  console.log(`Order Code: ${orderCode}\n`);

  const service = new EurosenderService();

  try {
    console.log('📋 Step 1: Get order details...');
    const orderDetails = await service.getOrderDetails(orderCode);

    console.log('\n✅ Order Details Retrieved:');
    console.log('─────────────────────────────');
    console.log(`Order Code: ${orderDetails.orderCode}`);
    console.log(`Status: ${orderDetails.status}`);
    console.log(`Service Type: ${orderDetails.serviceType || 'N/A'}`);
    console.log(`Courier ID: ${orderDetails.courierId || 'N/A'}`);
    
    if (orderDetails.price) {
      console.log(`Price: €${orderDetails.price.original.gross} (net: €${orderDetails.price.original.net}, VAT: €${orderDetails.price.original.vat})`);
    }

    console.log('\n📦 Label Information:');
    console.log('─────────────────────');
    if (orderDetails.labelUrl) {
      console.log(`✅ Label URL: ${orderDetails.labelUrl}`);
      console.log(`   → Label is available for download`);
    } else {
      console.log(`⚠️  Label URL: Not available yet`);
      console.log(`   → Label may be generated asynchronously`);
    }

    console.log('\n📮 Tracking Information:');
    console.log('────────────────────────');
    if (orderDetails.trackingNumber) {
      console.log(`✅ Tracking Number: ${orderDetails.trackingNumber}`);
    } else {
      console.log(`⚠️  Tracking Number: Not available yet`);
    }

    console.log('\n📍 Address Information:');
    console.log('───────────────────────');
    if (orderDetails.pickupAddress) {
      console.log(`Pickup: ${orderDetails.pickupAddress.street}, ${orderDetails.pickupAddress.city}, ${orderDetails.pickupAddress.country}`);
    }
    if (orderDetails.deliveryAddress) {
      console.log(`Delivery: ${orderDetails.deliveryAddress.street}, ${orderDetails.deliveryAddress.city}, ${orderDetails.deliveryAddress.country}`);
    }

    console.log('\n⏰ Timestamps:');
    console.log('──────────────');
    if (orderDetails.createdAt) {
      console.log(`Created: ${orderDetails.createdAt}`);
    }
    if (orderDetails.updatedAt) {
      console.log(`Updated: ${orderDetails.updatedAt}`);
    }

    console.log('\n📊 Summary:');
    console.log('───────────');
    console.log(`Label Available: ${orderDetails.labelUrl ? '✅ YES' : '❌ NO'}`);
    console.log(`Tracking Available: ${orderDetails.trackingNumber ? '✅ YES' : '❌ NO'}`);
    
    if (!orderDetails.labelUrl) {
      console.log('\n💡 Recommendation:');
      console.log('   - Label generation may be asynchronous');
      console.log('   - Wait a few seconds and try again');
      console.log('   - Or implement polling/webhook to check when label is ready');
    }

  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : String(error));
    if (error instanceof Error && error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

testOrderDetails();

