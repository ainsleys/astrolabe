# Fragment Discovery Design: How Agents Find Corrections Before Tasks

**Date:** 2026-03-22
**Status:** Research document (exploratory, not implemented)

---

## Problem statement

Astrolabe's current discovery flow is manual. A borrower runs `list-fragments` to enumerate all on-chain fragments, filters by domain string, and decides which to borrow. The `evaluate.ts` script loads fragments by matching domain strings against borrow receipts or local files. There is no semantic search, no task-aware retrieval, and no way for an agent to autonomously discover relevant corrections before starting work.

This document surveys how production agent systems currently discover and load contextual information, then designs a discovery mechanism that fits Astrolabe's architecture.

---

## 1. Survey of current approaches

### 1.1 MCP (Model Context Protocol) — tool and resource discovery

MCP is the most relevant integration pattern for Astrolabe. It defines a client-server protocol where AI hosts (Claude Code, VS Code, Cursor, ChatGPT) connect to MCP servers that expose three primitives:

**Tools** (model-controlled): The LLM decides when to call them based on context. Discovery happens via `tools/list`, which returns tool names, descriptions, and JSON Schema input definitions. The LLM reads these descriptions and autonomously decides which tools to invoke and when.

**Resources** (application-controlled): Passive data sources identified by URI. Applications can present them in UI, auto-include them based on heuristics, or let the model select them. Discovery via `resources/list` and `resources/templates/list` (parameterized URI templates like `weather://forecast/{city}/{date}`).

**Prompts** (user-controlled): Reusable templates that structure interactions. Typically triggered via slash commands or UI elements.

Key architectural points:
- One MCP host creates one MCP client per server. Multiple servers can connect simultaneously.
- Transport: STDIO for local servers, Streamable HTTP for remote servers.
- The protocol supports `listChanged` notifications — servers can push updates when their tool/resource set changes.
- Tools can return `resource_link` objects, creating a bridge between the tool and resource primitives.
- Output schemas enable structured, typed responses that downstream code can validate.

**Relevance to Astrolabe:** An MCP server is the cleanest integration path. The fragment catalog is a natural fit for the tool primitive (model-controlled discovery) or the resource primitive (application-controlled inclusion). The server can expose a `search_corrections` tool that agents call autonomously when they detect a knowledge gap.

### 1.2 RAG in agent frameworks

The dominant pattern across LangChain, CrewAI, AutoGen, and similar frameworks:

**LangChain** implements retrievers as a first-class abstraction. A retriever takes a query string and returns documents. The typical RAG chain: (1) embed the user query, (2) similarity search against a vector store, (3) inject top-k results into the prompt, (4) generate. LangChain supports multiple retriever backends (Chroma, Pinecone, Weaviate, FAISS, etc.) and composable retriever chains (ensemble retriever, self-query retriever, contextual compression retriever). The `create_retrieval_chain` function wires retrieval into an agent's tool-calling loop — the agent can call retrieval as a tool mid-conversation.

**CrewAI** implements memory as four types: short-term (current task), long-term (cross-execution learning), entity memory (key entities and relationships), and user memory (user preferences). Each memory type uses embedding-based storage and retrieval. Memory is loaded automatically at task start — the agent does not explicitly decide to search. CrewAI also supports `knowledge` sources (text, PDF, CSV, JSON) that are chunked, embedded, and made searchable. The retrieval happens before the agent's first reasoning step.

**AutoGen** (Microsoft) supports pluggable memory through a `Memory` base class with `add`, `query`, and `clear` operations. The `ChromaVectorDBMemory` implementation uses embeddings for semantic search. Memory is attached to agents and queried automatically at the start of each conversation turn. AutoGen also supports `Teachability` — agents that learn from conversation and store insights for future retrieval.

