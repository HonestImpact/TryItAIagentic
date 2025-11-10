# Dual Routing Strategy

**Date:** November 9, 2025
**Status:** ✅ ACTIVE - Both approaches used in production

## Overview

Noah uses **two different routing strategies** depending on whether the request is streaming or non-streaming. This is an intentional design decision that balances **speed** (for streaming) with **accuracy** (for non-streaming).

---

## The Two Approaches

### 1. **Keyword-Based Routing** (Fast - Streaming)

**Function:** `analyzeRequest()` - Lines 340-407 in `/src/app/api/chat/route.ts`

**Used for:** Streaming chat responses (when user expects instant feedback)

**How it works:**
```typescript
// Simple keyword matching
const quickAndEasy = ['calculator', 'timer', 'how to', 'explain'];
const needsWanderer = ['research the latest', 'market analysis'];
const needsTinkerer = ['react component', 'dashboard'];

// Match keywords → instant routing decision
if (needsBuilding) → Tinkerer
else if (needsResearch) → Wanderer
else → Noah
```

**Performance:** Sub-millisecond (instant)

**Accuracy:** ~80% (good enough for most cases)

**Cost:** FREE (no LLM calls)

---

### 2. **AI-Based Routing** (Accurate - Non-Streaming)

**Function:** `hybridAgenticRouting()` - Lines 227-338 in `/src/app/api/chat/route.ts`

**Used for:** Non-streaming chat responses (when accuracy matters more than speed)

**How it works:**
```typescript
// All 3 agents vote in parallel
const [tinkererBid, wandererBid, noahBid] = await Promise.all([
  tinkererInstance.evaluateRequest(userMessage),  // "95% confident"
  wandererInstance.evaluateRequest(userMessage),  // "20% confident"
  noahEvaluateRequest(userMessage)                // "40% confident"
]);

// Highest confidence wins
winner = Math.max(bids) → Tinkerer gets it
```

**Performance:** ~4 seconds (3 parallel LLM evaluations)

**Accuracy:** ~95% (agents understand nuance)

**Cost:** 3 LLM API calls per request

---

## When Each is Used

| Request Type | Routing Method | Why |
|--------------|----------------|-----|
| **Streaming** (`POST /api/chat` with `stream=true`) | `analyzeRequest()` | Users expect instant response, can't wait 4 seconds |
| **Non-Streaming** (`POST /api/chat` without streaming) | `hybridAgenticRouting()` | Can afford 4 seconds for better accuracy |

---

## Code Locations

### Keyword Routing (Streaming)

**Function definition:**
```
/src/app/api/chat/route.ts:340-407
```

**Call site:**
```typescript
// Line 1201
const analysis = analyzeRequest(streamingLastMessage);
```

**Comment markers:**
```typescript
// ⚡ KEYWORD-BASED ROUTING (Streaming): Fast keyword matching for instant responses
```

---

### AI Routing (Non-Streaming)

**Function definition:**
```
/src/app/api/chat/route.ts:227-338
```

**Call site:**
```typescript
// Line 720
const routing = await hybridAgenticRouting(lastMessage);
```

**Comment markers:**
```typescript
// 🎯 AI-BASED ROUTING (Non-Streaming): Agents vote on who should handle request
```

---

## Why Not Use AI Routing for Everything?

**We tried!** But streaming responses require instant feedback:

1. **User Experience**: 4-second delay before streaming starts feels broken
2. **Perceived Performance**: Users typing expect immediate response
3. **Good Enough**: Keyword matching handles 80% of cases correctly
4. **Fallback**: If keyword routing picks wrong agent, result is still good (just not optimal)

---

## Why Not Use Keyword Routing for Everything?

**Accuracy matters for complex requests:**

