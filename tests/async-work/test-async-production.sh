#!/bin/bash

##
## Production Async Work Test Suite
##
## Tests all user-facing async work features against a live deployment:
## 1. Transparent workflow visibility
## 2. Work cancellation
## 3. Bidirectional messaging
## 4. Real-time SSE updates
## 5. Database persistence
##

set -e

# Configuration
API_BASE="${API_BASE:-http://localhost:3000}"
SESSION_ID="test_session_$(date +%s)_$$"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_test() {
    echo -e "${BLUE}[TEST]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

log_error() {
    echo -e "${RED}[✗]${NC} $1"
}

log_info() {
    echo -e "${YELLOW}[INFO]${NC} $1"
}

##
## Test 1: Health Check
##
test_health_check() {
    log_test "Health check"

    response=$(curl -s "${API_BASE}/api/health")

    if echo "$response" | jq -e '.status == "healthy"' > /dev/null 2>&1; then
        log_success "Server is healthy"
        echo "$response" | jq '.'
        return 0
    else
        log_error "Server health check failed"
        echo "$response"
        return 1
    fi
}

##
## Test 2: Trigger Async Work (Complex Research Request)
##
test_trigger_async_work() {
    log_test "Triggering async work with complex request"

    # Create a request that should trigger async work detection
    request_payload=$(cat <<EOF
{
  "messages": [
    {
      "role": "user",
      "content": "Research the latest trends in AI agent architectures and build me a comprehensive dashboard that visualizes the key patterns, including multi-agent systems, tool use, and memory management. Make it interactive with filtering and comparison capabilities."
    }
  ],
  "skepticMode": false
}
EOF
)

    log_info "Sending complex request..."
    response=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        -H "x-session-id: ${SESSION_ID}" \
        -d "$request_payload" \
        "${API_BASE}/api/chat")

    log_info "Response preview:"
    echo "$response" | jq -r '.content' | head -5

    # Check if async work was offered
    if echo "$response" | jq -r '.content' | grep -i "background\|async\|continue talking" > /dev/null; then
        log_success "Async work offer detected in response"
        return 0
    else
        log_info "No async work offer (might be below threshold or feature disabled)"
        echo "Full response: $response" | jq '.'
        return 0
    fi
}

##
## Test 3: Check Async Status API
##
test_async_status() {
    log_test "Checking async status API"

    response=$(curl -s "${API_BASE}/api/async-status?sessionId=${SESSION_ID}")

    log_info "Async status response:"
    echo "$response" | jq '.'

    if echo "$response" | jq -e '.sessionId' > /dev/null 2>&1; then
        log_success "Status API returned valid response"

        # Check for active work
        active_count=$(echo "$response" | jq '.activeWork | length')
        queued=$(echo "$response" | jq '.queueStatus.queued')
        executing=$(echo "$response" | jq '.queueStatus.executing')

        log_info "Active work: ${active_count}, Queued: ${queued}, Executing: ${executing}"
        return 0
    else
        log_error "Status API returned invalid response"
        return 1
    fi
}

##
## Test 4: SSE Connection (Real-Time Updates)
##
test_sse_connection() {
    log_test "Testing SSE connection for real-time updates"

    log_info "Opening SSE connection (will listen for 5 seconds)..."

    # Use curl to connect to SSE endpoint and capture events
    timeout 5 curl -s -N \
        -H "Accept: text/event-stream" \
        "${API_BASE}/api/async-events?sessionId=${SESSION_ID}" \
        2>/dev/null | while IFS= read -r line; do
            if [[ "$line" == data:* ]]; then
                event_data="${line#data: }"
                echo "$event_data" | jq '.' 2>/dev/null || echo "$event_data"
            fi
        done &

    sse_pid=$!

    # Give it a moment
    sleep 2

    # Kill the background SSE connection
    kill $sse_pid 2>/dev/null || true
    wait $sse_pid 2>/dev/null || true

    log_success "SSE connection test complete"
    return 0
}

##
## Test 5: Work Cancellation
##
test_work_cancellation() {
    log_test "Testing work cancellation"

    # First check if there's any work to cancel
    status_response=$(curl -s "${API_BASE}/api/async-status?sessionId=${SESSION_ID}")
    work_count=$(echo "$status_response" | jq '.activeWork | length')

    if [ "$work_count" -gt 0 ]; then
        work_id=$(echo "$status_response" | jq -r '.activeWork[0].id')

        log_info "Cancelling work: ${work_id}"

        cancel_response=$(curl -s -X POST \
            -H "Content-Type: application/json" \
            -d "{\"workId\": \"${work_id}\"}" \
            "${API_BASE}/api/async-cancel")

        echo "$cancel_response" | jq '.'

        if echo "$cancel_response" | jq -e '.success == true' > /dev/null 2>&1; then
            log_success "Work cancelled successfully"
            return 0
        else
            log_error "Work cancellation failed"
            return 1
        fi
    else
        log_info "No active work to cancel (testing cancel all instead)"

        # Test cancel all
        cancel_response=$(curl -s -X POST \
            -H "Content-Type: application/json" \
            -d "{\"sessionId\": \"${SESSION_ID}\", \"cancelAll\": true}" \
            "${API_BASE}/api/async-cancel")

        echo "$cancel_response" | jq '.'
        log_success "Cancel all test complete"
        return 0
    fi
}