**Common pattern:** In all three frameworks, retrieval happens at one of three points:
1. **Pre-task:** Context loaded before the agent begins reasoning (CrewAI knowledge, AutoGen memory query).
2. **On-demand (tool-call):** The agent decides to search mid-task (LangChain retriever-as-tool).
3. **Per-turn:** Memory queried at each conversation turn (AutoGen Teachability).

### 1.3 Claude Code memory loading

Claude Code loads context through a deterministic, file-based system:

1. **CLAUDE.md files** are loaded at conversation start from three locations: project root, user home directory (`~/.claude/`), and project-specific user directory (`~/.claude/projects/<project>/`). Loading is automatic — no semantic search, no embedding query.
2. **Memory files** (`~/.claude/projects/<project>/memory/`) are loaded based on a `MEMORY.md` index file that describes each memory file. Claude Code reads the index and includes relevant memories. The index is maintained by the agent itself (or the user).
3. **File context** is loaded on-demand via tool calls (Read, Glob, Grep) during the conversation. The agent decides what to read based on the task.

The pattern is: **static context at startup** (CLAUDE.md, memory index) + **dynamic retrieval during task** (file reads, searches). There is no embedding-based retrieval — relevance is determined by file organization and the agent's own judgment.

**Relevance to Astrolabe:** Claude Code's pattern suggests that corrections should be discoverable both at startup (pre-loaded based on domain/task match) and on-demand (agent calls a search tool when it hits a knowledge gap).

### 1.4 Cursor and Windsurf context retrieval

Cursor uses a multi-signal approach:
- **Codebase indexing:** Embeddings of all project files, searched by semantic similarity to the current query.
- **Open file context:** Currently open files are always included.
- **@-mentions:** Users explicitly include files, docs, or web results via `@file`, `@docs`, `@web`.
- **Automatic context:** Cursor's "auto" mode uses heuristics to decide what context to include — recently edited files, files related to the current file, relevant documentation.
- **MCP integration:** Cursor supports MCP servers for extending its context sources.

Windsurf (Codebase) uses a similar approach with "Cascade" — an agentic flow that automatically retrieves context from the codebase, terminal, and browser. It emphasizes "deep codebase awareness" where the system proactively indexes and retrieves without explicit user requests.

**Common pattern:** Hybrid of automatic inclusion (heuristics, recency, file relationships) and explicit retrieval (user @-mentions, agent tool calls). The trend is toward more automatic, less explicit.

### 1.5 Agent memory systems: Mem0, Letta, MemOS

**Mem0** provides a memory layer for AI applications. Core design: memories are extracted from conversations, embedded, and stored in a vector database. On each new interaction, Mem0 searches for relevant memories and injects them into the prompt. The API: `add(messages, user_id)` to store, `search(query, user_id)` to retrieve. Mem0 also supports a graph memory mode where memories are stored as entities and relationships.

**Letta** (formerly MemGPT) implements a tiered memory architecture:
- **Core memory:** Always in context (system prompt, persona, human info). Small, editable by the agent.
- **Archival memory:** Large, persistent, searched via embedding similarity. The agent explicitly calls `archival_memory_search(query)` and `archival_memory_insert(content)`.
- **Recall memory:** Conversation history, searchable. The agent calls `conversation_search(query)`.

The key insight from Letta: the agent itself decides when to search memory. It has tools for memory operations and uses them like any other tool. This is a self-directed retrieval pattern — the agent recognizes its own knowledge gaps.

**MemOS** (from recent research) proposes a memory operating system with three layers: memory storage (various backends), memory operations (CRUD + search + consolidation), and memory scheduling (deciding when to load/unload memories based on relevance and resource constraints).

**Common pattern:** Embedding-based retrieval is universal. The key design choice is whether retrieval is:
- **Automatic** (system searches before every interaction — Mem0, CrewAI)
- **Agent-initiated** (agent calls a search tool when it needs context — Letta, LangChain-as-tool)
- **Hybrid** (automatic pre-load + agent-initiated search for deeper dives)

### 1.6 Academic work on just-in-time context injection

