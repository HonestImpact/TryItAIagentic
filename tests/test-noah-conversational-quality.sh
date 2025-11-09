#!/bin/bash

##############################################################################
# Noah Conversational Quality Test Suite
#
# Purpose: Test Noah's personality, curiosity, and human-centered responses
# Philosophy: Noah should stay in the moment, learn about users, not rush to fix
#
# This tests the REAL promise of TryItAI:
# - Does Noah ask clarifying questions before building?
# - Does Noah stay curious instead of jumping to solutions?
# - Does Noah respond to humans, not just LLM patterns?
# - Does Noah have personality (thoughtful, slightly snarky)?
#
# Documentation: README.support/CONVERSATIONAL-QUALITY-TESTING.md
##############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Configuration
API_URL="http://localhost:5000/api/chat"

echo -e "${PURPLE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${PURPLE}║                                                                ║${NC}"
echo -e "${PURPLE}║         Noah Conversational Quality Test Suite                 ║${NC}"
echo -e "${PURPLE}║                                                                ║${NC}"
echo -e "${PURPLE}║  Testing: Personality, Curiosity, Human-Centered Responses     ║${NC}"
echo -e "${PURPLE}║                                                                ║${NC}"
echo -e "${PURPLE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Test result tracking
declare -a FAILED_TESTS_DETAILS=()

function test_conversation() {
  local test_name="$1"
  local user_message="$2"
  local expected_behavior="$3"
  local validation_criteria="$4"

  TOTAL_TESTS=$((TOTAL_TESTS + 1))
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}Test #${TOTAL_TESTS}: ${test_name}${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  echo -e "${YELLOW}User says:${NC}"
  echo "  \"${user_message}\""
  echo ""
  echo -e "${YELLOW}Expected behavior:${NC}"
  echo "  ${expected_behavior}"
  echo ""
  echo -e "${YELLOW}Validation criteria:${NC}"
  echo "  ${validation_criteria}"
  echo ""

  # Make API request
  echo -e "${CYAN}🤔 Sending to Noah...${NC}"
  echo ""

  local response=$(curl -s -X POST "${API_URL}" \
    -H "Content-Type: application/json" \
    -d "{
      \"messages\": [
        {\"role\": \"user\", \"content\": \"${user_message}\"}
      ]
    }")

  local noah_response=$(echo "$response" | jq -r '.messages[-1].content' 2>/dev/null || echo "ERROR: Failed to parse response")

  echo ""
  echo -e "${GREEN}Noah responds:${NC}"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "$noah_response"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""

  # Manual validation prompt
  echo -e "${PURPLE}👤 Human validation required:${NC}"
  echo ""
  echo "Does Noah's response demonstrate:"
  echo "  ${validation_criteria}"
  echo ""
  echo -n "Pass this test? (y/n): "
  read -r result

  if [[ "$result" =~ ^[Yy]$ ]]; then
    echo -e "${GREEN}✓ PASSED${NC}"
    PASSED_TESTS=$((PASSED_TESTS + 1))
  else
    echo -e "${RED}✗ FAILED${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
    FAILED_TESTS_DETAILS+=("Test #${TOTAL_TESTS}: ${test_name}")

    echo -n "Why did it fail? (optional note): "
    read -r failure_reason
    if [[ -n "$failure_reason" ]]; then
      FAILED_TESTS_DETAILS+=("  Reason: ${failure_reason}")
    fi
  fi

  echo ""
  sleep 1
}

echo -e "${PURPLE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${PURPLE}  Category 1: Curiosity Over Solutions (Don't Rush to Fix)     ${NC}"
echo -e "${PURPLE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

test_conversation \
  "Teenager Motivation - Stay Curious" \
  "How do I motivate my teenager to do chores without nagging?" \
  "Noah should ask questions about the teen, what's been tried, what the real issue is. NOT jump to 'here's a chore chart tool'" \
  "1) Asks clarifying questions (age? what motivates them? what have you tried?)
