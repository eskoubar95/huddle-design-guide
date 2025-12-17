# Reset Stripe Connect Account

Guide til at slette din eksisterende Stripe Connect account, så du kan teste med nye indstillinger.

## Metode 1: Via Supabase SQL Editor (Anbefalet)

1. **Gå til Supabase Dashboard:**
   - Åbn https://supabase.com/dashboard
   - Vælg dit projekt
   - Gå til "SQL Editor"

2. **Find din user_id:**
   - Du kan finde din user_id fra Clerk Dashboard eller fra browser console
   - Eller brug denne query til at finde alle dine accounts:

```sql
-- Find alle Stripe accounts for din bruger
SELECT 
  id,
  user_id,
  stripe_account_id,
  status,
  created_at
FROM public.stripe_accounts
ORDER BY created_at DESC;
```

3. **Slet din account:**
```sql
-- Erstat 'YOUR_USER_ID' med din faktiske user_id
DELETE FROM public.stripe_accounts
WHERE user_id = 'YOUR_USER_ID';
```

4. **Verificer sletning:**
```sql
-- Check at account er slettet
SELECT * FROM public.stripe_accounts
WHERE user_id = 'YOUR_USER_ID';
-- Should return no rows
```

## Metode 2: Via Stripe Dashboard (Valgfrit)

Hvis du også vil slette account fra Stripe (ikke nødvendigt for test):

1. **Gå til Stripe Dashboard:**
   - https://dashboard.stripe.com/test/connect/accounts
   - Find din test account (søg efter din `stripe_account_id`)

2. **Slet account:**
   - Klik på account
   - Scroll ned til "Delete account"
   - Bekræft sletning

**Note:** I test mode er det ikke nødvendigt at slette fra Stripe - du kan bare slette fra databasen.

## Metode 3: Via API (Hvis du vil lave en endpoint)

Du kan også lave en DELETE endpoint, men det er ikke nødvendigt for test.

## Efter Reset

1. **Refresh `/seller/connect-stripe` siden**
2. **Klik "Connect Stripe Account" igen**
3. **Du skulle nu kunne vælge dit eget land** (ikke låst til Tyskland)
4. **Account oprettes som "individual"** (ikke company)

## Troubleshooting

### Problem: "You already have an active Stripe account connected"

**Løsning:** Slet account fra databasen først (se Metode 1)

### Problem: Account vises stadig i UI

**Løsning:** 
- Hard refresh browser (Cmd+Shift+R / Ctrl+Shift+R)
- Check at account faktisk er slettet fra database

### Problem: Kan ikke slette fra database

**Løsning:**
- Check at du har rettigheder til at slette
- Check at der ikke er foreign key constraints der blokerer
- Account har `ON DELETE CASCADE` på user_id, så det burde virke

## Test Efter Reset

Efter reset, test at:
- ✅ Du kan vælge dit eget land (ikke låst til Tyskland)
- ✅ Account oprettes som "individual" (ikke company)
- ✅ Onboarding flow virker korrekt
- ✅ Webhook opdaterer account status