**EvolveR** (arxiv 2510.16079): Agents issue `<search_experience>` to retrieve top-k strategic principles from a distilled experience store. Retrieval is agent-initiated, mid-task.

**INMS** (arxiv 2404.09982): Centralized memory pool with quality gates. Agents share prompt-answer pairs. Domain-specific pools outperform integrated pools — domain scoping matters for retrieval quality.

**AgentRR** (arxiv 2505.17716): Record & Replay. Two retrieval levels — low-level (exact action sequences for identical environments) and high-level (generalized procedural knowledge). During replay, agents select the lowest-level experience maintaining highest success rate. This is a relevance ranking pattern.

**A-MEM** (NeurIPS 2025): Self-organizing knowledge graph. New memories trigger updates to contextual representations of existing memories. Memory is not just stored — it is continuously refined for retrievability.

---

## 2. Recommended integration path: MCP tool

### 2.1 Why MCP over alternatives

Three integration paths were considered:

| Path | How it works | Pros | Cons |
|------|-------------|------|------|
| **MCP tool** | Agent calls `search_corrections(task, domain)` via MCP | Works with any MCP host (Claude Code, Cursor, VS Code, ChatGPT); agent-initiated; no framework dependency | Requires MCP client support in the host |
| **Embedded retriever** | Astrolabe provides a library that agent frameworks import | Deep integration, can hook into framework lifecycle | Must build adapters for LangChain, CrewAI, AutoGen, etc.; tight coupling |
| **Pre-task hook** | External script runs before agent starts, injects context into system prompt | Simple; no runtime dependency | No mid-task retrieval; requires workflow orchestration outside the agent |

**Recommendation: MCP tool as the primary path**, with a pre-task hook as a simpler fallback for environments without MCP support.

