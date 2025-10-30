# TryItAI → TryItAIagentic Refactoring Plan

**Created:** October 30, 2025
**Purpose:** Strategic refactoring plan to enhance TryItAI with WhitespaceIQ's advanced agentic capabilities

---

## Executive Summary

**Decision: Refactor, Don't Rebuild**

TryItAI already has a sophisticated multi-agent system with excellent UI/UX and production infrastructure. Rather than rebuilding from scratch (4-6 weeks), we'll strategically refactor core agentic patterns (2-3 weeks) to incorporate WhitespaceIQ's advanced capabilities.

---

## Current State Analysis

### TryIt-AI-Replit Strengths
- **Well-organized architecture** with clear separation of concerns
- **Custom multi-agent system** (Noah/Wanderer/Tinkerer) with delegation logic
- **RAG implementation** with ChromaDB and 21 reference design patterns
- **Production-ready** infrastructure with proper error handling
- **Clean TypeScript codebase** (~7,900 lines)
- **Excellent UI/UX** (Trust Recovery Protocol, Skeptic Mode, Session Toolbox)
- **Multi-provider LLM support** (Anthropic, OpenAI)
- **Zero-impact analytics** with fire-and-forget architecture
- **Safety-first design** with content filtering

### WhitespaceIQ-MVP Agentic Advantages
- **LangGraph state machines** for complex workflow orchestration
- **Self-evaluation loops** with confidence scoring (≥ 0.8 threshold)
- **Multi-agent negotiation** with feedback loops
- **Conditional edges** for autonomous agent decision-making
- **Bounded autonomy** with max_iterations safety valves
- **RAG-powered reasoning** using semantic framework knowledge
- **Graceful degradation** with automatic LLM provider fallback
- **Agent-to-agent communication** for collaborative problem-solving

---

## Key Architectural Differences

| Aspect | TryIt-AI-Replit (Current) | WhitespaceIQ-MVP (Target) |
|--------|---------------------------|---------------------------|
| **Agent Framework** | Custom-built base class | LangGraph StateGraph |
| **Agent Pattern** | Simple delegation (Noah → specialists) | Multi-agent negotiation & self-evaluation |
| **Decision Making** | Rule-based request analysis | Semantic reasoning with conditional edges |
| **Quality Control** | None | Self-evaluation with confidence thresholds |
| **RAG Usage** | Pattern injection | Semantic framework knowledge retrieval |
| **Agent Communication** | One-way (Noah delegates) | Two-way (agents negotiate) |
| **Error Handling** | Try-catch with fallback | Bounded autonomy + graceful degradation |
| **Stack** | Next.js fullstack | FastAPI backend + separate frontend |
| **Vector Storage** | ChromaDB (standalone) | pgvector (PostgreSQL integrated) |

---

## Refactoring Phases

### Phase 1: Core Agentic Patterns (Medium Effort - Week 1)

**Goal:** Replace custom agent base class with LangGraph state machines

#### Tasks:
1. **Install Dependencies**
   ```bash
   npm install @langchain/langgraph @langchain/core
   ```

2. **Create LangGraph Agent Base**
   - File: `/src/lib/agents/langgraph-base-agent.ts`
   - Convert `BaseAgent` class to use `StateGraph`
   - Define agent state interface:
     ```typescript
     interface AgentState {
       messages: Message[];
       currentStep: string;
       confidence?: number;
       needsRevision?: boolean;
       iterationCount: number;
     }
     ```

3. **Add Self-Evaluation to Tinkerer**
   - File: `/src/lib/agents/practical-agent.ts`
   - Add evaluation node after tool generation:
     ```typescript
     .addNode("evaluate", async (state) => {
       const confidence = await evaluateToolQuality(state);
       return { ...state, confidence };
     })
     .addConditionalEdges("evaluate", (state) => {
       return state.confidence >= 0.8 ? "complete" : "revise";
     })
     ```

4. **Implement Conditional Edges**
   - Replace static workflows with dynamic decision-making
   - Agents autonomously decide: continue, revise, or escalate

5. **Add Bounded Autonomy**
   - Implement `maxIterations` safety valve (default: 3)
   - Prevent infinite loops in self-evaluation cycles

**Files to Modify:**
- `/src/lib/agents/base-agent.ts` → `/src/lib/agents/langgraph-base-agent.ts`
- `/src/lib/agents/practical-agent.ts` (Tinkerer)
- `/src/lib/agents/wanderer-agent.ts` (Wanderer)

**What to Keep:**
- Agent personas (Noah/Wanderer/Tinkerer)
- Provider factory pattern
- Existing tool generation logic
- RAG integration points

---

### Phase 2: Enhanced RAG & Semantic Reasoning (Low-Medium Effort - Week 1-2)

**Goal:** Add semantic framework knowledge retrieval like WhitespaceIQ

