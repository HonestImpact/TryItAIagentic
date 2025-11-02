# Agentic Routing Research: True Agency vs Pattern Matching

**Research Date:** 2025-10-30
**Purpose:** Cross-reference assumptions with current best practices for truly agentic intelligent agent routing

---

## Executive Summary

After researching current best practices (2024-2025), the distinction between **truly agentic routing** and **centralized pattern matching** is clear:

- ✅ **True Agency**: Agents autonomously decide if they should handle a request (distributed decision-making)
- ❌ **Pattern Matching**: Central authority analyzes and assigns requests to agents (centralized orchestration)

**Key Finding:** Even LLM-based semantic routing is still centralized orchestration—it's just "smarter pattern matching" where an LLM makes routing decisions instead of agents deciding for themselves.

---

## 1. What is "True Agency" vs "Automation"?

### True Agentic AI Characteristics

From current research, agentic AI systems exhibit:

1. **Autonomous Decision-Making**: Independently choose tasks and how to perform them
2. **Goal-Driven Actions**: Pursue objectives and adapt strategies
3. **Learning & Adaptation**: Improve from experience and feedback
4. **Initiative**: Take action based on incomplete information
5. **Contextual Awareness**: Understand nuanced situations beyond rules
6. **Self-Improvement**: Optimize approach as they learn from results

### Traditional Automation Characteristics

In contrast, automation systems:

1. **Rule-Based**: Execute predefined tasks following fixed procedures
2. **Deterministic**: Same input always produces same output
3. **No Initiative**: Cannot make decisions on new data
4. **Cannot Adapt**: Fails when encountering unfamiliar problems
5. **Centralized Control**: Directed by external orchestrator
6. **Pattern Matching**: Matches inputs to predefined categories

**Critical Distinction:** The key difference is **autonomy is about HOW independently an AI can act**, while **agency concerns WHY and HOW it acts**—pursuing goals and adapting like a human agent would.

---

## 2. Orchestration vs Choreography

### Orchestration (Centralized)

**Definition:** A single AI orchestrator agent acts as the "brain" of the system, directing all other agents, assigning tasks and making final decisions.

**Pros:**
- Predictable, controlled workflows
- Easy to reason about
- Simple debugging

**Cons:**
- Creates bottlenecks
- Single point of failure
- Not scalable for large systems
- **Removes agent autonomy** — agents become task executors, not decision makers

### Choreography (Decentralized)

**Definition:** Components react to specific events autonomously. Agents make independent decisions or reach consensus as a group through direct communication and collaboration.

**Pros:**
- More scalable and resilient
- No single failure point
- True autonomy preserved
- Agents have agency over their work

**Cons:**
- More complex to implement initially
- Requires coordination mechanisms
- Less predictable (but more adaptive)

**Research Finding:** "While orchestration means you control the flow, choreography means components react to specific events, a mode that will allow you to reach complete automation of an agentic AI solution."

---

## 3. Current Routing Patterns in Practice

### Pattern 1: Centralized Router (What We Currently Have)

```typescript
// Central authority analyzes and decides
function analyzeRequest(userInput: string): AgentType {
  if (userInput.includes('build') || userInput.includes('create')) {
    return 'tinkerer';
  }
  if (userInput.includes('research') || userInput.includes('find')) {
    return 'wanderer';
  }
  return 'noah';
}
```

**Analysis:** This is automation, not agency. The router is a rule-based dispatcher.

### Pattern 2: LLM-Based Semantic Router (Still Centralized)

```typescript
// Smarter pattern matching, but still centralized
async function semanticRouter(userInput: string): Promise<AgentType> {
  const analysis = await llm.analyze({
    prompt: `Classify this request as: code-generation, research, or conversation`,
    input: userInput
  });

  return mapToAgent(analysis.category);
}
```

**Analysis:** This is **"smarter pattern matching"**—a central LLM still makes the decision for agents. Agents have no say in whether they want/should handle the work.

**Problem:** Adds "layers of redundancy"—the routing LLM analyzes intent, then the selected agent's LLM analyzes the same intent again to plan its work.

### Pattern 3: Agent Self-Selection (Truly Agentic)