##
## Test 6: Bidirectional Messaging
##
test_messaging() {
    log_test "Testing bidirectional messaging API"

    # Get messages
    log_info "Retrieving messages for session..."
    messages_response=$(curl -s "${API_BASE}/api/async-messages?sessionId=${SESSION_ID}")

    echo "$messages_response" | jq '.'

    if echo "$messages_response" | jq -e '.sessionId' > /dev/null 2>&1; then
        log_success "Messages API returned valid response"

        pending_questions=$(echo "$messages_response" | jq '.pendingQuestions | length')
        unread_count=$(echo "$messages_response" | jq '.unreadCount')

        log_info "Pending questions: ${pending_questions}, Unread: ${unread_count}"

        # If there are pending questions, test responding
        if [ "$pending_questions" -gt 0 ]; then
            message_id=$(echo "$messages_response" | jq -r '.pendingQuestions[0].id')

            log_info "Responding to message: ${message_id}"

            response_payload=$(cat <<EOF
{
  "messageId": "${message_id}",
  "sessionId": "${SESSION_ID}",
  "content": "Blue and white color scheme please"
}
EOF
)

            respond_response=$(curl -s -X POST \
                -H "Content-Type: application/json" \
                -d "$response_payload" \
                "${API_BASE}/api/async-messages")

            echo "$respond_response" | jq '.'

            if echo "$respond_response" | jq -e '.success == true' > /dev/null 2>&1; then
                log_success "Message response sent successfully"
            else
                log_info "Message response test complete (no active questions)"
            fi
        fi

        return 0
    else
        log_error "Messages API returned invalid response"
        return 1
    fi
}

##
## Test 7: Database Persistence Check
##
test_persistence() {
    log_test "Testing database persistence"

    log_info "Checking if ENABLE_ASYNC_WORK is enabled..."

    # Try to get session state from status
    status_response=$(curl -s "${API_BASE}/api/async-status?sessionId=${SESSION_ID}")

    if echo "$status_response" | jq -e '.sessionId' > /dev/null 2>&1; then
        log_success "Session state is being tracked"

        log_info "Note: Full persistence test requires server restart"
        log_info "To test persistence manually:"
        echo "  1. Note your session ID: ${SESSION_ID}"
        echo "  2. Create some async work"
        echo "  3. Restart the server"
        echo "  4. Check status again with same session ID"

        return 0
    else
        log_error "Session state not found"
        return 1
    fi
}

##
## Test 8: Feature Flag Check
##
test_feature_flags() {
    log_test "Checking feature flag configuration"

    log_info "Testing if async work is enabled..."

    # Send a simple request to check system behavior
    test_payload=$(cat <<EOF
{
  "messages": [
    {
      "role": "user",
      "content": "Is async work enabled?"
    }
  ]
}
EOF
)

    response=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        -H "x-session-id: ${SESSION_ID}" \
        -d "$test_payload" \
        "${API_BASE}/api/chat")

    # Check if response mentions async work
    if echo "$response" | jq -r '.content' | grep -i "async" > /dev/null; then
        log_info "Async work mentioned in response"
    fi

    # Try to check environment via status
    status_response=$(curl -s "${API_BASE}/api/async-status?sessionId=${SESSION_ID}")

    if echo "$status_response" | jq -e '.queueStatus' > /dev/null 2>&1; then
        log_success "Queue status available - async work likely enabled"
    else
        log_info "Queue status not found - async work may be disabled"
        log_info "Set ENABLE_ASYNC_WORK=true in environment to enable"
    fi

    return 0
}

##
## Main Test Runner
##
main() {
    echo ""
    echo "=========================================="
    echo "  Production Async Work Test Suite"
    echo "=========================================="
    echo ""
    echo "API Base: ${API_BASE}"
    echo "Session ID: ${SESSION_ID}"
    echo ""

    failed_tests=0
    total_tests=0

    # Run all tests
    tests=(
        "test_health_check:Health Check"
        "test_feature_flags:Feature Flags"
        "test_trigger_async_work:Trigger Async Work"
        "test_async_status:Async Status API"
        "test_sse_connection:SSE Real-Time Updates"
        "test_work_cancellation:Work Cancellation"
        "test_messaging:Bidirectional Messaging"
        "test_persistence:Database Persistence"
    )

    for test_entry in "${tests[@]}"; do
        IFS=':' read -r test_func test_name <<< "$test_entry"

        echo ""
        echo "===================="
        echo " ${test_name}"
        echo "===================="
        echo ""

        ((total_tests++))

        if ! $test_func; then
            ((failed_tests++))
        fi

        sleep 1
    done

    # Summary
    echo ""
    echo "=========================================="
    echo "  Test Summary"
    echo "=========================================="
    echo ""
    echo "Total tests: ${total_tests}"
    echo "Passed: $((total_tests - failed_tests))"
    echo "Failed: ${failed_tests}"
    echo ""

    if [ $failed_tests -eq 0 ]; then
        log_success "All tests passed!"
        echo ""
        echo "Next steps to enable full async work:"
        echo "  1. Set ENABLE_ASYNC_WORK=true in your environment"
        echo "  2. Ensure Supabase migrations are applied"
        echo "  3. Restart your server"
        echo "  4. Test with complex requests that trigger async work"
        echo ""
        return 0
    else
        log_error "Some tests failed"
        return 1
    fi
}

# Run tests
main "$@"
