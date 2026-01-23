#!/bin/bash
# .claude/scripts/session-start.sh
# Run at start of Claude Code CLI session

set -e

echo "🚀 Starting Claude session..."
echo ""

# Pull latest
echo "📥 Pulling latest changes..."
git pull origin main --quiet 2>/dev/null || echo "⚠️  Could not pull (offline?)"

# Show session state
if [ -f ".claude/SESSION.md" ]; then
    echo "📋 Last Session Summary:"
    echo "========================"
    head -20 .claude/SESSION.md | tail -15
    echo ""
fi

# Show health if available
if [ -f ".claude/HEALTH.md" ]; then
    echo "🏥 Health Status:"
    grep -A5 "## Overall Health" .claude/HEALTH.md 2>/dev/null || true
    echo ""
fi

# Show open issues
echo "📌 Open Issues:"
gh issue list --limit 5 2>/dev/null || echo "  (Could not fetch issues)"
echo ""

# Show recent commits
echo "📝 Recent Commits:"
git log -5 --format="  %h %s (%ar)" 2>/dev/null || echo "  (No commits)"
echo ""

# Quick health check
echo "🌐 Site Health:"
FORM=$(curl -s -o /dev/null -w "%{http_code}" https://dr-electrique-rapport.netlify.app/ 2>/dev/null || echo "???")
DASH=$(curl -s -o /dev/null -w "%{http_code}" https://dr-electrique-rapport.netlify.app/dashboard.html 2>/dev/null || echo "???")
echo "  Form: $FORM | Dashboard: $DASH"
echo ""

echo "✅ Ready to work!"
echo ""
echo "💡 Tip: Read CLAUDE.md for full context"
