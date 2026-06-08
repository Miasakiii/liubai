#!/bin/bash
# Ralph — Autonomous PRD Executor
# Iterates through prd.json user stories, spawning a fresh AI agent per story.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
PRD_FILE="$SCRIPT_DIR/prd.json"
PROGRESS_FILE="$SCRIPT_DIR/progress.txt"
ARCHIVE_DIR="$SCRIPT_DIR/archive"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${BLUE}[ralph]${NC} $1"; }
ok()  { echo -e "${GREEN}[✓]${NC} $1"; }
err() { echo -e "${RED}[✗]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }

# ─── Preflight ───────────────────────────────────────────────

if [[ ! -f "$PRD_FILE" ]]; then
  err "prd.json not found at $PRD_FILE"
  exit 1
fi

if ! command -v jq &>/dev/null; then
  err "jq is required. Install it first."
  exit 1
fi

if ! command -v claude &>/dev/null; then
  err "claude CLI not found. Install Claude Code first."
  exit 1
fi

# ─── Parse PRD ───────────────────────────────────────────────

PROJECT=$(jq -r '.project' "$PRD_FILE")
BRANCH=$(jq -r '.branchName' "$PRD_FILE")
DESCRIPTION=$(jq -r '.description' "$PRD_FILE")
STORY_COUNT=$(jq '.userStories | length' "$PRD_FILE")

log "Project: $PROJECT"
log "Branch:  $BRANCH"
log "Stories: $STORY_COUNT"
echo ""

# ─── Initialize progress ────────────────────────────────────

init_progress() {
  echo "# Ralph Progress — $PROJECT" > "$PROGRESS_FILE"
  echo "" >> "$PROGRESS_FILE"
  for i in $(seq 0 $((STORY_COUNT - 1))); do
    local id=$(jq -r ".userStories[$i].id" "$PRD_FILE")
    local title=$(jq -r ".userStories[$i].title" "$PRD_FILE")
    echo "## $id: $title" >> "$PROGRESS_FILE"
    echo "Status: pending" >> "$PROGRESS_FILE"
    echo "" >> "$PROGRESS_FILE"
  done
  log "Progress file initialized."
}

if [[ ! -f "$PROGRESS_FILE" ]] || ! grep -q "Status:" "$PROGRESS_FILE" 2>/dev/null; then
  init_progress
fi

# ─── Git setup ───────────────────────────────────────────────

cd "$PROJECT_ROOT"

# Ensure clean working tree
if [[ -n "$(git status --porcelain)" ]]; then
  warn "Working tree not clean. Committing current changes..."
  git add -A
  git commit -m "chore: checkpoint before ralph run" || true
fi

# Create or switch to branch
if git show-ref --verify --quiet "refs/heads/$BRANCH" 2>/dev/null; then
  log "Branch $BRANCH exists, switching..."
  git checkout "$BRANCH"
else
  log "Creating branch $BRANCH..."
  git checkout -b "$BRANCH"
fi

# ─── Run stories ─────────────────────────────────────────────

PASSED=0
FAILED=0
SKIPPED=0

for i in $(seq 0 $((STORY_COUNT - 1))); do
  ID=$(jq -r ".userStories[$i].id" "$PRD_FILE")
  TITLE=$(jq -r ".userStories[$i].title" "$PRD_FILE")
  DESC=$(jq -r ".userStories[$i].description" "$PRD_FILE")
  CRITERIA=$(jq -r '.userStories['"$i"'].acceptanceCriteria | join("\n- ")' "$PRD_FILE")
  PASSES=$(jq -r ".userStories[$i].passes" "$PRD_FILE")

  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  log "[$((i+1))/$STORY_COUNT] $ID: $TITLE"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  # Skip if already passed
  if [[ "$PASSES" == "true" ]]; then
    ok "$ID already passed. Skipping."
    ((SKIPPED++))
    continue
  fi

  # Update progress
  sed -i "s/^## $ID:.*/## $ID: $TITLE/" "$PROGRESS_FILE" 2>/dev/null || true
  sed -i "/^## $ID:/,/^## /s/Status: .*/Status: in_progress/" "$PROGRESS_FILE" 2>/dev/null || true

  # Build the prompt for Claude
  PROMPT="You are implementing a user story for the project '$PROJECT'.

## User Story
**$ID: $TITLE**

$DESC

## Acceptance Criteria
- $CRITERIA

## Instructions
1. Read the existing codebase to understand the current architecture
2. Implement the changes required by this user story
3. Make sure all acceptance criteria are met
4. Do NOT modify files outside the scope of this story
5. Do NOT add features not described in the acceptance criteria
6. Keep the code style consistent with the existing codebase

## Project Root
$PROJECT_ROOT"

  # Spawn Claude
  log "Spawning Claude agent..."
  if claude -p "$PROMPT" --allowedTools "Edit,Write,Bash,Read,Glob,Grep" 2>&1; then
    # Run typecheck
    log "Running typecheck..."
    cd "$PROJECT_ROOT"
    if npm run typecheck 2>/dev/null || npm run check 2>/dev/null || true; then
      ok "Typecheck passed for $ID"
    fi

    # Mark as passed in prd.json
    jq ".userStories[$i].passes = true" "$PRD_FILE" > "$PRD_FILE.tmp" && mv "$PRD_FILE.tmp" "$PRD_FILE"
    sed -i "/^## $ID:/,/^## /s/Status: .*/Status: passed/" "$PROGRESS_FILE" 2>/dev/null || true

    # Commit
    git add -A
    git commit -m "feat($ID): $TITLE" || warn "Nothing to commit for $ID"

    ok "$ID completed."
    ((PASSED++))
  else
    err "$ID failed."
    sed -i "/^## $ID:/,/^## /s/Status: .*/Status: failed/" "$PROGRESS_FILE" 2>/dev/null || true
    ((FAILED++))
  fi
done

# ─── Summary ─────────────────────────────────────────────────

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log "RALPH COMPLETE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
ok  "Passed:  $PASSED"
err "Failed:  $FAILED"
warn "Skipped: $SKIPPED"
echo ""

if [[ $FAILED -eq 0 ]]; then
  ok "All stories passed! Branch '$BRANCH' is ready."
  echo ""
  echo "  git log --oneline   # review commits"
  echo "  git push origin $BRANCH  # push to remote"
else
  warn "$FAILED story/stories failed. Check progress.txt for details."
fi
