# Webhook Testing med Real Metadata

## Test Data Oprettet

✅ **Transaction:**
- ID: `11111111-1111-1111-1111-111111111111`
- Seller ID: `test-seller-webhook-001`
- Buyer ID: `test-buyer-webhook-001`
- Status: `pending`
- Amount: 5000.00 EUR

✅ **Stripe Account:**
- User ID: `test-user-webhook-001`
- Stripe Account ID: `acct_test_webhook_001`
- Status: `pending`

## Test Metadata

For at teste med real metadata, skal events have følgende metadata:

### payment_intent.succeeded
```json
{
  "metadata": {
    "transaction_id": "11111111-1111-1111-1111-111111111111",
    "seller_id": "test-seller-webhook-001",
    "buyer_id": "test-buyer-webhook-001",
    "listing_id": "00000000-0000-0000-0000-000000000001",
    "listing_type": "sale"
  }
}
```

### account.updated
```json
{
  "metadata": {
    "user_id": "test-user-webhook-001"
  },
  "id": "acct_test_webhook_001",
  "details_submitted": true,
  "charges_enabled": true,
  "payouts_enabled": true
}
```

### transfer.created
```json
{
  "metadata": {
    "transaction_id": "11111111-1111-1111-1111-111111111111",
    "seller_id": "test-seller-webhook-001",
    "buyer_id": "test-buyer-webhook-001"
  }
}
```

## Test Metode

Da Stripe CLI `trigger` ikke understøtter custom metadata, skal vi:
1. Teste at handleren modtager events (allerede verificeret - 200 OK)
2. Teste med Stripe Dashboard (manuelt)
3. Eller oprette en test endpoint der sender events med korrekt metadata