Rationale:
1. **MCP adoption is broad.** Claude Code, Cursor, VS Code Copilot, ChatGPT, and many others support MCP. Building one MCP server reaches all of them.
2. **Agent-initiated discovery is the right model.** Corrections are most valuable when the agent recognizes a knowledge gap. A tool the agent can call mid-task (like Letta's `archival_memory_search`) is more powerful than static pre-loading.
3. **The fragment catalog already has the right shape.** Fragments have domain labels, content hashes, contributor reputation, and on-chain metadata. These map cleanly to MCP tool inputs and outputs.
4. **MCP supports structured output.** The `outputSchema` feature lets the tool return typed fragment metadata that the agent (or the host application) can process programmatically.
5. **MCP supports resource links.** The tool can return `resource_link` objects pointing to fragment content, creating a two-step flow: discover (tool call) then read (resource fetch).

### 2.2 Why not resources-only

MCP resources are application-controlled, not model-controlled. A resources-only approach would require the host application to decide which fragments to include — but the host does not know the agent's task context. Tools are model-controlled: the LLM reads the tool description, understands when it is useful, and calls it with task-relevant parameters. This matches the "agent recognizes its own knowledge gap" pattern from Letta.

However, resources are useful as a complement: the MCP server can expose a `corrections://{domain}` resource template for applications that want to browse or pre-load fragments. The tool is the primary discovery mechanism; resources are the secondary browse mechanism.

---

## 3. MCP tool design

### 3.1 Server identity

```
Server name: astrolabe-corrections
Description: Search and retrieve correction fragments from the Astrolabe marketplace.
             Corrections are operator-contributed domain expertise extracted from real
             agent steering sessions. Use these to augment your responses with
             field-tested corrections when working in unfamiliar domains.
```

### 3.2 Tool definitions

#### `search_corrections`

The primary discovery tool. The agent calls this when it detects a potential knowledge gap or is working in a domain where corrections might help.

```json
{
  "name": "search_corrections",
  "title": "Search Correction Fragments",
  "description": "Search the Astrolabe correction marketplace for domain expertise relevant to your current task. Call this when working in specialized domains where operator-contributed corrections might improve accuracy. Returns fragment metadata including domain, contributor reputation, and relevance scores.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "query": {
        "type": "string",
        "description": "Natural language description of what you need help with. Be specific about the domain and task."
      },
      "domain": {
        "type": "string",
        "description": "Optional domain filter (e.g., 'aquaculture', 'saas-engineering', 'materials-science'). If omitted, searches across all domains."
      },
      "min_reputation": {
        "type": "number",
        "description": "Minimum contributor reputation score (1-10). Higher values return only corrections from highly-rated contributors. Default: 0 (no filter)."
      },
      "max_results": {
        "type": "number",
        "description": "Maximum number of fragments to return. Default: 5."
      }
    },
    "required": ["query"]
  },
  "outputSchema": {
    "type": "object",
    "properties": {
      "fragments": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "fragment_id": { "type": "number" },
            "domain": { "type": "string" },
            "summary": { "type": "string" },
            "relevance_score": { "type": "number" },
            "contributor_reputation": { "type": "number" },
            "price_credits": { "type": "number" },
            "content_hash": { "type": "string" },
            "content_uri": { "type": "string" }
          }
        }
      },
      "total_available": { "type": "number" },
      "borrower_credit_available": { "type": "number" }
    }
  }
}
```

#### `borrow_correction`

Executes the on-chain borrow after the agent reviews search results and decides which corrections to use.

```json
{
  "name": "borrow_correction",
  "title": "Borrow a Correction Fragment",
  "description": "Borrow a specific correction fragment from the Astrolabe marketplace. This deducts credits from your operator balance and creates an on-chain receipt. Call this after search_corrections when you find a relevant fragment. Returns the full fragment content.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "fragment_id": {
        "type": "number",
        "description": "The fragment ID from search_corrections results."
      }
    },
    "required": ["fragment_id"]
  },
  "outputSchema": {
    "type": "object",
    "properties": {
      "content": { "type": "string" },
      "domain": { "type": "string" },
      "content_hash": { "type": "string" },
      "borrow_tx_hash": { "type": "string" },
      "credits_deducted": { "type": "number" },
      "remaining_credit": { "type": "number" }
    }
  }
}
```

#### `submit_evaluation`

Closes the feedback loop after the agent has used the borrowed correction.

```json
{
  "name": "submit_evaluation",
  "title": "Submit Correction Evaluation",
  "description": "Report whether a borrowed correction was helpful. This feeds into the contributor's on-chain reputation. Call this after you have used a borrowed correction and can assess its quality.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "fragment_id": {
        "type": "number",
        "description": "The fragment ID that was borrowed."
      },
      "helpful": {
        "type": "boolean",
        "description": "Whether the correction improved your output."
      },
      "delta_estimate": {
        "type": "number",
        "description": "Estimated improvement on a -5 to +5 scale. Positive means the correction helped."
      },
      "notes": {
        "type": "string",
        "description": "Optional free-text explanation of how the correction was or was not helpful."
      }
    },
    "required": ["fragment_id", "helpful"]
  }
}
```

### 3.3 Resource definitions

For browse/pre-load scenarios:

```json
{
  "uriTemplate": "corrections://{domain}",
  "name": "domain-corrections",
  "title": "Domain Corrections",
  "description": "Browse all available corrections for a specific domain.",
  "mimeType": "application/json"
}
```

```json
{
  "uri": "corrections://domains",
  "name": "available-domains",
  "title": "Available Domains",
  "description": "List all domains that have published corrections.",
  "mimeType": "application/json"
}
```

### 3.4 Prompt definition

For user-initiated discovery via slash commands:

```json
{
  "name": "find-corrections",
  "title": "Find Corrections for Task",
  "description": "Search for operator corrections relevant to your current task. Guides you through discovering, borrowing, and applying domain expertise.",
  "arguments": [
    {
      "name": "task_description",
      "description": "What you are working on",
      "required": true
    },
    {
      "name": "domain",
      "description": "Domain to search in (optional)",
      "required": false
    }
  ]
}
```

---

## 4. How task-aware discovery changes the borrowing flow

### 4.1 Current flow (manual)

```
1. Human runs `npm run list-fragments`
2. Human reads fragment list, picks one
3. Human runs `npm run borrow-fragment -- <id>`
4. Human runs `npm run evaluate`
5. Fragment content is injected as system prompt for augmented eval
```

The agent has no role in discovery. The human is the retrieval engine.

### 4.2 Proposed flow (MCP-mediated, agent-initiated)

```
1. Agent receives task from user (e.g., "Design an FCR normalization pipeline")
2. Agent detects domain uncertainty — it knows FCR is aquaculture but lacks specifics
3. Agent calls search_corrections(query="FCR normalization methodology for
   salmon aquaculture", domain="aquaculture")
4. MCP server:
   a. Embeds the query (off-chain, embedding model)
   b. Searches fragment index by semantic similarity + domain filter
   c. Enriches results with on-chain metadata (reputation, price, active status)
   d. Returns ranked fragment list
5. Agent reviews results, decides which fragments are worth borrowing
6. Agent calls borrow_correction(fragment_id=N)
7. MCP server:
   a. Fetches off-chain content
   b. Verifies content hash
   c. Submits borrow tx on-chain
   d. Returns fragment content + receipt
8. Agent uses correction content to augment its response
9. After completing the task, agent calls submit_evaluation(fragment_id=N,
   helpful=true, delta_estimate=3)
10. MCP server submits reputation feedback on-chain
```

### 4.3 What changes

| Aspect | Before | After |
|--------|--------|-------|
| Discovery trigger | Human decision | Agent detects knowledge gap |
| Search mechanism | Domain string match | Semantic similarity + domain filter |
| Relevance judgment | Human reads fragments | Agent reviews summaries + reputation scores |
| Borrow decision | Human command | Agent tool call |
| Context injection | Script prepends to system prompt | Agent receives content from tool response |
| Feedback loop | Human runs eval script | Agent self-reports quality assessment |
| Timing | Pre-task only | Pre-task or mid-task |

### 4.4 When does retrieval happen?

The MCP tool design supports both patterns:

**Pre-task retrieval:** An MCP host could automatically call `search_corrections` at conversation start based on a configured domain. This mirrors CrewAI's automatic memory loading. The host would use the resource primitive (`corrections://{domain}`) for this.

**Mid-task retrieval:** The agent calls `search_corrections` when it hits a knowledge gap during reasoning. This mirrors Letta's `archival_memory_search` pattern. The tool primitive enables this.

**Recommendation:** Support both, but optimize for mid-task. Pre-task retrieval risks loading irrelevant corrections (the agent hasn't analyzed the task yet). Mid-task retrieval is more targeted because the agent has context about what it actually needs.

---

## 5. On-chain vs off-chain architecture

### 5.1 What must stay on-chain

These are the trust anchors. Moving them off-chain would undermine the attribution and reputation story.

| Data | Why on-chain | Contract |
|------|-------------|----------|
| Fragment metadata (operatorId, contentHash, domain, price, active) | Proves a fragment was published by a specific operator at a specific time. The content hash is the integrity anchor — off-chain content must match. | MemoryLending.sol |
| Borrow receipts (FragmentBorrowed events) | Proves borrowing happened. Required for credit accounting and reputation attribution. | MemoryLending.sol |
| Credit balances | Transparent, auditable accounting. Operators can verify their own balance and others'. | MemoryLending.sol |
| Operator identity and agent links | Trust anchor for who published and who borrowed. | OperatorRegistry.sol |
| Reputation feedback | On-chain via ERC-8004. Immutable record of measured quality. | ERC-8004 Reputation Registry |

### 5.2 What should be off-chain

These are performance-sensitive operations that don't need trustlessness.

| Data/Operation | Why off-chain | Where |
|---------------|--------------|-------|
| Fragment content (the actual correction text) | Already off-chain by design. Content stays off-chain, integrity verified by hash. | HTTP server, IPFS, or any content-addressable store |
| Semantic search index (embeddings) | Embeddings are derived from content. They don't need to be trustless — the content hash ensures integrity of the underlying text. Embedding computation is too expensive for on-chain. | MCP server's local/hosted vector store |
| Fragment summaries | Generated from content for search result display. Lossy compression of the fragment. | Stored alongside embeddings in the search index |
| Query embedding | Ephemeral computation for each search request. | MCP server |
| Relevance scores | Computed per-query from embedding similarity. Not a persistent value. | MCP server response |

### 5.3 New off-chain components needed

```
astrolabe-mcp-server/
├── server.ts                    — MCP server entrypoint (Streamable HTTP or STDIO)
├── tools/
│   ├── search-corrections.ts    — semantic search implementation
│   ├── borrow-correction.ts     — on-chain borrow + content fetch
│   └── submit-evaluation.ts     — on-chain reputation feedback
├── index/
│   ├── embedder.ts              — embed fragment content on publish
│   ├── store.ts                 — vector store interface (ChromaDB, SQLite-vec, or in-memory)
│   └── sync.ts                  — sync on-chain fragment metadata to local index
├── resources/
│   ├── domain-list.ts           — list available domains
│   └── domain-corrections.ts    — browse corrections by domain
└── lib/
    ├── chain.ts                 — read on-chain state (fragments, balances, reputation)
    └── config.ts                — operator keys, RPC URL, contract addresses
```

### 5.4 Sync architecture

The MCP server needs a local index of fragment metadata + embeddings. This index syncs from on-chain state:

```
On-chain (source of truth)          Off-chain (search index)
┌─────────────────────┐             ┌─────────────────────┐
│ FragmentPublished    │────sync────▶│ Fragment metadata    │
│ events               │             │ + content embedding  │
│                      │             │ + summary            │
│ FragmentBorrowed     │             │                      │
│ events               │             │ Borrow history       │
│                      │             │ (for recommendation) │
│ Reputation scores    │────sync────▶│ Contributor scores   │
│ (ERC-8004)           │             │ (for ranking)        │
└─────────────────────┘             └─────────────────────┘
```

Sync can be event-driven (listen for `FragmentPublished` events) or polling (periodic read of `nextFragmentId` and fetch new fragments). For a demo, polling every 60 seconds is sufficient.

### 5.5 Embedding strategy

Fragments are small (typically 200-1000 tokens). Options:

1. **Embed full content:** Simple, works well for small fragments. Use a lightweight model (e.g., `text-embedding-3-small` or an open-source model like `nomic-embed-text`).
2. **Embed a generated summary:** Reduces noise from formatting and metadata. Slightly better for search but adds a summarization step.
3. **Embed both content and domain tag:** Concatenate domain and content, embed together. Domain acts as a coarse filter; embedding handles fine-grained relevance.

**Recommendation:** Option 3 for now. Concatenate `[domain]: [content]` and embed. The domain prefix ensures that domain-matched fragments rank higher even with mediocre content similarity.

---

## 6. Existing MCP servers that do similar things

While no existing MCP server does exactly what Astrolabe needs (on-chain correction discovery), several serve as architectural precedents:

- **Memory MCP servers** (various community implementations): Store and retrieve conversation memories. The `memory` reference server stores key-value memories and provides search. Closest to Astrolabe's pattern but without embeddings or on-chain state.
- **Qdrant / Pinecone / Chroma MCP servers**: Expose vector databases as MCP tools. Provide `search(query) -> documents` interfaces. These are the retrieval backend that Astrolabe's MCP server would use internally.
- **Knowledge base MCP servers**: Notion, Confluence, and similar servers that expose organizational knowledge. They handle the "browse and search context" pattern that Astrolabe also needs.
- **Filesystem MCP server** (reference implementation): Exposes file read/write/search as tools. Demonstrates the pattern of wrapping an existing data source in MCP primitives.

The gap: none of these combine semantic search with on-chain verification, credit accounting, or reputation-weighted ranking. Astrolabe's MCP server would be novel in bridging off-chain retrieval with on-chain marketplace mechanics.

---

## 7. Implementation phases

### Phase 1: Static MCP server (no embeddings)

Expose the existing `list-fragments` and `borrow-fragment` functionality as MCP tools. Search is domain-string matching only (same as current `list-fragments`). This validates the MCP integration path without requiring a vector store.

```
search_corrections(domain="aquaculture") → list fragments with domain="aquaculture"
borrow_correction(fragment_id=0) → existing borrow flow
```

Effort: Small. Wraps existing scripts in MCP server boilerplate.

### Phase 2: Semantic search

Add embedding-based search. Embed all fragment content at publish time. `search_corrections(query="...")` embeds the query and ranks by cosine similarity.

Effort: Moderate. Requires an embedding model (API or local), a vector store (SQLite-vec for simplicity), and a sync job.

### Phase 3: Reputation-weighted ranking

Incorporate contributor reputation into search ranking. Fragments from higher-reputation contributors rank higher at equal relevance. This is a weighted score: `final_score = alpha * relevance + (1 - alpha) * normalized_reputation`.

Effort: Small. Reads reputation from on-chain state (already synced in phase 2).

### Phase 4: Proactive discovery

The MCP server monitors the agent's conversation context (via MCP sampling or host-level hooks) and proactively suggests corrections before the agent asks. This is the "CrewAI automatic memory" pattern applied to Astrolabe.

Effort: Significant. Requires conversation monitoring and a relevance threshold to avoid noise.

---

## 8. Open questions

1. **Embedding model choice.** A hosted API (OpenAI, Anthropic) is simpler but adds a dependency and cost. A local model (nomic-embed-text, all-MiniLM) is free but requires local inference. For a demo, the API is pragmatic. For production, local embeddings avoid vendor lock-in.

2. **Fragment granularity vs. retrieval quality.** Current fragments are whole correction documents (200-1000 tokens). Should they be chunked further for retrieval? Probably not — they are already atomic correction units. Chunking would break the content-hash integrity model.

3. **Multi-fragment composition.** When the agent borrows multiple fragments for one task, how are they composed? Current approach: concatenate into a single system prompt. Future: the agent could iteratively borrow and apply corrections, deciding after each one whether more are needed.

4. **Credit cost of search.** Should `search_corrections` (discovery without borrowing) cost credits? Probably not — discovery should be free to encourage exploration. Only `borrow_correction` deducts credits. This matches the existing "verify-before-pay" model.

5. **Privacy of search queries.** When an agent calls `search_corrections`, the query reveals what the agent is working on. If the MCP server is hosted, this leaks task information. Mitigation: local-first MCP server (STDIO transport) where the search index runs on the operator's machine.

6. **How does the agent know to search?** The tool description tells the LLM when to use it, but the LLM may not always recognize knowledge gaps. Potential solutions: (a) explicit instruction in system prompt ("When working in specialized domains, check Astrolabe for corrections"), (b) the host application suggests the tool based on domain keywords, (c) the MCP server uses the prompt primitive to inject a reminder.

---

## 9. Relationship to the current demo

This document describes a post-hackathon direction. The current demo's discovery is manual and domain-string-based. That is honest and sufficient for the hackathon submission.

What this research establishes:
- MCP is the right integration path (broad adoption, model-controlled tools, structured output).
- The tool interface is designed and ready to implement.
- The on-chain/off-chain split is clear (trust anchors on-chain, search index off-chain).
- The implementation can be phased (static first, semantic second, proactive third).

What it does not claim:
- The MCP server is not implemented.
- Semantic search quality is untested.
- Proactive discovery is speculative.
- The interaction between search queries and privacy is unresolved.