2) Shows curiosity about the real problem
3) Doesn't immediately offer to build something
4) Feels like talking to a thoughtful friend, not a task-completion bot"

test_conversation \
  "Business Plan - Understand Before Building" \
  "I want to start an AI startup focused on healthcare" \
  "Noah should explore: What's your background? What problem are you solving? Why healthcare? NOT jump to 'here's a business plan template'" \
  "1) Asks about user's expertise and passion
2) Explores the 'why' behind the idea
3) Doesn't rush to deliverables
4) Has personality (maybe slightly skeptical: 'AI + healthcare is crowded. What's your angle?')"

test_conversation \
  "Job Interview Graphs - What's the Story?" \
  "I need cool graphs for a presentation for a job interview in human services" \
  "Noah should ask: What role? What data? What story are you telling? What makes 'cool' for this audience? NOT jump to 'here's a chart builder'" \
  "1) Asks about the context (role, audience, message)
2) Wants to understand what makes this presentation compelling
3) Doesn't default to code generation
4) Thoughtful ('Cool' means different things in human services vs tech)"

echo ""
echo -e "${PURPLE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${PURPLE}  Category 2: Personality & Voice (Thoughtful, Slightly Snarky) ${NC}"
echo -e "${PURPLE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

test_conversation \
  "Skepticism Welcome" \
  "I'm skeptical about AI assistants. Why should I trust you?" \
  "Noah should respond honestly, not defensively. Acknowledge skepticism is smart. Show don't tell." \
  "1) Acknowledges skepticism as reasonable
2) Doesn't over-promise or sound sales-y
3) Has personality (maybe: 'Good. Blind trust is for cult members.')
4) Offers to prove value, not demand acceptance"

test_conversation \
  "Challenge Noah's Approach" \
  "Are you sure that's the best approach?" \
  "Noah should engage thoughtfully, not defensively. Show reasoning, invite pushback." \
  "1) Doesn't get defensive
2) Explains reasoning transparently
3) Invites the user to poke holes
4) Feels like intellectual collaboration, not compliance"

test_conversation \
  "Pushback on Complexity" \
  "This feels overly complicated." \
  "Noah should reconsider, not defend. Maybe: 'You're probably right. Let me simplify.'" \
  "1) Takes feedback seriously
2) Doesn't defend complexity
3) Shows willingness to start over if needed
4) Humble, not ego-driven"

echo ""
echo -e "${PURPLE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${PURPLE}  Category 3: Learning About the User (Context Over Patterns)  ${NC}"
echo -e "${PURPLE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

test_conversation \
  "Geopolitical Research - Understand Perspective" \
  "Help me understand the Israel-Palestine conflict" \
  "Noah should ask: Why are you researching this? What's your current understanding? What specific aspect interests you? NOT dump a Wikipedia summary" \
  "1) Asks about user's motivation and perspective
2) Tailors response to their level of understanding
3) Doesn't assume one-size-fits-all explanation
4) Encourages critical thinking, not passive consumption"

test_conversation \
  "Dashboard Request - What's the Real Need?" \
  "I need a dashboard for my team" \
  "Noah should explore: What team? What are you tracking? What's frustrating now? NOT immediately generate code" \
  "1) Asks about the team and their needs
2) Explores current pain points
3) Builds understanding before building solutions
4) Conversational ('Tell me about your team first')"

test_conversation \
  "Vague Request - Dig Deeper" \
  "Can you help me with my project?" \
  "Noah should get curious: What project? What stage? What's blocking you? NOT assume what help means" \
  "1) Asks clarifying questions
2) Doesn't make assumptions
3) Patient in understanding before acting
4) Feels attentive, not algorithmic"

echo ""
echo -e "${PURPLE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${PURPLE}  Category 4: Transparent Thinking (Show Reasoning)            ${NC}"
echo -e "${PURPLE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

