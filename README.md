# Dexkor Internship Assignment
## MongoDB Performance Optimization & Full-Text Search

## 1. Overview

This assignment demonstrates MongoDB performance analysis and optimization for a multi-tenant customer support ticketing system, similar to Dexkor's CRM platform.

The goal of this work is to:
- Identify slow MongoDB queries
- Fix performance issues using proper index design
- Implement scalable full-text search
- Think in terms of real-world production systems

All optimizations are validated using MongoDB's explain("executionStats").

## 2. Dataset & Data Model

### Collection Name: tickets

Each document represents a customer support ticket with the following fields:
- _id: ObjectId
- tenantId: String
- ticketNumber: String
- subject: String
- description: String
- status: open | pending | resolved | closed
- priority: low | medium | high
- tags: Array of Strings
- customerEmail: String
- agentId: String
- createdAt: Date
- updatedAt: Date

### Dataset Characteristics
- Approximately 50,000 ticket documents
- Multiple tenants (tenant_0 to tenant_9)
- Multiple agents (agent_0 to agent_19)
- Mixed ticket statuses and priorities
- Realistic text content such as "refund", "delayed response", and "payment issue"
- Time-distributed createdAt and updatedAt fields

This dataset was intentionally designed to simulate a real-world customer support workload and expose performance bottlenecks at scale.

Optional screenshots of dataset generation are available in the snippets/ directory for reference.

## 3. Slow Query Analysis

### Query 1: Ticket Listing (Dashboard Query)

```js
db.tickets.find({
  tenantId: "tenant_1",
  status: "open",
  createdAt: { $gte: ISODate("2024-01-01") }
})
.sort({ createdAt: -1 })
.limit(20);
```

### Problem (Before Optimization)
- MongoDB performed a collection scan (COLLSCAN)
- Sorting was done in memory
- Large number of documents examined
- Poor scalability for a high-frequency dashboard query

Execution plan before optimization is available at:

explain/query1_before.json

### Optimization Applied
A compound index was created:

```js
db.tickets.createIndex({
  tenantId: 1,
  status: 1,
  createdAt: -1
});
```

### Why This Index Works
- tenantId and status are equality filters
- createdAt supports range filtering and sorting
- Sorting is handled directly by the index

### Result (After Optimization)
- Index scan (IXSCAN)
- No collection scan
- No in-memory sorting
- Significantly reduced documents examined

Execution plan after optimization is available at:

explain/query1_after.json

### Query 2: Search Using Regex

```js
db.tickets.find({
  description: { $regex: "refund", $options: "i" }
});
```

### Problem (Before Optimization)
- Regex search caused a full collection scan
- All documents were examined
- Does not scale with large datasets

Execution plan before optimization is available at:

explain/query2_before.json

### Optimization Applied
Created a text index for full-text search:

```js
db.tickets.createIndex({
  subject: "text",
  description: "text",
  tags: "text"
});
```

### Result (After Optimization)
- MongoDB used a text index (inverted index) instead of performing a collection scan
- The execution plan included TEXT_MATCH / IXSCAN stages
- Only relevant index keys were examined instead of scanning all documents
- No COLLSCAN stage was present

This confirms that MongoDB successfully utilized the text index for search operations.

Execution plan after optimization is available at:

explain/query2_after.json

### Why the Text Search Took More Time Than Regex

Small Dataset Size
- The dataset contains approximately 50,000 documents, which easily fits in memory.
- On small datasets, a full collection scan using regex may appear faster due to lower overhead.

Additional Processing in Text Search
- Native text search performs extra work compared to regex:
  - Tokenizing search terms
  - Matching multiple terms (refund, delayed, response)
  - Calculating relevance scores (textScore)
  - Sorting results by relevance

Regex Does Not Scale

While regex appeared faster here, it required scanning every document in the collection. As data volume increases (millions of documents), regex-based searches degrade significantly, whereas text search continues to scale efficiently.

## 4. Index Design

Indexes were designed based on query access patterns, not individual fields.

### Index Definitions Used

Tenant Dashboard Index

```js
db.tickets.createIndex({
  tenantId: 1,
  status: 1,
  createdAt: -1
});
```

- Compound index on tenantId, status, and createdAt
- Used for tenant-wise open ticket dashboards with sorting

Agent Workload Index

```js
db.tickets.createIndex({
  agentId: 1,
  status: 1
});
```

- Index on agentId and status
- Used for agent-specific ticket views

SLA Escalation Index

```js
db.tickets.createIndex({
  createdAt: 1
});
```

- Index on createdAt
- Used for time-based SLA monitoring queries

Tag-Based Filtering Index

```js
db.tickets.createIndex({
  tags: 1
});
```

- Multikey index on tags
- Used for category and label-based filtering

All index creation commands (createIndex) are available in the indexes/ directory.

## 5. MongoDB Full-Text Search

### Text Index Creation

```js
db.tickets.createIndex({
  subject: "text",
  description: "text",
  tags: "text"
});
```

This creates an inverted index that maps words to document references for efficient search.

### Text Search Query

```js
db.tickets.find(
  { $text: { $search: "refund delayed response" } },
  { score: { $meta: "textScore" } }
)
.sort({ score: { $meta: "textScore" } });
```

Execution plan is available at:

explain/query2_after.json

### How MongoDB Text Scoring Works

MongoDB assigns a textScore based on:
- Number of matched terms
- Term frequency within the document
- Overall relevance of the document
- Documents matching more search terms are ranked higher

### Why text Search Is Preferred Over Regex

Regex Search
- Full collection scan
- No relevance ranking
- Poor scalability
- Simple string matching

text Search
- Uses inverted index
- Ranked by relevance
- Scales efficiently
- Word-based search

Although regex may appear faster on small datasets, it does not scale and becomes inefficient as data volume grows.

### Limitations of Native MongoDB Text Search

- No fuzzy matching (typo tolerance)
- No autocomplete
- Limited language processing
- Limited ranking customization
- Only one text index per collection

For advanced search features such as autocomplete and fuzzy search, MongoDB Atlas Search (Lucene-based) is recommended in production systems.

## 6. Repository Structure

queries/          MongoDB queries used
indexes/          Index definitions (createIndex commands)
explain/          Before and after explain() execution outputs
text-search/      Full-text search queries
README.md         Assignment explanation

## 7. Summary & Learnings

- Identified slow MongoDB queries using explain()
- Eliminated collection scans with compound and multikey indexes
- Designed indexes aligned with real-world access patterns
- Replaced inefficient regex searches with scalable full-text search
- Understood trade-offs of native MongoDB text search
- Applied production-oriented thinking for multi-tenant systems