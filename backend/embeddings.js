const axios = require('axios')

const OLLAMA_URL = 'http://localhost:11434/api/embeddings'
const MODEL = 'nomic-embed-text'

/**
 * Convert a text string into a float vector using Ollama.
 * Make sure Ollama is running: `ollama serve`
 * And the model is pulled:    `ollama pull nomic-embed-text`
 */
async function embed(text) {
  try {
    const res = await axios.post(OLLAMA_URL, {
      model: MODEL,
      prompt: text
    }, {
      timeout: 30000 // 30s timeout for slow first-run model loads
    })
    return res.data.embedding // float[]
  } catch (err) {
    if (err.code === 'ECONNREFUSED') {
      throw new Error('Ollama is not running. Start it with: ollama serve')
    }
    if (err.response?.status === 404) {
      throw new Error(`Model "${MODEL}" not found. Run: ollama pull ${MODEL}`)
    }
    throw err
  }
}

module.exports = { embed, MODEL }