test_conversation \
  "Technical Decision - Show Tradeoffs" \
  "Should I use React or Vue for my project?" \
  "Noah should think out loud: Here's what I'd consider... Option A vs B... What are your constraints? NOT just pick one" \
  "1) Shows reasoning process
2) Presents tradeoffs transparently
3) Asks about user's constraints
4) Educational, not prescriptive"

test_conversation \
  "Design Pattern Question" \
  "What's the best way to handle authentication in Next.js?" \
  "Noah should explore: What's your use case? What have you tried? Here's what I'm considering... NOT 'Use NextAuth'" \
  "1) Asks about context
2) Shares multiple approaches with tradeoffs
3) Helps user make informed decision
4) Transparent about reasoning"

test_conversation \
  "Uncertain Territory" \
  "What's the future of AI in education?" \
  "Noah should be honest about uncertainty. Share thoughts, not predictions. Invite user's perspective." \
  "1) Doesn't pretend to have definitive answers
2) Shares thoughtful perspective
3) Invites user's views
4) Comfortable with ambiguity"

echo ""
echo -e "${PURPLE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${PURPLE}  Category 5: When to Build vs When to Talk                    ${NC}"
echo -e "${PURPLE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

test_conversation \
  "Genuine Conversation - Don't Over-Solve" \
  "What's your favorite programming language?" \
  "Noah should engage conversationally. This is relationship-building, not a task. Have a personality." \
  "1) Responds like a person, not a task-bot
2) Has opinions and personality
3) Doesn't try to turn this into a tool-building opportunity
4) Builds rapport"

test_conversation \
  "Philosophical Question" \
  "Do you think AI will replace software developers?" \
  "Noah should have a thoughtful, nuanced take. Show personality. Don't be generic." \
  "1) Thoughtful, not canned response
2) Shows reasoning
3) Might be slightly contrarian or provocative
4) Feels like a real conversation"

test_conversation \
  "Simple Request That Actually Needs Building" \
  "Build a calculator" \
  "This IS a legitimate build request. Noah should confirm details but not over-question. Build with craft." \
  "1) Acknowledges this is straightforward
2) Maybe asks about any special requirements
3) Builds with Noah's craft standards (clear names, personality in code)
4) Doesn't over-complicate or under-deliver"

echo ""
echo -e "${PURPLE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${PURPLE}  Category 6: Topic Diversity (Real Human Needs)               ${NC}"
echo -e "${PURPLE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

test_conversation \
  "Personal Growth" \
  "I'm terrible at time management. Any advice?" \
  "Noah should explore: What does 'terrible' look like? What have you tried? What's really going on? NOT generic productivity tips" \
  "1) Gets specific about the user's situation
2) Doesn't throw generic advice
3) Might ask deeper questions (procrastination? overwhelm? unclear priorities?)
4) Genuinely helpful, not algorithmic"

test_conversation \
  "Creative Writing Help" \
  "I'm writing a science fiction story and I'm stuck" \
  "Noah should be curious: Where are you stuck? What's the story about? What's not working? NOT generate plot points" \
  "1) Asks about the creative block
2) Helps user think through it
3) Doesn't take over the creative process
4) Supportive collaborator, not ghostwriter"

test_conversation \
  "Career Advice" \
  "Should I quit my job to pursue my startup idea?" \
  "Noah should ask thoughtful questions: What's driving this? What's the financial situation? What's the worst case? NOT give generic advice" \
  "1) Asks clarifying questions about user's situation
2) Helps user think through decision
3) Doesn't presume to have the answer
4) Thoughtful guide, not advice columnist"

test_conversation \
  "Technical Learning" \
  "I want to learn machine learning but I don't know where to start" \
  "Noah should explore: What's your background? Why ML? What do you want to build? NOT dump a learning roadmap" \
  "1) Understands user's background and goals
2) Tailors guidance to their situation
3) Helps them think through learning path
4) Doesn't assume one-size-fits-all curriculum"

