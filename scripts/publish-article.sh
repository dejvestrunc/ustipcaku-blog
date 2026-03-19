#!/bin/bash
# Publish a new AI-generated wine article
# Usage: Called by cron every 3 days on Galadriel VPS
# Requires: ANTHROPIC_API_KEY env var, git configured with push access

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_FILE="$PROJECT_DIR/publish.log"
COOLIFY_API="https://coolify.galadriel.mdfx.cz"
COOLIFY_KEY="8|llgfg8SSXKb1MoeJNX79RP6hRbLKLqPaPhmBqq2Pfce7720d"
APP_UUID="f10jbwbdup4npj720gmnyg9p"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

log "=== Starting article publish ==="

cd "$PROJECT_DIR"

# Ensure we're on master and up to date
git checkout master 2>/dev/null || git checkout main 2>/dev/null
git pull origin "$(git branch --show-current)"

# Generate new article
log "Generating article..."
if ! node scripts/generate-article.js 2>&1 | tee -a "$LOG_FILE"; then
  log "ERROR: Article generation failed"
  exit 1
fi

# Check if there are new files
NEW_FILES=$(git status --porcelain src/content/articles/ | grep '??' | awk '{print $2}')
if [ -z "$NEW_FILES" ]; then
  log "No new articles generated, exiting"
  exit 0
fi

# Commit and push
log "Committing new article..."
git add src/content/articles/
ARTICLE_NAME=$(echo "$NEW_FILES" | head -1 | xargs basename .md)
git commit -m "feat: add new article - $ARTICLE_NAME"

log "Pushing to remote..."
git push origin "$(git branch --show-current)"

# Trigger Coolify redeploy
log "Triggering Coolify redeploy..."
DEPLOY_RESPONSE=$(curl -s -X POST \
  -H "Authorization: Bearer $COOLIFY_KEY" \
  "$COOLIFY_API/api/v1/applications/$APP_UUID/restart")

log "Coolify response: $DEPLOY_RESPONSE"
log "=== Article published successfully ==="
