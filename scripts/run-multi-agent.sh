#!/bin/bash

# Multi-Agent Orchestration Script
# Usage: ./scripts/run-multi-agent.sh HUD-35

set -e

ISSUE_ID=$1
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PLAN_DIR="${PROJECT_ROOT}/.project/plans/${ISSUE_ID}"
PLAN_FILE=$(ls ${PLAN_DIR}/implementation-plan-*.md 2>/dev/null | head -1)

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
log_info() {
  echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
  echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
  echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
  echo -e "${RED}❌ $1${NC}"
}

verify_continue() {
  local message=$1
  echo -e "${YELLOW}${message}${NC}"
  read -p "Continue? (y/n): " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    log_error "Aborted by user"
    exit 1
  fi
}

run_agent() {
  local agent_name=$1
  local phase_num=$2
  local phase_name=$3
  local parallel=${4:-false}

  log_info "Starting ${agent_name} agent (Phase ${phase_num}: ${phase_name})..."

  local cmd="claude-code task \
    --agent ${agent_name} \
    --context ${PROJECT_ROOT}/.claude/agents/${agent_name}-agent.md \
    --context ${PROJECT_ROOT}/.cursor/rules/ \
    --context ${PROJECT_ROOT}/openmemory.md \
    --context ${PLAN_FILE} \
    --instructions \"Execute Phase ${phase_num} (${phase_name}) from the implementation plan. Follow ${agent_name}-agent.md rules strictly. Update plan file with progress.\""

  if [ "$parallel" = true ]; then
    eval $cmd &
    echo $!
  else
    eval $cmd
  fi
}

# Validate inputs
if [ -z "$ISSUE_ID" ]; then
  log_error "Usage: ./scripts/run-multi-agent.sh HUD-XX"
  exit 1
fi

if [ ! -d "$PLAN_DIR" ]; then
  log_error "Plan directory not found: ${PLAN_DIR}"
  log_info "Did you create an implementation plan in Cursor first?"
  log_info "Run: /create-implementation-plan ${ISSUE_ID}"
  exit 1
fi

if [ ! -f "$PLAN_FILE" ]; then
  log_error "Implementation plan not found in: ${PLAN_DIR}"
  exit 1
fi

# Header
echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                                                            ║"
echo "║         🤖 Multi-Agent Workflow Orchestrator 🤖            ║"
echo "║                                                            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
log_info "Issue: ${ISSUE_ID}"
log_info "Plan: ${PLAN_FILE}"
echo ""

# Phase 1: Database Agent (Sequential)
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Phase 1: Database Schema (Sequential)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

verify_continue "Ready to start Database agent?"

run_agent "database" "1" "Database Schema"

log_success "Phase 1 complete!"
echo ""

# Manual verification
log_warning "MANUAL VERIFICATION REQUIRED"
echo ""
echo "Please verify:"
echo "  1. Migrations created in supabase/migrations/"
echo "  2. Migration applies cleanly: supabase migration up"
echo "  3. Types generated: apps/web/lib/db/database.types.ts"
echo "  4. RLS policies tested"
echo ""

verify_continue "Phase 1 verified and ready to continue?"

# Phase 2-3: Backend + Frontend (Parallel)
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Phase 2-3: Backend + Frontend (Parallel)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

verify_continue "Ready to start Backend + Frontend agents in parallel?"

# Start both agents in parallel
BACKEND_PID=$(run_agent "backend" "2" "Backend Implementation" true)
FRONTEND_PID=$(run_agent "frontend" "3" "Frontend Implementation" true)

log_info "Backend agent PID: ${BACKEND_PID}"
log_info "Frontend agent PID: ${FRONTEND_PID}"
log_info "Waiting for both agents to complete..."

# Wait for both
wait $BACKEND_PID
BACKEND_EXIT=$?
wait $FRONTEND_PID
FRONTEND_EXIT=$?

if [ $BACKEND_EXIT -ne 0 ]; then
  log_error "Backend agent failed with exit code ${BACKEND_EXIT}"
  exit 1
fi

if [ $FRONTEND_EXIT -ne 0 ]; then
  log_error "Frontend agent failed with exit code ${FRONTEND_EXIT}"
  exit 1
fi

log_success "Phase 2-3 complete!"
echo ""

# Manual verification
log_warning "MANUAL VERIFICATION REQUIRED"
echo ""
echo "Please verify:"
echo "  1. Backend API endpoints working (test with curl/Postman)"
echo "  2. Frontend components render without errors"
echo "  3. Integration between frontend and backend works"
echo "  4. npm run type-check && npm run lint && npm run test passes"
echo ""

verify_continue "Phase 2-3 verified and ready to continue?"

# Phase 4: Testing Agent (Sequential)
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Phase 4: Testing & Quality Assurance (Sequential)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

verify_continue "Ready to start Testing agent?"

run_agent "testing" "4" "Testing & QA"

log_success "Phase 4 complete!"
echo ""

# Final verification
log_warning "FINAL VERIFICATION REQUIRED"
echo ""
echo "Please verify:"
echo "  1. All tests passing: npm run test"
echo "  2. Coverage > 80%: npm run test -- --coverage"
echo "  3. Integration tests passing: npm run test:integration"
echo "  4. Build succeeds: npm run build"
echo ""

verify_continue "All phases verified and ready to integrate?"

# Summary
echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                                                            ║"
echo "║                    ✅ ALL PHASES COMPLETE ✅                ║"
echo "║                                                            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

log_info "Agent branches created:"
echo "  - feature/huddle-${ISSUE_ID}-*-database"
echo "  - feature/huddle-${ISSUE_ID}-*-backend"
echo "  - feature/huddle-${ISSUE_ID}-*-frontend"
echo "  - feature/huddle-${ISSUE_ID}-*-testing"
echo ""

log_info "Next steps:"
echo ""
echo "  1. Merge all agent branches into unified feature branch:"
echo "     git checkout -b feature/huddle-${ISSUE_ID}-complete"
echo "     git merge feature/huddle-${ISSUE_ID}-*-database"
echo "     git merge feature/huddle-${ISSUE_ID}-*-backend"
echo "     git merge feature/huddle-${ISSUE_ID}-*-frontend"
echo "     git merge feature/huddle-${ISSUE_ID}-*-testing"
echo ""
echo "  2. Test integration locally:"
echo "     npm run type-check && npm run lint && npm run test && npm run build"
echo ""
echo "  3. Create PR in Cursor:"
echo "     /create-pr-with-linear ${ISSUE_ID}"
echo ""

log_success "Multi-agent workflow complete! 🎉"
echo ""