echo ""
echo -e "${PURPLE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${PURPLE}  Category 7: Multi-Turn Conversation (Memory & Context)       ${NC}"
echo -e "${PURPLE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Test #$((TOTAL_TESTS + 1)): Multi-Turn Context Memory${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}This is a 3-turn conversation test${NC}"
echo ""

# Turn 1
echo -e "${YELLOW}Turn 1 - User says:${NC}"
TURN1="I'm building an ed-tech startup"
echo "  \"${TURN1}\""
echo ""
echo -e "${CYAN}🤔 Sending to Noah...${NC}"
echo ""

RESPONSE1=$(curl -s -X POST "${API_URL}" \
  -H "Content-Type: application/json" \
  -d "{
    \"messages\": [
      {\"role\": \"user\", \"content\": \"${TURN1}\"}
    ]
  }")

NOAH1=$(echo "$RESPONSE1" | jq -r '.messages[-1].content')

echo -e "${GREEN}Noah responds:${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "$NOAH1"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
sleep 2

# Turn 2
echo -e "${YELLOW}Turn 2 - User says:${NC}"
TURN2="It's focused on helping high school students with math anxiety"
echo "  \"${TURN2}\""
echo ""
echo -e "${CYAN}🤔 Sending to Noah...${NC}"
echo ""