```typescript
// Each agent evaluates its own capability
interface AgentBid {
  agentName: string;
  confidence: number;  // 0.0-1.0: How well can I handle this?
  reasoning: string;   // Why I'm suited (or not)
  estimatedTime?: number;
}

// Request broadcast to all agents
async function agenticRouting(userInput: string): Promise<string> {
  // 1. All agents evaluate simultaneously
  const bids = await Promise.all([
    tinkerer.evaluateRequest(userInput),
    wanderer.evaluateRequest(userInput),
    noah.evaluateRequest(userInput)
  ]);

  // 2. Distributed consensus (highest confidence wins)
  const winner = bids.sort((a, b) => b.confidence - a.confidence)[0];

  // 3. Selected agent executes
  return await winner.agent.execute(userInput);
}
```

**Analysis:** This is **true agency**:
- ✅ Agents autonomously decide if they should handle request
- ✅ Distributed decision-making (no central authority)
- ✅ Agents have full context to evaluate
- ✅ No redundant intent analysis (single evaluation per agent)
- ✅ Learning from outcomes improves future bids

---

## 4. Research-Backed Best Practices

### From IBM & Microsoft Azure Research (2024-2025)

**Hybrid Approach Recommended:**
- Start with orchestration for predictability
- Evolve to choreography as system matures
- Use "controller flexibility"—spectrum between centralized and autonomous

**Key Insight:** "The controller could be rules-based, fully autonomous, or somewhere in between."

### From Multi-Agent Research (arXiv 2024)

**Planner Outperforms Orchestrator:**
- Orchestrator: One LLM generates all actions
- Planner: Creates plan, then executor agents generate actions independently
- **Result:** Planner method outperforms orchestrator in efficiency and agent utilization

**Why?** Because agents maintain autonomy to execute their part of the plan independently.

### From LangGraph Documentation (2024)

**Dynamic Routing Patterns:**
1. **Conditional Edges**: LLM-based decision-making for path selection
2. **Supervisor Pattern**: Agent whose "tools" are other agents
3. **Stateful Routing**: Context preserved across agent handoffs

**Note:** Even LangGraph's "dynamic routing" is typically orchestrator-based (centralized supervisor), though it supports building true choreography.

### From Contract Net Protocol (CNP) Research

**Agent Bidding Mechanism:**
1. Task announcement
2. Agents submit bids based on capability
3. Winner selected via auction/consensus
4. Task executed by winning agent

**Application:** This is the theoretical foundation for agent self-selection in multi-agent systems.

---

## 5. Why "Layers of Redundancy" is Anti-Agentic

The user's criticism about "agents are only slow when coded as automations pretending to be agents via layers of redundancy" refers to this anti-pattern:

### Centralized Orchestration Redundancy

```
User Request
  ↓
Routing LLM analyzes intent (1st LLM call)
  ↓
Routes to Agent
  ↓
Agent LLM analyzes same intent (2nd LLM call)
  ↓
Agent LLM plans approach (3rd LLM call)
  ↓
Agent executes
```

**Problems:**
- Multiple LLM calls analyzing the same information
- Latency from sequential orchestration
- Brittle handoffs between layers
- No agent autonomy—just executing commands

### True Agentic Approach (Minimal Redundancy)

```
User Request
  ↓
Broadcast to all agents (parallel)
  ↓
Each agent evaluates independently (parallel LLM calls, but distributed)
  ↓
Highest confidence agent executes immediately
```

**Benefits:**
- Parallel evaluation (faster despite multiple agents)
- Single intent analysis (by the winning agent)
- No orchestration overhead
- Agents have full autonomy and context

---

## 6. Design Principles for Truly Agentic Routing

Based on research, here are the principles for building truly agentic routing:

### ✅ DO: Enable True Agency

1. **Agent Self-Selection**: Agents decide if they should handle request
2. **Capability Profiles**: Each agent knows and declares its strengths
3. **Distributed Decision**: No central authority assigning work
4. **Bidding/Confidence**: Agents express confidence in handling request
5. **Learning Loop**: Routing decisions improve from outcomes
6. **Parallel Evaluation**: All agents evaluate simultaneously
7. **Transparency**: Agents explain why they're suited (or not)

