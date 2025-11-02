# Technical Debt: Agent Routing System

## ✅ RESOLVED - October 31, 2025

**Implementation Document:** [AGENTIC-ROUTING-IMPLEMENTATION.md](./AGENTIC-ROUTING-IMPLEMENTATION.md)

**Status:** Truly agentic routing implemented and tested with 100% success rate.

---

## Original Problem (RESOLVED)

**Location:** `/src/app/api/chat/route.ts` - `analyzeRequest()` function (lines 117-176)

**Problem:** Hardcoded keyword matching to route requests between Noah, Wanderer, and Tinkerer agents.

```typescript
// CURRENT (BAD): Rule-based keyword matching
const needsTinkerer = [
  'react component', 'vue component', 'angular component',
  'interactive dashboard', 'data visualization', 'full application',
  'database integration', 'api integration', 'complex interface'
];

const needsBuilding = needsTinkerer.some(keyword => contentLower.includes(keyword));
```

**Why This Is Anti-Agentic:**
- ❌ Requires maintaining keyword lists as features evolve
- ❌ Brittle - slight wording changes break routing
- ❌ Gaming possible - users learn magic words to trigger specific agents
- ❌ Doesn't understand intent, only matches strings
- ❌ Can't handle nuanced requests that don't fit patterns
- ❌ Forces developers to work around the router instead of improving it

**Impact:**
- Pattern Library integration works correctly in Tinkerer
- But testing requires gaming keywords to route there
- Future agentic features will face same routing brittleness
- Creates perverse incentive to add more keyword rules (wrong direction)

---

## Required Solution: Intelligent Agent Routing

**Objective:** Replace keyword matching with LLM-based intent analysis

### What It Must Do:

1. **Understand Intent, Not Keywords**
   - Analyze user request semantically
   - Consider conversation context
   - Identify complexity level
   - Determine required capabilities

2. **Route Based on Agent Capabilities**
   ```typescript
   interface AgentCapabilities {
     noah: {
       strengths: ['quick responses', 'simple tools', 'conversation'],
       weaknesses: ['complex state', 'research', 'multi-step workflows']
     },
     wanderer: {
       strengths: ['research', 'information gathering', 'web search'],
       weaknesses: ['building', 'code generation']
     },
     tinkerer: {
       strengths: ['complex building', 'iterative refinement', 'code quality'],
       weaknesses: ['speed', 'simple requests']
     }
   }
   ```

3. **Self-Improving Routing**
   - Track which agent succeeded/failed for request types
   - Learn from past routing decisions
   - Adjust routing confidence over time

4. **Explain Routing Decisions**
   ```typescript
   interface RoutingDecision {
     selectedAgent: 'noah' | 'wanderer' | 'tinkerer';
     confidence: number;
     reasoning: string;
     fallbackPlan?: string;
   }
   ```

### What To Avoid:

❌ **DO NOT:**
- Add more keyword lists
- Create regex patterns for routing
- Build rule engines or decision trees
- Hardcode request type classifications
- Make routing depend on specific phrasing

✅ **DO:**
- Use LLM to analyze intent
- Route based on semantic understanding
- Learn from routing outcomes
- Provide escape hatches when routing is uncertain
- Let users override routing if needed

### Implementation Approach:

```typescript
/**
 * Intelligent agent routing using LLM-based intent analysis
 *
 * Replaces brittle keyword matching with semantic understanding
 */
async function intelligentRouting(
  request: string,
  conversationHistory: ChatMessage[],
  context: RoutingContext
): Promise<RoutingDecision> {

  const routingPrompt = `
You are an agent router. Analyze this user request and determine which agent should handle it.

USER REQUEST: "${request}"

AVAILABLE AGENTS:
- Noah: Fast, conversational, simple tools (calculators, timers, basic HTML)
- Wanderer: Research, information gathering, web search
- Tinkerer: Complex building, React components, iterative refinement, code quality

PREVIOUS ROUTING OUTCOMES:
${context.routingHistory}

Based on:
1. Request complexity
2. Required capabilities
3. Past success patterns
4. Time sensitivity