#### Tasks:
1. **Decision: Keep ChromaDB or Migrate to pgvector?**
   - **Option A (Recommended):** Keep ChromaDB (faster to implement)
   - **Option B:** Migrate to pgvector (better PostgreSQL integration)

2. **Enhance Tool Knowledge Service**
   - File: `/src/lib/agents/tool-knowledge-service.ts`
   - Add semantic search for pattern selection (not just keyword matching)
   - Implement relevance scoring based on request context

3. **Create Framework Knowledge Repository**
   - Similar to WhitespaceIQ's methodology documents
   - Store best practices, design patterns, common pitfalls
   - Make queryable via RAG during agent reasoning

4. **RAG-Powered Agent Reasoning**
   - Before generating tools, query framework knowledge
   - Inject relevant context into agent prompts
   - Example: "Based on similar patterns, this approach works best..."

**Files to Modify:**
- `/src/lib/agents/tool-knowledge-service.ts`
- `/src/lib/knowledge/tool-reference-service.ts`
- Create: `/src/lib/knowledge/framework-knowledge-service.ts`

**New Knowledge Base:**
- `/knowledge/framework/` - Best practices and methodology
- `/knowledge/patterns/` - Design patterns (expand existing 21)

---

### Phase 3: Multi-Agent Negotiation (Medium-High Effort - Week 2)

**Goal:** Add agent-to-agent communication and feedback loops

#### Tasks:
1. **Implement Feedback Mechanism**
   - Wanderer researches → provides feedback to Tinkerer
   - Tinkerer builds → Wanderer validates approach
   - Negotiation loop with max 2 rounds

2. **Create Validation Agent** (Optional)
   - Similar to WhitespaceIQ's Insight Validator
   - Reviews Tinkerer's tool output
   - Provides quality scores and improvement suggestions

3. **Enhanced Orchestration in Noah**
   - File: `/src/app/api/chat/route.ts`
   - Add multi-agent coordination logic:
     ```typescript
     // Example flow:
     research = await wanderer.process(request);
     if (request.needsBuilding) {
       feedback = await wanderer.evaluatePlan(tinkerPlan);
       tool = await tinkerer.build(request, research, feedback);
     }
     ```

4. **Quality Gates**
   - Implement retry logic with quality thresholds
   - If confidence < 0.8, trigger revision with specific feedback
   - Max 3 attempts before fallback to simpler approach

**Files to Modify:**
- `/src/app/api/chat/route.ts` (Noah orchestration)
- `/src/lib/agents/wanderer-agent.ts` (add evaluation capability)
- `/src/lib/agents/practical-agent.ts` (accept feedback, revise)

**New Files:**
- `/src/lib/agents/validator-agent.ts` (optional quality checker)
- `/src/lib/agents/agent-communication.ts` (feedback protocols)

---

### Phase 4: Advanced Orchestration (Optional - Week 3)

**Goal:** Add advanced features from WhitespaceIQ for production resilience

#### Tasks:
1. **Graceful Degradation**
   - Already have multi-provider support!
   - Enhance with automatic retry on provider failure
   - Track provider performance metrics

2. **Agent Performance Monitoring**
   - Extend existing analytics to track:
     - Agent confidence scores
     - Revision rates
     - Average iterations per task
     - Provider fallback frequency

3. **Adaptive Model Selection**
   - Currently: task-type optimization (research/deepbuild)
   - Enhance: dynamic model selection based on complexity
   - Simple tasks → Haiku/GPT-4o-mini
   - Complex tasks → Sonnet 4/GPT-4o

4. **State Persistence**
   - Save agent state to PostgreSQL
   - Resume interrupted workflows
   - Support long-running multi-step tasks

**Files to Modify:**
- `/src/lib/providers/provider-factory.ts`
- `/src/lib/analytics/` (extend tracking)
- `/src/app/api/chat/route.ts` (state persistence)

---

## What to Keep (Don't Touch!)

### Preserve Entirely:
✅ **Frontend UI/UX**
- Trust Recovery Protocol
- Skeptic Mode
- Session-based Toolbox
- Challenge message capability
- Streaming chat interface

✅ **Infrastructure**
- Next.js App Router architecture
- API route structure
- PostgreSQL analytics database
- Deployment configuration (Replit/Vercel)

✅ **Support Systems**
- Safety/content filtering (`/src/lib/safety/`)
- Analytics fire-and-forget logging (`/src/lib/analytics/`)
- Provider factory pattern (`/src/lib/providers/`)
- Session management

### Enhance, Don't Replace:
🔧 **Agent System**
- Keep personas, enhance with LangGraph
- Keep delegation logic, add negotiation

🔧 **RAG System**
- Keep ChromaDB (or migrate to pgvector)
- Keep reference patterns, add semantic reasoning