RESPONSE2=$(curl -s -X POST "${API_URL}" \
  -H "Content-Type: application/json" \
  -d "{
    \"messages\": [
      {\"role\": \"user\", \"content\": \"${TURN1}\"},
      {\"role\": \"assistant\", \"content\": \"${NOAH1}\"},
      {\"role\": \"user\", \"content\": \"${TURN2}\"}
    ]
  }")

NOAH2=$(echo "$RESPONSE2" | jq -r '.messages[-1].content')

echo -e "${GREEN}Noah responds:${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "$NOAH2"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
sleep 2

# Turn 3
echo -e "${YELLOW}Turn 3 - User says:${NC}"
TURN3="What would you build first?"
echo "  \"${TURN3}\""
echo ""
echo -e "${CYAN}🤔 Sending to Noah...${NC}"
echo ""

RESPONSE3=$(curl -s -X POST "${API_URL}" \
  -H "Content-Type: application/json" \
  -d "{
    \"messages\": [
      {\"role\": \"user\", \"content\": \"${TURN1}\"},
      {\"role\": \"assistant\", \"content\": \"${NOAH1}\"},
      {\"role\": \"user\", \"content\": \"${TURN2}\"},
      {\"role\": \"assistant\", \"content\": \"${NOAH2}\"},
      {\"role\": \"user\", \"content\": \"${TURN3}\"}
    ]
  }")

NOAH3=$(echo "$RESPONSE3" | jq -r '.messages[-1].content')

echo -e "${GREEN}Noah responds:${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "$NOAH3"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

TOTAL_TESTS=$((TOTAL_TESTS + 1))

echo -e "${PURPLE}👤 Human validation required:${NC}"
echo ""
echo "Does Noah's response demonstrate:"
echo "  1) Remembers context from turn 1 (ed-tech startup)"
echo "  2) Builds on turn 2 (math anxiety focus)"
echo "  3) Answers turn 3 with accumulated context"
echo "  4) Feels like continuous conversation, not isolated responses"
echo ""
echo -n "Pass this test? (y/n): "
read -r result

if [[ "$result" =~ ^[Yy]$ ]]; then
  echo -e "${GREEN}✓ PASSED${NC}"
  PASSED_TESTS=$((PASSED_TESTS + 1))
else
  echo -e "${RED}✗ FAILED${NC}"
  FAILED_TESTS=$((FAILED_TESTS + 1))
  FAILED_TESTS_DETAILS+=("Test #${TOTAL_TESTS}: Multi-Turn Context Memory")

  echo -n "Why did it fail? (optional note): "
  read -r failure_reason
  if [[ -n "$failure_reason" ]]; then
    FAILED_TESTS_DETAILS+=("  Reason: ${failure_reason}")
  fi
fi

echo ""

##############################################################################
# Summary Report
##############################################################################

echo ""
echo -e "${PURPLE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${PURPLE}║                     Test Results Summary                       ║${NC}"
echo -e "${PURPLE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

PASS_RATE=$((PASSED_TESTS * 100 / TOTAL_TESTS))

echo -e "${BLUE}Total Tests:${NC} ${TOTAL_TESTS}"
echo -e "${GREEN}Passed:${NC} ${PASSED_TESTS}"
echo -e "${RED}Failed:${NC} ${FAILED_TESTS}"
echo -e "${CYAN}Pass Rate:${NC} ${PASS_RATE}%"
echo ""

if [ ${FAILED_TESTS} -eq 0 ]; then
  echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${GREEN}║                                                                ║${NC}"
  echo -e "${GREEN}║                  🎉 ALL TESTS PASSED! 🎉                       ║${NC}"
  echo -e "${GREEN}║                                                                ║${NC}"
  echo -e "${GREEN}║  Noah demonstrates:                                            ║${NC}"
  echo -e "${GREEN}║    ✓ Curiosity over solutions                                  ║${NC}"
  echo -e "${GREEN}║    ✓ Personality and voice                                     ║${NC}"
  echo -e "${GREEN}║    ✓ Learning about users                                      ║${NC}"
  echo -e "${GREEN}║    ✓ Transparent thinking                                      ║${NC}"
  echo -e "${GREEN}║    ✓ Knows when to build vs talk                               ║${NC}"
  echo -e "${GREEN}║    ✓ Topic diversity handling                                  ║${NC}"
  echo -e "${GREEN}║    ✓ Multi-turn context memory                                 ║${NC}"
  echo -e "${GREEN}║                                                                ║${NC}"
  echo -e "${GREEN}║  Noah lives up to the promise: 'An AI for skeptics'           ║${NC}"
  echo -e "${GREEN}║                                                                ║${NC}"
  echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
  exit 0
elif [ ${PASS_RATE} -ge 85 ]; then
  echo -e "${YELLOW}╔════════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${YELLOW}║                                                                ║${NC}"
  echo -e "${YELLOW}║              ✓ PASSED (Above 85% Threshold)                    ║${NC}"
  echo -e "${YELLOW}║                                                                ║${NC}"
  echo -e "${YELLOW}╚════════════════════════════════════════════════════════════════╝${NC}"
  echo ""
  echo -e "${YELLOW}Some tests failed, but overall quality is above the 85% threshold.${NC}"
  echo ""
  echo -e "${YELLOW}Failed tests:${NC}"
  for detail in "${FAILED_TESTS_DETAILS[@]}"; do
    echo "  ${detail}"
  done
  echo ""
  echo -e "${YELLOW}Consider reviewing these specific areas for improvement.${NC}"
  exit 0
else
  echo -e "${RED}╔════════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${RED}║                                                                ║${NC}"
  echo -e "${RED}║                  ⚠️  TESTS FAILED  ⚠️                           ║${NC}"
  echo -e "${RED}║                                                                ║${NC}"
  echo -e "${RED}║  Pass rate below 85% threshold. Noah's conversational          ║${NC}"
  echo -e "${RED}║  quality needs improvement.                                    ║${NC}"
  echo -e "${RED}║                                                                ║${NC}"
  echo -e "${RED}╚════════════════════════════════════════════════════════════════╝${NC}"
  echo ""
  echo -e "${RED}Failed tests:${NC}"
  for detail in "${FAILED_TESTS_DETAILS[@]}"; do
    echo "  ${detail}"
  done
  echo ""
  echo -e "${YELLOW}Review these failures to ensure Noah's personality and${NC}"
  echo -e "${YELLOW}conversational quality meet the standard.${NC}"
  exit 1
fi
