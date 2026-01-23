#!/bin/bash
# .claude/scripts/session-end.sh
# Run at end of Claude Code CLI session

set -e

echo "🔄 Updating Claude session state..."

# Get current state
BRANCH=$(git branch --show-current)
LAST_COMMIT=$(git log -1 --format='%h')
LAST_MSG=$(git log -1 --format='%s')
DEVICE=$(hostname)
TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)

# Update SESSION.md
cat > .claude/SESSION.md << EOF
# 🔄 Claude Session State

> Auto-updated by Claude at end of each work session.
> Read this first to understand current project state.

## Last Session
- **Date:** $TIMESTAMP
- **Device:** $DEVICE
- **Interface:** Claude Code CLI
- **Branch:** $BRANCH
- **Last Commit:** \`$LAST_COMMIT\` - $LAST_MSG

## Recent Changes

$(git log -5 --format="- \`%h\` %s" 2>/dev/null || echo "- No recent commits")

## Modified Files (uncommitted)

$(git status --short 2>/dev/null || echo "- Working tree clean")

## Quick Commands

\`\`\`bash
npm run dev      # Local development
git push         # Deploy to production
npm run build    # Test build
\`\`\`

---
*Auto-updated by session-end.sh*
EOF

# Commit if there are changes
if ! git diff --quiet .claude/SESSION.md 2>/dev/null; then
    git add .claude/SESSION.md
    git commit -m "chore(claude): update session state [skip ci]" || true
    echo "✅ Session state committed"
else
    echo "ℹ️  No session changes to commit"
fi

echo "🎯 Session end complete"
