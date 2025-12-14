# Database Password Setup

For seed scripts that use direct PostgreSQL connections, you need to set the database password.

## Setup

1. **Get your database password from Supabase:**
   - Go to: Supabase Dashboard → Settings → Database
   - Find "Connection string" section
   - Copy the password from the connection string
   - Format: `postgresql://postgres:[PASSWORD]@...`

2. **Add to `.env.local`:**
   ```bash
   SUPABASE_DB_PASSWORD=your-database-password-here
   ```

## Security

⚠️ **Never commit this password to git!**

- `.env.local` is already in `.gitignore`
- This password is only used for seed scripts (admin operations)
- Service role key is still used for normal app operations

## Alternative: Use Connection String Directly

If you prefer, you can also set the full connection string:

```bash
SUPABASE_DB_CONNECTION_STRING=postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
```

Note: The username is `postgres` (not `postgres.[PROJECT_REF]`). Replace `[PROJECT_REF]` with your actual project reference and `[PASSWORD]` with your database password.

But the password approach is simpler and more secure.