### ❌ DON'T: Build "Smart Automation"

1. **No Central Router**: Even LLM-based semantic routing is still centralized
2. **No Keyword Matching**: Brittle and gameable
3. **No Rule Engines**: Deterministic routing removes agency
4. **No Decision Trees**: Predefined paths limit adaptation
5. **No Redundant Analysis**: Don't analyze intent twice (once to route, once to plan)
6. **No Supervisor-as-Dictator**: Supervisors should facilitate, not command

---

## 7. Implementation Strategy: Path to True Agency

### Phase 1: Intelligent Orchestration (Incremental Improvement)

**Goal:** Replace keyword matching with semantic understanding while maintaining centralized control

**Approach:**
- LLM-based intent classification
- Semantic similarity matching
- Learning from routing outcomes
- Explainable routing decisions

**Trade-off:** Still centralized, but better than keywords. Good stepping stone.

### Phase 2: Hybrid Agency (Recommended Starting Point)

**Goal:** Give agents partial autonomy while maintaining fallback

**Approach:**
```typescript
async function hybridRouting(userInput: string) {
  // 1. Agents bid with confidence
  const bids = await getBids(userInput);

  // 2. If clear winner (confidence > 0.8), use it
  const clearWinner = bids.find(b => b.confidence > 0.8);
  if (clearWinner) {
    return clearWinner.agent.execute(userInput);
  }

  // 3. Otherwise, use semantic router as tiebreaker
  const semanticChoice = await semanticRouter(userInput);
  return semanticChoice.execute(userInput);
}
```

**Trade-off:** Balances autonomy with predictability. Agents have agency for clear cases.

### Phase 3: Full Agentic Routing (True Agency)

**Goal:** Complete agent autonomy with distributed consensus

**Approach:**
```typescript
async function agenticRouting(userInput: string) {
  // 1. Broadcast to all agents
  const bids = await Promise.all([
    tinkerer.evaluateRequest(userInput),
    wanderer.evaluateRequest(userInput),
    noah.evaluateRequest(userInput)
  ]);

  // 2. Distributed consensus
  const winner = selectWinner(bids); // Highest confidence

  // 3. Record for learning
  await recordRoutingDecision({
    request: userInput,
    bids,
    winner,
    timestamp: Date.now()
  });

  // 4. Execute
  const result = await winner.agent.execute(userInput);

  // 5. Retrospective learning
  await updateAgentCapabilities(winner.agentName, result.success);

  return result;
}
```

**Trade-off:** Most autonomous, most adaptive, but requires all agents to implement evaluation.

---

## 8. Answering the User's Challenge

### Original Challenge

> "Can you do this in a way that is truly agentic and not impressive pattern matching?"

### Answer: YES

True agentic routing requires:

1. **Agent Self-Evaluation**: Each agent analyzes request independently
2. **Capability-Based Bidding**: Agents express confidence, not central router deciding
3. **Distributed Consensus**: Winner selected by distributed logic, not central authority
4. **Learning Loop**: Agents improve their bidding from outcomes
5. **Minimal Redundancy**: Single intent analysis by winning agent, not layered LLM calls

### What Makes It "Truly Agentic"

- **Autonomy**: Agents decide if they want/should handle work
- **Initiative**: Agents proactively evaluate rather than waiting to be assigned
- **Adaptation**: Agents learn which requests they're good at handling
- **Goal-Driven**: Agents optimize for successful outcomes, not just executing commands
- **Contextual Awareness**: Agents see full request context, not filtered through router

### What to Avoid (Not Truly Agentic)

- **LLM-based semantic router**: Still centralized authority (smarter pattern matching)
- **Keyword matching**: Rule-based automation
- **Supervisor assigns tasks**: Removes agent autonomy
- **Multiple intent analyses**: Layers of redundancy

---

## 9. Comparison Table

