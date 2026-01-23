# 🔧 Fix & Deploy Command

Autonomous fix and deploy workflow.

## Trigger Phrases
- "fix and deploy"
- "fix tout et deploy"
- "agent autonome fix"
- "répare et pousse"

## Pre-Flight Checks

1. **Verify Environment**
   ```bash
   node --version
   npm --version
   git status
   ```

2. **Pull Latest**
   ```bash
   git pull origin main
   ```

3. **Install Dependencies**
   ```bash
   npm install
   ```

## Fix Workflow

### For Each Issue Found:

1. **Identify File**
   - Check `.claude/MEMORY.md` for known bug patterns
   - Search codebase for error keywords

2. **Create Fix**
   - Make minimal change
   - Follow existing code style
   - Add comment if complex

3. **Test Locally**
   ```bash
   npm run build
   npm run preview
   ```

4. **Verify No Regressions**
   - Check form loads
   - Check dashboard loads
   - Test photo upload if relevant

## Commit Convention

```
<type>(<scope>): <description>

Types: fix, feat, chore, docs, refactor
Scope: photos, form, dashboard, build, db

Example: fix(photos): add preview fallback in URL mapping
```

## Deploy

```bash
# Commit
git add -A
git commit -m "<type>(<scope>): <description>"

# Push (auto-deploys to Netlify)
git push origin main

# Verify deployment
sleep 60
curl -s -o /dev/null -w "%{http_code}" https://dr-electrique-rapport.netlify.app/
```

## Post-Deploy

1. **Update Session**
   - Edit `.claude/SESSION.md`
   - Add to "Completed" list
   - Update "Last Commit"

2. **Close Issues**
   ```bash
   gh issue close <NUMBER> --comment "Fixed in <COMMIT>"
   ```

3. **Notify**
   - Output summary of changes
   - List any remaining issues

## Rollback Plan

If deploy fails:
```bash
git revert HEAD
git push origin main
```

## Autonomy Levels

| Level | Description | Action |
|-------|-------------|--------|
| 1 | Safe, reversible | Execute immediately |
| 2 | Code changes | Execute, report after |
| 3 | DB changes | Propose, wait for OK |
| 4 | Breaking changes | Stop, explain risks |