Which agent should handle this? Explain your reasoning.
`;

  const decision = await llm.analyze(routingPrompt);

  // Learn from this decision
  await learningService.recordRoutingDecision({
    request,
    decision,
    timestamp: Date.now()
  });

  return decision;
}
```

### Integration Points:

1. **Replace in:** `/src/app/api/chat/route.ts` line 467-475
2. **Use:** Existing LLMProvider service (already has Haiku for fast analysis)
3. **Cost:** ~0.0001 per request (Haiku-based routing)
4. **Latency:** +200-400ms (acceptable for quality improvement)

### Success Criteria:

✅ Routing based on semantic understanding, not keywords
✅ No hardcoded request type lists
✅ Can handle novel request phrasings
✅ Learning from routing outcomes
✅ Explainable routing decisions
✅ Pattern Library features work without keyword gaming

### Estimated Effort:

**2-3 hours:**
- 1 hour: Build intelligent routing function
- 1 hour: Integrate with existing agent orchestration
- 30 min: Add routing analytics/learning
- 30 min: Test with diverse requests

---

## Roadmap Priority

**Status:** HIGH PRIORITY - Blocks true agentic behavior

**Sequence:**
1. ✅ Complete Week 4 agentic features (pattern library, etc.)
2. **Next:** Implement Intelligent Agent Routing
3. Then: Continue scaling agentic capabilities

**Rationale:** Building more features on brittle routing creates compounding technical debt. Fix the foundation before adding more floors.

---

## Pattern Library Status

**Integration:** ✅ Complete in `/src/lib/agents/practical-agent-agentic.ts:329-361`
**Testing:** ✅ Now properly testable with agentic routing
**Functionality:** ✅ Works correctly when Tinkerer is invoked

Pattern Library is production-ready and can now be tested end-to-end with natural language requests properly routed via agentic routing.

---

## Resolution Summary

**Date Resolved:** October 31, 2025
**Implementation:** Truly Agentic Routing (Distributed Agent Self-Selection)

### What Was Implemented

Replaced brittle keyword matching with **truly agentic routing** where agents autonomously decide if they should handle requests:

1. **Agent Self-Evaluation** (`evaluateRequest()` methods)
   - Each agent evaluates its capability match using LLM-based reasoning
   - Returns `{confidence: 0.0-1.0, reasoning: string}`
   - Low temperature (0.1) for consistent evaluation

2. **Hybrid Agentic Routing** (`hybridAgenticRouting()` function)
   - Broadcasts request to all agents simultaneously (`Promise.all`)
   - Implements distributed consensus: clear winner (>0.8) or highest confidence
   - Comprehensive logging of bidding process

3. **Integration** (replaced `analyzeRequest()`)
   - Routes directly to winning agent
   - Preserves error handling and fallbacks
   - No keyword lists, no magic words

### Test Results

- **5/5 tests passed** (100% success rate)
- Code generation → Tinkerer ✅
- Research tasks → Wanderer ✅
- Conversational questions → Noah ✅
- Simple tools → Noah ✅
- Complex implementation → Tinkerer ✅

### Files Modified

- `/src/lib/agents/practical-agent-agentic.ts` (~95 lines added)
- `/src/lib/agents/wanderer-agent.ts` (~82 lines added)
- `/src/app/api/chat/route.ts` (~226 lines added/modified)
- `/test-agentic-routing.sh` (91 lines, new file)

### Key Benefits

✅ **True Agency:** Agents decide autonomously using their own intelligence
✅ **Robust:** No keywords, immune to wording variations
✅ **Explainable:** Each routing decision includes confidence and reasoning
✅ **Scalable:** New agents just need to implement `evaluateRequest()`
✅ **Research-Backed:** Implements choreography-over-orchestration pattern

### Next Steps

1. ✅ ~~Implement truly agentic routing~~ **DONE**
2. ✅ ~~Test with diverse request types~~ **DONE**
3. 🔄 Monitor routing decisions in production
4. 📊 Collect metrics on routing accuracy
5. 🎯 Implement learning loop (adjust calibration based on outcomes)

**See:** [AGENTIC-ROUTING-IMPLEMENTATION.md](./AGENTIC-ROUTING-IMPLEMENTATION.md) for full technical details.
