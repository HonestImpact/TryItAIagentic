# Three-Table Knowledge Architecture

**Date:** November 9, 2025
**Status:** ✅ IMPLEMENTED
**Purpose:** Comprehensive explanation of Noah's dual-source knowledge system

---

## 📋 Table of Contents

1. [The Big Picture](#the-big-picture)
2. [The Three Tables Explained](#the-three-tables-explained)
3. [What Changed: ChromaDB → pgvector](#what-changed-chromadb--pgvector)
4. [How They Work Together](#how-they-work-together)
5. [Data Flow Examples](#data-flow-examples)
6. [Why This Architecture](#why-this-architecture)
7. [Technical Details](#technical-details)

---

## 🎯 The Big Picture

Noah uses **three complementary tables** to provide intelligent tool generation:

```
┌──────────────────────────────────────────────────────────────┐
│         PostgreSQL Database (ONE SERVICE)                    │
│                                                              │
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────┐ │
│  │ tool_reference   │  │ generated_tools  │  │rag_       │ │
│  │                  │  │                  │  │embeddings │ │
│  │ Static Templates │  │ User Creations   │  │ Semantic  │ │
│  │ Keyword Search   │  │ Analytics        │  │ Learning  │ │
│  └──────────────────┘  └──────────────────┘  └───────────┘ │
│         ↓                      ↓                    ↓        │
│    STRUCTURE              HISTORY              INTELLIGENCE  │
└──────────────────────────────────────────────────────────────┘
```

**The Philosophy:**
- **Table 1** (tool_reference): Curated expertise → "Here are proven patterns"
- **Table 2** (generated_tools): Historical record → "Here's what we've built"
- **Table 3** (rag_embeddings): Semantic understanding → "These concepts are related"

**Together they enable:** Fast exact matches + Rich analytics + Smart discovery

---

## 📊 The Three Tables Explained

### **Table 1: `tool_reference` - The Template Library**

**What it is:**
- 21 hand-crafted, high-quality tool templates
- Imported once from `tools/reference-library/*.html`
- Static (doesn't grow with usage)

**What it stores:**
```sql
CREATE TABLE tool_reference (
  id SERIAL PRIMARY KEY,
  tool_name TEXT,
  title TEXT,
  description TEXT,
  category TEXT,
  features TEXT,
  functionality TEXT,
  usage_patterns TEXT,
  html_content TEXT,  -- Full working HTML
  filename TEXT,
  created_at TIMESTAMP
);
```

**Example Row:**
```json
{
  "id": 8,
  "tool_name": "budget-tracker",
  "title": "Budget Tracker - Personal Finance Management",
  "category": "Finance & Planning",
  "features": "Income tracking, Expense categories, Budget visualization",
  "functionality": "Real-time calculations, Category filtering, Visual progress bars",
  "usage_patterns": "Personal budgeting, Expense tracking, Financial planning",
  "html_content": "<!DOCTYPE html><html>...</html>",
  "created_at": "2025-11-08"
}
```

**Search Type:** Keyword matching (PostgreSQL full-text search)

**Search Example:**
```sql
-- User asks for "budget tool"
SELECT * FROM tool_reference
WHERE to_tsvector('english', title || ' ' || description || ' ' || features)
  @@ plainto_tsquery('english', 'budget tool')
ORDER BY ts_rank(...) DESC;

-- Result: Budget Tracker (exact match)
```

**Purpose:** Provide high-quality, battle-tested templates for common use cases

**Code Location:** `src/lib/knowledge/tool-reference-service.ts`

---

### **Table 2: `generated_tools` - The Creation History**

**What it is:**
- Every tool Noah generates for users
- Grows organically with usage
- Rich metadata for analytics

**What it stores:**
```sql
CREATE TABLE generated_tools (
  id UUID PRIMARY KEY,
  conversation_id UUID REFERENCES conversations(id),
  session_id UUID REFERENCES user_sessions(id),
  message_id UUID REFERENCES messages(id),
  content_hash TEXT UNIQUE,  -- SHA-256 for deduplication
  title TEXT NOT NULL,
  content TEXT NOT NULL,      -- Full HTML
  content_type TEXT,
  content_length INTEGER,
  tool_type TEXT,
  tool_category TEXT,
  generation_time_ms INTEGER,
  generation_agent TEXT,      -- 'noah', 'wanderer', 'tinkerer'
  user_message_length INTEGER,
  version INTEGER DEFAULT 1,
  download_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Example Row:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Grocery Budget Planner",
  "content": "<!DOCTYPE html><html>...</html>",
  "tool_category": "finance",
  "generation_time_ms": 3240,
  "generation_agent": "tinkerer",
  "user_message_length": 87,
  "created_at": "2025-11-09T14:23:11"
}
```

**Search Type:** Keyword + filters (session, date, category, agent)

**Search Example:**
```sql
-- Show user their toolbox
SELECT title, created_at, generation_agent
FROM generated_tools
WHERE session_id = $1
ORDER BY created_at DESC;

-- Analytics: Most common categories
SELECT tool_category, COUNT(*) as count
FROM generated_tools
GROUP BY tool_category
ORDER BY count DESC;
```

**Purpose:**
1. **User toolbox** - "Show me my tools"
2. **Analytics** - Track usage patterns, performance, quality
3. **Learning data** - What problems are users solving?

**Code Location:** `src/lib/analytics/database.ts` (logGeneratedTool)

---

### **Table 3: `rag_embeddings` - The Semantic Brain**

**What it is:**
- Vector embeddings of ALL tools (templates + generated)
- Enables semantic search ("budget tool" finds "expense tracker")
- Learns from every tool Noah creates

**What it stores:**
```sql
CREATE TABLE rag_embeddings (
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL,           -- Full HTML
  embedding vector(1536),          -- OpenAI embedding (1536 dimensions)
  metadata JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for fast search
CREATE INDEX ON rag_embeddings USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX ON rag_embeddings USING GIN (metadata);
CREATE INDEX ON rag_embeddings USING GIN (to_tsvector('english', content));
```

**Example Row:**
```json
{
  "id": "tool_reference_8",
  "content": "<!DOCTYPE html><html>...</html>",
  "embedding": [-0.033, -0.024, 0.018, ...],  // 1536 numbers
  "metadata": {
    "source": "tool_reference",
    "type": "knowledge",
    "title": "Budget Tracker - Personal Finance Management",
    "category": "Finance & Planning",
    "timestamp": "2025-11-08T12:00:00Z"
  },
  "created_at": "2025-11-09"
}
```

**Search Type:** Semantic similarity (cosine distance between vectors)

**Search Example:**
```sql
-- User asks for "expense tracking tool"
-- (even though "Budget Tracker" doesn't contain those exact words!)

-- Generate embedding for query
query_embedding = openai.embed("expense tracking tool")  -- [0.012, -0.045, ...]

-- Find similar tools
SELECT
  metadata->>'title' as title,
  1 - (embedding <=> $query_embedding::vector) as similarity
FROM rag_embeddings
WHERE 1 - (embedding <=> $query_embedding::vector) >= 0.7
ORDER BY similarity DESC
LIMIT 5;

-- Results:
-- 1. Budget Tracker - Personal Finance Management (0.89)
-- 2. Simple Kanban - 3-Column Workflow Board (0.72)
-- 3. Habit Tracker - Visual Calendar (0.68)
```

**Purpose:** Understand concepts, not just keywords
- "budget tool" → finds "expense tracker" ✅
- "habit tracker" → finds "routine builder" ✅
- "finance planner" → finds "budget tracker" ✅

**Code Location:** `rag/vector-store-pgvector.ts`

---

## 🔄 What Changed: ChromaDB → pgvector

### **The Original Plan (Your Understanding):**

**Three Tables:**
1. ✅ `tool_reference` (PostgreSQL) - Templates
2. ✅ `generated_tools` (PostgreSQL) - History
3. ❌ **ChromaDB** (Separate Docker Service) - Semantic embeddings

**The Problem:**
```
Container wakes after 5min sleep
    ↓
PostgreSQL connects instantly (persistent) ✅
    ↓
ChromaDB loads from disk (30-40 seconds) ❌
    ↓
User waits...
    ↓
User abandons (bad UX)
```

**Why ChromaDB Failed:**
- Cold start: 30-40 seconds to load embeddings ❌
- Scale-to-zero incompatible (needs always-on or reload every wake) ❌
- Separate service to manage ❌
- Additional $30-50/month to keep running ❌

---

### **The New Implementation:**

**Three Tables:**
1. ✅ `tool_reference` (PostgreSQL) - Templates (unchanged)
2. ✅ `generated_tools` (PostgreSQL) - History (unchanged)
3. ✅ **`rag_embeddings` (PostgreSQL + pgvector)** - Semantic embeddings (same function, better tech)

**The Solution:**
```
Container wakes after 5min sleep
    ↓
PostgreSQL connects (1-2 seconds) ✅
    ↓
ALL tables ready (including embeddings) ✅
    ↓
User gets instant response
```

**Why pgvector Succeeds:**
- Cold start: 1-2 seconds (everything in one database) ✅
- Scale-to-zero perfect (persistent across sleeps) ✅
- One service (simpler ops) ✅
- $0 additional cost (using existing database) ✅

---

### **Side-by-Side Comparison:**

| Aspect | ChromaDB (Original) | pgvector (Implemented) |
|--------|---------------------|------------------------|
| **Semantic Search** | ✅ Yes | ✅ Yes (SAME) |
| **Learning Loop** | ✅ Yes | ✅ Yes (SAME) |
| **Concept Discovery** | ✅ Yes | ✅ Yes (SAME) |
| **Cold Start Time** | ❌ 30-40 seconds | ✅ 1-2 seconds |
| **Scale-to-Zero** | ❌ Broken | ✅ Perfect |
| **Monthly Cost** | ❌ $30-50 extra | ✅ $0 extra |
| **Services to Manage** | ❌ 2 (DB + ChromaDB) | ✅ 1 (Just DB) |
| **Hybrid Search** | ❌ Difficult | ✅ Built-in |

**Bottom Line:** Same functionality, better deployment model.

---

## 🤝 How They Work Together

### **Scenario 1: User Asks for "Budget Tracker"**

**Step 1:** Tool-knowledge-service receives request
```typescript
// src/lib/agents/tool-knowledge-service.ts:40
async getRelevantPatterns(userRequest: "budget tracker")
```

**Step 2:** Extract search terms
```typescript
extractSearchTerms("budget tracker")
// Returns: ["budget", "tracker", "finance", "expense"]
```

**Step 3:** PostgreSQL keyword search (tool_reference)
```typescript
// Line 70-77
for (const term of ["budget", "tracker"]) {
  const tools = await toolReferenceService.searchTools(term, { limit: 3 });
  // Finds: Budget Tracker (exact match)
}
```

**Step 4:** pgvector semantic search (rag_embeddings)
```typescript
// Line 81-109
if (AI_CONFIG.RAG_ENABLED) {
  const semanticResults = await ragSystem.search("budget tracker", {
    maxResults: 5,
    minRelevanceScore: 0.7
  });
  // Finds:
  // - Budget Tracker (0.92 similarity)
  // - Expense Manager (if someone generated one, 0.85)
  // - Financial Planner (if exists, 0.78)
}
```

**Step 5:** Merge and deduplicate
```typescript
// Line 111-113
const uniqueTools = this.deduplicateTools([
  ...keywordResults,   // From PostgreSQL
  ...semanticResults   // From pgvector
]);
```

**Step 6:** Noah builds informed by all sources
- Has exact template from tool_reference
- Has semantic matches showing related concepts
- Has historical examples from generated_tools (if any)

**Result:** High-quality tool using best patterns from all sources

---

### **Scenario 2: User Asks for "Expense Tracking" (No Exact Match)**

**Step 1-2:** Same (extract terms: ["expense", "tracking"])

**Step 3:** PostgreSQL keyword search
```typescript
await toolReferenceService.searchTools("expense")
// Finds: Maybe nothing exact, or low relevance matches
```

**Step 4:** pgvector semantic search (THE MAGIC)
```typescript
const semanticResults = await ragSystem.search("expense tracking", {
  maxResults: 5,
  minRelevanceScore: 0.7
});

// Semantic understanding finds:
// 1. Budget Tracker (0.89) - understands "budget" ≈ "expense tracking"
// 2. Simple Kanban (0.71) - if has "expense" in workflow examples
// 3. Habit Tracker (0.68) - both track daily activities
```

**Step 5-6:** Noah builds using semantic matches
- No exact template, but semantic search found related concepts
- Uses Budget Tracker as inspiration (closest match)
- Adapts pattern for expense-specific features

**Result:** Noah understands what you want even with different words

---

### **Scenario 3: Noah Generates a New Tool**

**User Request:** "Create a grocery budget planner"

**Step 1:** Noah generates the tool (HTML artifact)

**Step 2:** Log to `generated_tools` (analytics)
```typescript
// src/lib/artifact-service.ts:102-112
await analyticsService.logGeneratedTool(
  conversationId,
  sessionId,
  "Grocery Budget Planner",
  htmlContent,
  generationTime,
  "tinkerer"
);
```

**Result:** Stored in PostgreSQL for user toolbox + analytics

**Step 3:** Index to `rag_embeddings` (learning loop)
```typescript
// src/lib/artifact-service.ts:124-145
if (AI_CONFIG.RAG_ENABLED) {
  await ragSystem.addDocuments([{
    id: `${sessionId}_${title}_${Date.now()}`,
    content: htmlContent,
    metadata: {
      source: 'generated',
      type: 'artifact',
      title: 'Grocery Budget Planner',
      category: 'finance',
      timestamp: new Date().toISOString()
    }
  }]);
}
```

**What happens:**
1. Generate embedding via OpenAI ($0.00001)
2. Store in rag_embeddings with vector
3. Immediately available for semantic search

**Step 4:** Next similar request benefits
```
Next user: "Create a shopping expense tracker"
    ↓
Semantic search finds: "Grocery Budget Planner" (0.87 similarity)
    ↓
Noah uses this as additional context
    ↓
Better tool, informed by real user needs
```

**Result:** System learns from every interaction

---

## 🎓 Why This Architecture

### **Problem 1: Keyword Search Alone is Limited**

**Scenario:** User asks for "expense manager"

**Keyword Search:**
```sql
SELECT * FROM tool_reference
WHERE title ILIKE '%expense%' OR title ILIKE '%manager%'
```
**Result:** Nothing (no tools with exact words "expense manager")

**Semantic Search:**
```sql
SELECT * FROM rag_embeddings
WHERE 1 - (embedding <=> query_embedding) >= 0.7
```
**Result:** Budget Tracker (0.89), Financial Planner (0.82)
- Understands "expense manager" ≈ "budget tracker"
- Finds conceptually similar tools even with different words

**Why Both:**
- Keyword: Fast, precise, finds exact matches
- Semantic: Intelligent, understands concepts, finds related patterns

---

### **Problem 2: Static Templates Don't Capture User Needs**

**Scenario:** 100 users each ask for slightly different finance tools:
- "Grocery budget"
- "Monthly rent tracker"
- "Subscription manager"
- "Shopping expense log"
- "Bill payment reminder"

**With Only Templates:**
- All get same "Budget Tracker" template
- Noah doesn't learn what users actually need
- Can't build on previous successes

**With Learning Loop (rag_embeddings):**
- First user: Gets Budget Tracker template
- Noah generates "Grocery Budget Planner"
- Gets indexed to rag_embeddings
- Second user asks for "shopping expenses"
- Semantic search finds both: Budget Tracker (template) + Grocery Budget Planner (previous creation)
- Noah builds something even better, informed by both
- Cycle continues...

**Result:** Intelligence compounds over time

---

### **Problem 3: Can't Learn Without Semantic Understanding**

**Example: Two users ask similar questions with different words**

**User 1:** "Create a tool for tracking daily habits"
**User 2:** "Build something to monitor my routines"

**Keyword Search:**
- User 1: Finds "Habit Tracker" ✅
- User 2: Finds nothing (no "routine" in templates) ❌

**Semantic Search:**
- User 1: Finds "Habit Tracker" (0.95) ✅
- User 2: Finds "Habit Tracker" (0.88) ✅
  - Understands: "monitor routines" ≈ "track habits"

**After Both Generate Tools:**
```
rag_embeddings now contains:
1. Habit Tracker (template)
2. Daily Habit Tracker (User 1's version)
3. Routine Monitor (User 2's version)

User 3 asks: "Help me build consistent behaviors"
Semantic search finds ALL THREE ✅
- Understands: "build behaviors" ≈ "track habits" ≈ "monitor routines"
```

**Without rag_embeddings:** Each user gets disconnected experience
**With rag_embeddings:** System learns the relationship between concepts

---

## 🔧 Technical Details

### **Table Relationships:**

```sql
-- tool_reference: Standalone (no foreign keys)
-- Purpose: Reference library

-- generated_tools: Links to analytics
-- Purpose: Track what Noah creates
generated_tools.conversation_id → conversations.id
generated_tools.session_id → user_sessions.id
generated_tools.message_id → messages.id

-- rag_embeddings: Links conceptually, not by foreign key
-- Purpose: Semantic discovery
rag_embeddings.id = 'tool_reference_' || tool_reference.id (for templates)
rag_embeddings.id = session_id || '_' || title || '_' || timestamp (for generated)
```

**Why rag_embeddings doesn't have foreign keys:**
- Purpose is semantic search, not relational integrity
- Needs to work even if original tool deleted from generated_tools
- Stores content snapshot (not reference to changing data)

---

### **Data Flow:**

```
User Request
    ↓
┌─────────────────────────────┐
│ tool-knowledge-service.ts   │
│ getRelevantPatterns()       │
└─────────────┬───────────────┘
              ↓
     ┌────────┴────────┐
     ↓                 ↓
┌─────────┐      ┌────────────┐
│  Query  │      │   Query    │
│  tool_  │      │    rag_    │
│reference│      │ embeddings │
└────┬────┘      └─────┬──────┘
     │                 │
     ↓                 ↓
  Keyword          Semantic
  Results          Results
     │                 │
     └────────┬────────┘
              ↓
      Merge & Dedupe
              ↓
      Design Patterns
              ↓
         Noah Builds
              ↓
      ┌──────┴──────┐
      ↓             ↓
  Log to        Index to
  generated_    rag_
  tools         embeddings
  (analytics)   (learning)
```

---

### **Indexing Strategy:**

**tool_reference:**
```sql
-- Full-text search on combined text fields
CREATE INDEX tool_reference_fts_idx ON tool_reference
  USING GIN (to_tsvector('english', title || ' ' || description || ' ' || features));
```

**generated_tools:**
```sql
-- Session-based queries (user toolbox)
CREATE INDEX generated_tools_session_idx ON generated_tools(session_id, created_at DESC);

-- Analytics queries (category, agent, time)
CREATE INDEX generated_tools_category_idx ON generated_tools(tool_category);
CREATE INDEX generated_tools_agent_idx ON generated_tools(generation_agent);
```

**rag_embeddings:**
```sql
-- Vector similarity (approximate nearest neighbor)
CREATE INDEX rag_embeddings_embedding_idx ON rag_embeddings
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Metadata filtering
CREATE INDEX rag_embeddings_metadata_idx ON rag_embeddings USING GIN (metadata);

-- Full-text for hybrid search
CREATE INDEX rag_embeddings_content_fts_idx ON rag_embeddings
  USING GIN (to_tsvector('english', content));
```

---

### **Embedding Generation:**

**Service:** OpenAI text-embedding-3-small
**Dimensions:** 1536
**Cost:** $0.00002 per 1000 tokens (~750 words)
**Average Tool:** ~500 tokens = $0.00001 per tool

**Code Location:** `rag/embeddings.ts`

```typescript
async generateEmbedding(text: string): Promise<EmbeddingResult> {
  const result = await embed({
    model: openai.embedding('text-embedding-3-small'),
    value: text
  });

  return {
    embedding: result.embedding,  // Array of 1536 floats
    tokens: result.usage?.tokens || 0
  };
}
```

---

### **Similarity Search:**

**Metric:** Cosine similarity (via distance operator `<=>`)

```sql
-- Distance: 0 (identical) to 2 (opposite)
SELECT embedding <=> query_embedding as distance

-- Similarity: 0 (opposite) to 1 (identical)
SELECT 1 - (embedding <=> query_embedding) as similarity

-- Filter by threshold
WHERE 1 - (embedding <=> query_embedding) >= 0.7
```

**Performance:**
- Exact search (< 100 vectors): ~10ms
- Approximate search (ivfflat, 1000 vectors): ~50-100ms
- Approximate search (ivfflat, 10000 vectors): ~100-200ms

---

### **Hybrid Search (Bonus Feature):**

Because everything is in one database, you can combine keyword + semantic:

```sql
SELECT
  metadata->>'title' as title,
  -- Semantic score (70% weight)
  (1 - (embedding <=> $1::vector)) * 0.7 +
  -- Keyword score (30% weight)
  ts_rank(to_tsvector('english', content), plainto_tsquery($2)) * 0.3
  AS combined_score
FROM rag_embeddings
WHERE
  (1 - (embedding <=> $1::vector)) >= 0.5  -- Semantic threshold
  OR to_tsvector('english', content) @@ plainto_tsquery($2)  -- Keyword match
ORDER BY combined_score DESC
LIMIT 5;
```

**Code Location:** `rag/vector-store-pgvector.ts:hybridSearch()`

**Use Case:**
- User asks: "budget tool with charts"
- Semantic finds: Budget-related tools (concept)
- Keyword ensures: "charts" is actually present (precision)
- Combined score: Best of both worlds

---

## 📚 Summary

### **Three Tables, Three Purposes:**

1. **tool_reference** - Curated Templates
   - What: 21 hand-crafted, high-quality patterns
   - Search: Keyword (fast, exact)
   - Purpose: Proven starting points

2. **generated_tools** - Creation History
   - What: Every tool Noah builds
   - Search: Keyword + filters (session, date, category)
   - Purpose: User toolbox + analytics

3. **rag_embeddings** - Semantic Intelligence
   - What: Vector embeddings of ALL tools
   - Search: Semantic similarity (conceptual understanding)
   - Purpose: Discover related patterns, learn from usage

### **What Changed:**
- ❌ ChromaDB (separate service, 30s cold start)
- ✅ pgvector (same database, instant)

### **What Stayed The Same:**
- ✅ Three-table architecture
- ✅ Dual-source search (keyword + semantic)
- ✅ Learning loop (auto-index on generation)
- ✅ Semantic understanding
- ✅ Concept discovery

### **The Result:**
- Same intelligence
- Better performance
- Lower cost
- Simpler operations
- **Scale-to-zero compatible** ← This enables your mission

---

**Related Documentation:**
- `PGVECTOR_RAG_IMPLEMENTATION.md` - Technical implementation details
- `DUAL_ROUTING_STRATEGY.md` - How Noah routes between agents
- `migrations/004_add_pgvector_rag.sql` - Database schema

**Last Updated:** November 9, 2025
**Author:** Noah Development Team
**Purpose:** Explain the three-table knowledge architecture to developers and stakeholders
