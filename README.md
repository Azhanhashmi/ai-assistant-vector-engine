# AI Assistant

A fully local, privacy-first personal AI assistant built from scratch. No cloud. No API costs. Your data never leaves your machine.

## What makes this different

Most AI assistants call OpenAI or Anthropic APIs. Neural Mind runs entirely on your machine using a custom-built vector search engine written in C++ and local LLMs via Ollama.

The vector search engine (HNSW — Hierarchical Navigable Small World) was implemented from scratch in C++, not imported from a library. This is the same algorithm used in production by Pinecone, Weaviate, and other vector databases.

---

## How it works

You ask a question
↓
Express backend receives it
↓
Ollama converts your question to a vector (nomic-embed-text)
↓
C++ HNSW engine searches millions of vectors in milliseconds
↓
Top-K most relevant memory chunks retrieved
↓
LLM (llama3.2:1b) reads the chunks and generates an answer
↓
Answer streamed back to the React chat UI

This pattern is called RAG (Retrieval Augmented Generation). Instead of the LLM guessing from training data, it reads YOUR documents and answers from them.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Vector Engine | C++ (custom HNSW implementation) |
| Backend | Node.js + Express |
| Embeddings | Ollama — nomic-embed-text |
| LLM | Ollama — llama3.2:1b |
| Frontend | React + Vite + TypeScript |
| Graph Visualization | D3.js force-directed graph |
| Styling | Tailwind CSS + Framer Motion |

---

## Features

- **Memory storage** — type or paste anything and save it as a vector
- **PDF & TXT ingestion** — upload documents, auto-chunked and embedded
- **Semantic search** — ask questions in natural language, not keywords
- **Memory graph** — D3.js visualization of your stored knowledge nodes
- **Source transparency** — every answer shows which memory chunks were used and their similarity scores
- **Fully local** — Ollama runs on your machine, no internet required after setup
- **Fallback mode** — if no relevant memory found, falls back to LLM general knowledge

---

## Prerequisites

- **Node.js** v18+
- **g++** (MinGW on Windows, gcc on Linux/Mac)
- **Ollama** — https://ollama.com/download

---

## Setup

### 1. Clone the repo

```bash
git clone https://github.com/YOURUSERNAME/neural-mind.git
cd neural-mind
```

### 2. Install Ollama and pull models

```bash
# Download from https://ollama.com/download and install
ollama pull nomic-embed-text   # embedding model (~270MB)
ollama pull llama3.2:1b        # LLM (~1.3GB)
```

### 3. Compile the C++ engine

```bash
cd cpp-engine
g++ -O2 -static -o hnsw_engine.exe src/hnsw.cpp   # Windows
# g++ -O2 -o hnsw_engine src/hnsw.cpp             # Linux/Mac
```

### 4. Install backend dependencies

```bash
cd backend
npm install
```

### 5. Install frontend dependencies

```bash
cd frontend
npm install
```

---

## Running

**Terminal 1 — Ollama** (skip if already running):
```bash
ollama serve
```

**Terminal 2 — Backend:**
```bash
cd backend
node index.js
```

**Terminal 3 — Frontend:**
```bash
cd frontend
npm run dev
```

Open http://localhost:5173

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | /health | Check engine + model status |
| POST | /insert | Add a text chunk to memory |
| POST | /insert/batch | Add multiple chunks at once |
| POST | /upload | Upload PDF or TXT file |
| POST | /search | Raw vector similarity search |
| POST | /ask | Full RAG query — returns LLM answer + sources |
| DELETE | /delete/:id | Remove a memory by ID |
| GET | /size | Vector count |
| GET | /docs | List all stored documents |

---

## The C++ HNSW Engine

The core of this project is a hand-written implementation of the HNSW algorithm in C++.

HNSW builds a multi-layer graph where each node is a vector. Search starts at the top layer (sparse, fast navigation) and drills down to the bottom layer (dense, precise results). This gives approximate nearest neighbor search in O(log n) time — far faster than brute force O(n) comparison.

The engine supports:
- `INSERT id vector` — add a vector node to the graph
- `SEARCH k vector` — find k nearest neighbors
- `DELETE id` — remove a node and clean up connections
- `SIZE` — return current node count

The Node.js backend communicates with the engine by spawning it as a persistent child process and piping commands through stdin/stdout.

---

## How to use it

1. Open the app at http://localhost:5173
2. Type anything in the chat — "who am I?" won't work yet
3. Click **Train Memory** in the top nav
4. Paste your notes, bio, projects, goals — anything
5. Or upload a PDF of your documents
6. Go back to chat and ask questions about what you stored

The more you feed it, the smarter it gets about YOUR life and YOUR knowledge.

---

## Built by

Azhan Hashmi — BCA student transitioning from arts into AI engineering.

This project is a portfolio-level demonstration of understanding how vector databases, RAG pipelines, and local LLMs work at a systems level — not just calling an API.

---

## License

MIT
