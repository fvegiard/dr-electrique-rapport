# 🔍 Audit Command

Quick project audit for Claude to run.

## Trigger Phrases
- "audit"
- "check everything"
- "project status"
- "qu'est-ce qui marche pas"

## Steps

1. **Read Context Files**
   ```
   Read .claude/SESSION.md
   Read .claude/MEMORY.md
   Read .claude/CONTEXT.md
   Read .claude/HEALTH.md (if exists)
   ```

2. **Check Git Status**
   ```bash
   git status
   git log --oneline -5
   git diff --stat HEAD~5
   ```

3. **Check Open Issues**
   ```bash
   gh issue list --limit 10
   ```

4. **Test Site Health**
   ```bash
   curl -s -o /dev/null -w "%{http_code}" https://dr-electrique-rapport.netlify.app/
   curl -s -o /dev/null -w "%{http_code}" https://dr-electrique-rapport.netlify.app/dashboard.html
   ```

5. **Check Supabase**
   ```bash
   # Count recent rapports
   curl -s "$SUPABASE_URL/rest/v1/rapports?select=count" -H "apikey: $SUPABASE_KEY"
   
   # Count photos
   curl -s "$SUPABASE_URL/rest/v1/photos?select=count" -H "apikey: $SUPABASE_KEY"
   ```

6. **Generate Report**
   
   Output format:
   ```
   ## 📊 Audit Report - [DATE]
   
   ### Site Status
   - Form: [STATUS]
   - Dashboard: [STATUS]
   
   ### Database
   - Rapports: [COUNT]
   - Photos: [COUNT]
   
   ### Recent Activity
   - Last commit: [HASH] - [MESSAGE]
   - Open issues: [COUNT]
   
   ### Recommendations
   - [LIST]
   ```

## Auto-Update Session

After audit, update `.claude/SESSION.md` with findings.
