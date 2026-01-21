# GitHub Secrets Configuration

This document lists all secrets required for the CI/CD workflows.

## Required Secrets

### Supabase

| Secret | Description | How to Get |
|--------|-------------|------------|
| `SUPABASE_URL` | Your Supabase project URL | Supabase Dashboard → Settings → API → Project URL |
| `SUPABASE_ANON_KEY` | Public anonymous key | Supabase Dashboard → Settings → API → `anon` `public` key |

### Netlify

| Secret | Description | How to Get |
|--------|-------------|------------|
| `NETLIFY_AUTH_TOKEN` | Personal access token for API calls | Netlify → User Settings → Applications → Personal access tokens |
| `NETLIFY_SITE_ID` | Your site's unique identifier | Netlify → Site Settings → General → Site ID |
| `NETLIFY_SITE_NAME` | Your site subdomain (e.g., `my-site` from `my-site.netlify.app`) | Netlify → Site Settings → Domain management |

### Optional: Notifications

| Secret | Description | How to Get |
|--------|-------------|------------|
| `DISCORD_WEBHOOK_URL` | Discord channel webhook for failure alerts | Discord → Server Settings → Integrations → Webhooks → New Webhook |
| `SLACK_WEBHOOK_URL` | Slack incoming webhook for failure alerts | Slack → Apps → Incoming Webhooks → Add to Slack |

## How to Add Secrets

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add each secret with its corresponding value

## Security Notes

- Never commit actual secret values to the repository
- Rotate tokens periodically
- Use environment-specific values where applicable
- The `SUPABASE_ANON_KEY` is safe to expose (it's designed for client-side use with RLS)
- Keep `NETLIFY_AUTH_TOKEN` confidential - it has full API access
