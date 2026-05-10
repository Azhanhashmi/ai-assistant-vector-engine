# AI Assistant — Backend

## Prerequisites

### 1. Install Ollama
Download from https://ollama.com and install it.

### 2. Pull the required models
Open a terminal and run:
```bash
# Embedding model (converts text → vectors)
ollama pull nomic-embed-text

# LLM model (generates answers) — pick one:
ollama pull llama3       # recommended, ~4GB
ollama pull mistral      # alternative, ~4GB
ollama pull phi3         # smaller, ~2GB
```

### 3. Make sure your C++ engine is compiled
Your `cpp-engine/hnsw_engine.exe` must exist.
If not compiled yet:
```bash
cd cpp-engine
g++ -O2 -o hnsw_engine.exe hnsw.cpp
```

---

## Setup

```bash
cd backend
npm install
```

---

## Run

```bash
# Terminal 1 — start Ollama
ollama serve

# Terminal 2 — start backend
cd backend
node index.js
```

---

## API Endpoints

### Health check
```
GET /health
```

### Insert a text chunk
```
POST /insert
{ "text": "React is a JavaScript frontend library", "source": "notes" }
```

### Insert multiple chunks
```
POST /insert/batch
{ "chunks": ["chunk 1", "chunk 2", "chunk 3"], "source": "my-doc.txt" }
```

### Similarity search (raw results)
```
POST /search
{ "query": "what is React?", "k": 5 }
```

### Ask a question (full RAG)
```
POST /ask
{ "question": "what is React?", "k": 5 }
```

### Delete a document
```
DELETE /delete/1
```

### Get all stored docs (debug)
```
GET /docs
```

---

## Changing the LLM model

Edit `rag.js` line 8:
```js
const LLM_MODEL = 'llama3'  // change to: mistral, phi3, etc.
```

---

## Project structure

```
my-ai-assistant/
├── cpp-engine/
│   ├── hnsw.cpp
│   └── hnsw_engine.exe
└── backend/
    ├── engine.js       ← spawns & talks to C++ engine
    ├── embeddings.js   ← calls Ollama for text → vector
    ├── store.js        ← in-memory text store (id → text)
    ├── rag.js          ← RAG pipeline (search + LLM)
    ├── index.js        ← Express server & all routes
    └── package.json
```