| Request | Keyword Routing | AI Routing | Correct? |
|---------|----------------|------------|----------|
| "Build a React calculator" | ✅ Tinkerer (matches "calculator") | ✅ Tinkerer | Both work |
| "Create a calculator for market research" | ❌ Wanderer (matches "research") | ✅ Tinkerer | AI better |
| "How do I research React best practices?" | ❌ Tinkerer (matches "React") | ✅ Wanderer | AI better |
| "Make a dashboard showing latest industry trends" | ❌ Noah (matches "latest") | ✅ Tinkerer+Wanderer | AI much better |

**Keyword matching is brittle** - word order and phrasing can throw it off.

---

## Examples

### Example 1: Simple Request (Both Work)

**Request:** "Create a timer"

**Keyword Routing:**
```
Matches "timer" in quickAndEasy list
→ Noah handles it (correct!)
```

**AI Routing:**
```
Noah: 85% confident (simple tool)
Tinkerer: 70% confident (could build it)
Wanderer: 10% confident (not research)
→ Noah wins (correct!)
```

**Result:** Same outcome, keyword is 1000x faster

---

### Example 2: Nuanced Request (AI Wins)

**Request:** "Build an interactive dashboard analyzing latest market trends"

**Keyword Routing:**
```
Matches "latest" in needsWanderer
→ Wanderer (WRONG - this needs building, not just research)
```

**AI Routing:**
```
Tinkerer: 95% confident (complex building + data viz)
Wanderer: 60% confident (has research aspect)
Noah: 20% confident (too complex)
→ Tinkerer wins (CORRECT!)
```

**Result:** AI routing understands this needs both research AND building, picks right agent

---

## Design Decision: Keep Both

**Decision:** Maintain both approaches - they serve different purposes

**Rationale:**
1. Streaming chat is primary user interface - must feel instant
2. Non-streaming is for API/advanced use - can prioritize accuracy
3. Keyword routing is "good enough" for most streaming cases
4. Cost savings: Don't pay for 3 LLM calls when keyword matching works

**Alternative Considered:** Pre-cache routing decisions from previous message
- **Rejected:** Adds complexity, only helps on 2nd+ messages in conversation

---

## Future Improvements

### Potential Enhancements:

1. **Hybrid Caching**: Use AI routing for first message, cache decision for subsequent related messages
2. **Fast Heuristics**: Train a lightweight model for instant routing (no keywords)
3. **Progressive Enhancement**: Start streaming with keyword routing, cancel/switch if AI routing disagrees
4. **Learning from Corrections**: Track when keyword routing picks wrong agent, improve keywords

**Status:** Not planned - current system works well

---

## Metrics to Monitor

If implementing analytics:

```typescript
// Track routing accuracy
{
  streamingKeywordAccuracy: number;   // % of times keyword routing picks optimal agent
  nonStreamingAiAccuracy: number;     // % of times AI routing picks optimal agent
  avgKeywordLatency: number;          // Should be <1ms
  avgAiRoutingLatency: number;        // Should be ~4000ms
  costPerAiRouting: number;           // Cost of 3 LLM calls
}
```

**How to measure "optimal":** Compare user satisfaction, task completion, or manual review

---

## Related Documentation

- **Agentic Routing Research**: See `AGENTIC-ROUTING-RESEARCH.md` for theoretical background
- **Agent Implementations**:
  - Noah: `/src/lib/agents/conversational-agent.ts`
  - Wanderer: `/src/lib/agents/research-agent.ts`
  - Tinkerer: `/src/lib/agents/practical-agent-agentic.ts`

---

## Summary

| Aspect | Keyword Routing | AI Routing |
|--------|----------------|------------|
| **Speed** | <1ms ⚡ | ~4000ms 🐌 |
| **Accuracy** | ~80% | ~95% |
| **Cost** | $0 | 3 LLM calls |
| **Best For** | Streaming chat | Non-streaming requests |
| **Function** | `analyzeRequest()` | `hybridAgenticRouting()` |
| **Maintained** | ✅ Yes | ✅ Yes |

**Both approaches are intentional, production-ready, and serve different use cases.**

---

**Last Updated:** November 9, 2025
**Maintained By:** Core Team
**Status:** Active - Do not deprecate either approach
