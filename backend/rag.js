const { embed } = require('./embeddings')
const engine = require('./engine')
const store = require('./store')
const axios = require('axios')

const OLLAMA_CHAT_URL = 'http://localhost:11434/api/generate'
const LLM_MODEL = 'llama3.2:1b'

/**
 * Core RAG pipeline:
 * 1. Embed the user query
 * 2. Search C++ HNSW engine for top-K similar chunks
 * 3. Build a prompt with retrieved context
 * 4. Send to LLM and return the answer
 */
async function ragQuery(userQuery, k = 5) {
  // Step 1: Embed the query
  const queryVector = await embed(userQuery)

  // Step 2: Search the HNSW engine
  const results = await engine.search(queryVector, k)

const CONFIDENCE_THRESHOLD = 0.5 // lower score = more similar in cosine distance

if (results.length === 0) {
  // No good match found — fall back to LLM general knowledge
  const fallbackRes = await axios.post(OLLAMA_CHAT_URL, {
    model: LLM_MODEL,
    prompt: `You are an AI Assitant, Azhan's personal AI Assitant.\nAnswer this question using your general knowledge:\n\n${userQuery}\n\nAnswer:`,
    stream: false
  }, { timeout: 60000 })

  return {
    answer: fallbackRes.data.response.trim(),
    sources: [],
    contextUsed: []
  }
}

  // Step 3: Fetch the text for each result
  const contextChunks = results.map(r => {
    const doc = store.get(r.id)
    return doc ? { id: r.id, score: r.score, text: doc.text, source: doc.source } : null
  }).filter(Boolean)

  // Step 4: Build the prompt
  const contextText = contextChunks
    .map((c, i) => `[${i + 1}] (source: ${c.source})\n${c.text}`)
    .join('\n\n')

const isWeakMatch = results.length === 0 || results[0].score > 0.45

const prompt = `You are AI Assistant, Azhan's personal AI assistant.
You have access to Azhan's personal memory database below.
Read it carefully and answer the user's question directly and specifically.

Rules:
- Answer the actual question asked, don't just introduce yourself
- Use specific details from the memory context
- If asked "hey" or casual greetings, respond friendly and ask what they want to know
- Only say "I am an AI Assitant Made by Azhan" if directly asked who you are
- Keep answers concise and direct and Short,
${isWeakMatch ? '- If memory has no relevant info, use your general knowledge' : ''}

--- AZHAN\'S MEMORY ---
${contextText}
--- END MEMORY ---

Question: ${userQuery}
Answer:`

  // Step 5: Send to LLM via Ollama
  try {
    const res = await axios.post(OLLAMA_CHAT_URL, {
      model: LLM_MODEL,
      prompt,
      stream: false
    }, { timeout: 60000 })

    return {
      answer: res.data.response.trim(),
      sources: contextChunks.map(c => ({ id: c.id, source: c.source, score: c.score })),
      contextUsed: contextChunks
    }
  } catch (err) {
    if (err.code === 'ECONNREFUSED') {
      throw new Error('Ollama is not running. Start it with: ollama serve')
    }
    if (err.response?.status === 404) {
      throw new Error(`LLM model "${LLM_MODEL}" not found. Run: ollama pull ${LLM_MODEL}`)
    }
    throw err
  }
}

module.exports = { ragQuery, LLM_MODEL }
