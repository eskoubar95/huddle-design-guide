# Sentry CI/CD Setup

## GitHub Secrets Configuration

For Sentry source maps to be uploaded automatically during CI/CD builds, you need to add the following secrets to your GitHub repository:

### Required Secrets

1. **SENTRY_AUTH_TOKEN**
   - Go to: https://sentry.io/settings/account/api/auth-tokens/
   - Create a new token with the following scopes:
     - `project:read`
     - `project:releases`
     - `org:read`
   - Copy the token and add it to GitHub Secrets as `SENTRY_AUTH_TOKEN`

### Optional Secrets (already configured in workflows)

The following are hardcoded in the workflows but can be overridden via secrets if needed:
- `SENTRY_ORG`: `huddle-new` (default)
- `SENTRY_PROJECT`: `web` (default)

## How It Works

1. **During Build**: `@sentry/nextjs` automatically uploads source maps when `SENTRY_AUTH_TOKEN` is set
2. **During Release**: The release workflow creates a Sentry release and associates commits
3. **Source Maps**: Uploaded automatically by `withSentryConfig` in `next.config.ts`

## Verification

After adding the secret, verify it works by:
1. Pushing to `main` branch (triggers release workflow)
2. Check Sentry dashboard: https://sentry.io/organizations/huddle-new/projects/web/releases/
3. Verify source maps are uploaded and releases are created

## Token from Wizard

If you ran the Sentry wizard, you can use the token it provided:
```
SENTRY_AUTH_TOKEN=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
```

⚠️ **DO NOT commit this token to the repository!** Only add it as a GitHub Secret.

