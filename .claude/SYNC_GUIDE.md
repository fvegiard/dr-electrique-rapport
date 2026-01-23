# 🔄 Cross-Device Sync System

Sync Claude state between devices WITHOUT Tailscale.
Uses GitHub Gist as lightweight key-value store.

## Setup

### 1. Create Private Gist

Go to https://gist.github.com and create:
- **Filename:** `claude-sync.json`
- **Content:** `{}`
- **Visibility:** Secret (only you can see)
- **Save the Gist ID** (from URL)

### 2. Add to GitHub Secrets

In your repo Settings → Secrets:
- `GIST_ID`: Your gist ID
- `GH_PAT`: Personal Access Token with `gist` scope

## Sync Protocol

### Push State (End of Session)

```bash
# claude-sync-push.sh
#!/bin/bash

GIST_ID="${GIST_ID}"
GH_TOKEN="${GH_PAT}"

STATE=$(cat << EOF
{
  "device": "$(hostname)",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "branch": "$(git branch --show-current)",
  "last_commit": "$(git log -1 --format='%h - %s')",
  "session_notes": "$1",
  "next_tasks": "$2"
}
EOF
)

curl -X PATCH \
  -H "Authorization: token $GH_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  "https://api.github.com/gists/$GIST_ID" \
  -d "{\"files\":{\"claude-sync.json\":{\"content\":$(echo "$STATE" | jq -Rs .)}}}"

echo "✅ State pushed to Gist"
```

### Pull State (Start of Session)

```bash
# claude-sync-pull.sh
#!/bin/bash

GIST_ID="${GIST_ID}"
GH_TOKEN="${GH_PAT}"

STATE=$(curl -s \
  -H "Authorization: token $GH_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  "https://api.github.com/gists/$GIST_ID" \
  | jq -r '.files["claude-sync.json"].content')

echo "📥 Last session state:"
echo "$STATE" | jq .

# Parse for Claude
DEVICE=$(echo "$STATE" | jq -r '.device')
TIMESTAMP=$(echo "$STATE" | jq -r '.timestamp')
NOTES=$(echo "$STATE" | jq -r '.session_notes')

echo ""
echo "Last session: $DEVICE at $TIMESTAMP"
echo "Notes: $NOTES"
```

## GitHub Action Integration

```yaml
# In claude-session-handoff.yml, add:
- name: 🔄 Sync to Gist
  env:
    GH_TOKEN: ${{ secrets.GH_PAT }}
    GIST_ID: ${{ secrets.GIST_ID }}
  run: |
    STATE=$(jq -n \
      --arg device "${{ inputs.device_from }}" \
      --arg timestamp "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
      --arg summary "${{ inputs.session_summary }}" \
      --arg tasks "${{ inputs.next_tasks }}" \
      '{device: $device, timestamp: $timestamp, summary: $summary, next_tasks: $tasks}')
    
    curl -X PATCH \
      -H "Authorization: token $GH_TOKEN" \
      "https://api.github.com/gists/$GIST_ID" \
      -d "{\"files\":{\"claude-sync.json\":{\"content\":$(echo "$STATE" | jq -Rs .)}}}"
```

## Claude Code CLI Integration

Add to your `.claude/settings.json`:

```json
{
  "hooks": {
    "session_start": "bash .claude/scripts/sync-pull.sh",
    "session_end": "bash .claude/scripts/sync-push.sh"
  }
}
```

## Data Structure

```json
{
  "device": "Legion 9i (Pop!_OS)",
  "timestamp": "2026-01-23T08:31:00Z",
  "branch": "main",
  "last_commit": "9da427b - fix: insert photos",
  "session_notes": "Fixed photo upload, tested successfully",
  "next_tasks": ["verify dashboard", "close issue #21"],
  "active_files": [
    "src/lib/photoTransaction.ts",
    "index.html"
  ],
  "blockers": [],
  "context_summary": "Photos now save to separate table with rapport_id"
}
```

## Benefits

| vs Tailscale | Gist Sync |
|--------------|-----------|
| Requires VPN setup | Just GitHub token |
| Machine must be online | Async, works offline |
| Complex networking | Simple HTTP API |
| Port forwarding | No firewall issues |

## Security Notes

- Gist is **private** (Secret)
- Only accessible with your GitHub token
- No sensitive data stored (just session state)
- Token should have minimal `gist` scope only