| Aspect | Keyword Router | LLM Semantic Router | Agent Self-Selection |
|--------|---------------|---------------------|---------------------|
| **Decision Maker** | Hardcoded rules | Central LLM | Individual agents |
| **Agent Autonomy** | None | None | Full |
| **Adaptability** | Fixed patterns | Better generalization | Learns from outcomes |
| **Redundancy** | Low (but brittle) | Medium (2 LLM calls) | Low (parallel, distributed) |
| **Scalability** | Poor | Medium | Excellent |
| **Failure Mode** | Gaming keywords | Misclassification cascades | Graceful (2nd choice) |
| **True Agency?** | ❌ No | ❌ No (smarter automation) | ✅ Yes |

---

## 10. Recommended Implementation Plan

### Immediate: Document Current State

- [x] Created `/ROUTING-TECHNICAL-DEBT.md`
- [x] Added Priority 0 to roadmap
- [x] Acknowledged keyword routing is brittle

### Next: Research (This Document)

- [x] Cross-reference assumptions with best practices
- [x] Understand true agency vs pattern matching
- [x] Identify "layers of redundancy" anti-pattern

### Build: Hybrid Agency (Recommended)

**Rationale:** Start with agent self-evaluation while maintaining semantic fallback

**Implementation:**
1. Add `evaluateRequest()` method to each agent
2. Agents return confidence score + reasoning
3. If clear winner (confidence > 0.8), use it
4. Otherwise, use semantic router as tiebreaker
5. Record all routing decisions for learning

**Effort:** ~4 hours (2h implementation, 2h testing)

### Evolve: Full Agentic (Future)

**When:** After hybrid approach proves stable

**Implementation:**
1. Remove semantic fallback
2. Add distributed consensus logic (weighted voting, ensemble, etc.)
3. Add retrospective learning from routing outcomes
4. Add agent capability profiles that evolve

**Effort:** ~6 hours

---

## 11. Key Takeaways

1. **LLM-based routing is not truly agentic**—it's centralized orchestration with smarter pattern matching

2. **True agency requires distributed decision-making**—agents autonomously decide if they should handle work

3. **"Layers of redundancy" refers to**:
   - Router LLM analyzes intent
   - Agent LLM analyzes same intent again
   - Multiple sequential LLM calls add latency
   - No agent autonomy in decision

4. **Agent self-selection is the agentic approach**:
   - Broadcast request to all agents
   - Each evaluates their capability independently
   - Highest confidence wins
   - Learning improves future bids

5. **Hybrid approach is pragmatic starting point**:
   - Agent bidding for clear cases
   - Semantic fallback for ambiguous cases
   - Balance between autonomy and predictability

6. **Current best practices (2024-2025)**:
   - Choreography over orchestration for true agency
   - Controller flexibility (spectrum of autonomy)
   - Planner pattern outperforms centralized orchestrator
   - Contract Net Protocol for agent bidding

---

## 12. References

### Research Sources

1. **IBM - AI Agent Orchestration** (2024)
   - Centralized vs Decentralized orchestration
   - Controller flexibility concepts

2. **Microsoft Azure - AI Agent Design Patterns** (2024)
   - Orchestration patterns for multi-agent systems
   - Hybrid approaches

3. **LangGraph Documentation - Multi-Agent Workflows** (2024)
   - Dynamic routing with conditional edges
   - Supervisor pattern implementation

4. **arXiv - Multi-Agent LLM Systems** (2024)
   - Planner vs Orchestrator performance comparison
   - Self-resource allocation in multi-agent systems

5. **Industry Best Practices (Botpress, Patronus, Q3Tech)** (2024-2025)
   - Agent routing best practices
   - Agentic AI vs traditional automation

6. **Multi-Agent Research** (Various)
   - Contract Net Protocol for agent bidding
   - Distributed decision-making mechanisms

---

## Conclusion

The research is clear: **truly agentic routing requires distributed decision-making where agents self-select based on capability evaluation**, not centralized orchestration where an external authority (even an LLM) assigns work.

Our current keyword-based routing is automation pretending to be intelligent. LLM-based semantic routing would be smarter automation, but still centralized authority removing agent autonomy.

The path forward is agent self-selection with capability-based bidding, which aligns with current best practices and avoids "layers of redundancy" by giving agents full context to autonomously decide if they should handle the work.