🔧 **Tool Generation**
- Keep Tinkerer's generation logic
- Add self-evaluation and revision

---

## Implementation Strategy

### Incremental Approach (Recommended)

**Week 1: Tinkerer Enhancement**
1. Convert Tinkerer to LangGraph agent
2. Add self-evaluation loop
3. Test and validate improvement
4. Compare: old vs. new tool quality

**Week 2: Multi-Agent Communication**
1. Add Wanderer ↔ Tinkerer feedback
2. Implement quality gates
3. Test negotiation workflows

**Week 3: Production Hardening**
1. Add bounded autonomy
2. Enhance graceful degradation
3. Performance monitoring
4. Documentation and testing

### Testing Strategy

**Benchmarks to Track:**
- Tool generation quality (human evaluation)
- Average iterations per task
- Confidence scores
- Time to completion (ensure ≤ current performance)
- Provider fallback frequency

**Test Cases:**
- Simple tool request (should be fast, no iterations)
- Complex tool with ambiguity (should trigger revision)
- Research + build task (should show agent negotiation)
- Edge cases and error handling

---

## Risk Mitigation

### Potential Issues:

1. **Performance Degradation**
   - Risk: Self-evaluation adds latency
   - Mitigation: Set timeout limits, track metrics, optimize prompts

2. **Infinite Loops**
   - Risk: Agents get stuck in revision cycles
   - Mitigation: Bounded autonomy (max 3 iterations)

3. **Increased Complexity**
   - Risk: Harder to debug multi-agent interactions
   - Mitigation: Enhanced logging, state visualization

4. **Cost Increase**
   - Risk: More LLM calls for evaluation/negotiation
   - Mitigation: Use cheaper models for evaluation (Haiku/4o-mini)

### Rollback Plan:

- Keep original TryItAI repo as backup
- Feature flags for new agentic capabilities
- A/B test: old vs. new agent system
- If quality degrades, roll back incrementally

---

## Success Criteria

### Phase 1 Success:
- [ ] Tinkerer uses LangGraph state machine
- [ ] Self-evaluation loop operational
- [ ] Confidence scores tracked in analytics
- [ ] Tool quality equal or better than baseline

### Phase 2 Success:
- [ ] Semantic framework knowledge retrieval working
- [ ] RAG provides relevant context to agents
- [ ] Pattern selection improved with relevance scoring

### Phase 3 Success:
- [ ] Wanderer ↔ Tinkerer feedback loop functional
- [ ] Quality gates prevent low-confidence outputs
- [ ] Multi-agent negotiation visible in logs

### Overall Success:
- [ ] Tool quality improved (measured by user ratings)
- [ ] Response time within acceptable range (< 60s for complex tasks)
- [ ] Self-evaluation reduces errors (fewer user corrections)
- [ ] System more transparent (users see agent reasoning)

---

## Estimated Effort

| Phase | Tasks | Effort | Timeline |
|-------|-------|--------|----------|
| Phase 1 | Core agentic patterns | 3-4 days | Week 1 |
| Phase 2 | Enhanced RAG | 2-3 days | Week 1-2 |
| Phase 3 | Multi-agent negotiation | 4-5 days | Week 2 |
| Phase 4 | Advanced orchestration | 3-4 days | Week 3 |
| **Total** | | **12-16 days** | **2-3 weeks** |

Compare to full rebuild: **4-6 weeks**

---

## Next Steps

1. **Review and Approve Plan**
   - Validate approach with stakeholders
   - Prioritize phases based on value

2. **Set Up Development Environment**
   - Create feature branch: `feat/agentic-refactor`
   - Install LangGraph dependencies
   - Set up testing infrastructure

3. **Start Phase 1**
   - Begin with Tinkerer LangGraph conversion
   - Implement self-evaluation loop
   - Measure baseline vs. enhanced performance

4. **Iterate and Refine**
   - Gather feedback after each phase
   - Adjust plan based on learnings
   - Maintain documentation

---

## References

- **WhitespaceIQ Agentic Architecture**: See `AGENTIC_ARCHITECTURE_EXPLORATION_2025_10_30.md`
- **TryItAI Current Architecture**: See `replit.md` in project root
- **LangGraph Documentation**: https://langchain-ai.github.io/langgraph/
- **Architecture Decision Framework**: See `.architecture-first.md`

---

## Conclusion

Refactoring TryItAI to incorporate WhitespaceIQ's agentic capabilities is **feasible and recommended** over a full rebuild. By strategically enhancing core patterns (LangGraph, self-evaluation, multi-agent negotiation) while preserving excellent UI/UX and infrastructure, we can achieve advanced agentic capabilities in 2-3 weeks instead of 4-6 weeks for a complete rebuild.

The incremental approach allows for testing and validation at each phase, reducing risk and ensuring quality improvements are measurable and maintainable.
