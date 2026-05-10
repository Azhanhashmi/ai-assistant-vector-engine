const express = require('express')
const cors = require('cors')
const multer = require('multer')
const engine = require('./engine')
const { embed, MODEL: EMBED_MODEL } = require('./embeddings')
const store = require('./store')
const { ragQuery, LLM_MODEL } = require('./rag')
const { ingestPDF, ingestTxt, ingestText } = require('./ingest')

const app = express()
const PORT = 3001

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['application/pdf', 'text/plain']
    if (allowed.includes(file.mimetype) || file.originalname.endsWith('.txt')) {
      cb(null, true)
    } else {
      cb(new Error('Only PDF and .txt files are supported'))
    }
  }
})

app.use(cors())
app.use(express.json({ limit: '10mb' }))

app.get('/health', async (req, res) => {
  try {
    const size = await engine.size()
    res.json({ status: 'ok', engine: 'running', vectorCount: size, docCount: store.count(), embedModel: EMBED_MODEL, llmModel: LLM_MODEL })
  } catch (e) { res.status(500).json({ status: 'error', error: e.message }) }
})

app.post('/insert', async (req, res) => {
  try {
    const { text, source = 'manual' } = req.body
    if (!text || typeof text !== 'string' || !text.trim()) return res.status(400).json({ error: '"text" is required' })
    const id = store.save(text.trim(), source)
    const vector = await embed(text.trim())
    await engine.insert(id, vector)
    res.json({ id, message: 'Inserted OK', source })
  } catch (e) { console.error('[/insert]', e.message); res.status(500).json({ error: e.message }) }
})

app.post('/insert/batch', async (req, res) => {
  try {
    const { chunks, source = 'batch' } = req.body
    if (!Array.isArray(chunks) || chunks.length === 0) return res.status(400).json({ error: '"chunks" must be a non-empty array' })
    const results = []
    for (const text of chunks) {
      if (!text || typeof text !== 'string' || !text.trim()) continue
      const id = store.save(text.trim(), source)
      const vector = await embed(text.trim())
      await engine.insert(id, vector)
      results.push({ id, text: text.trim() })
    }
    res.json({ inserted: results.length, results })
  } catch (e) { console.error('[/insert/batch]', e.message); res.status(500).json({ error: e.message }) }
})

app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' })
    const source = req.file.originalname
    const mimetype = req.file.mimetype
    let results = []
    if (mimetype === 'application/pdf') {
      results = await ingestPDF(req.file.buffer, source)
    } else {
      results = await ingestTxt(req.file.buffer, source)
    }
    res.json({ message: `Ingested "${source}" successfully`, chunksInserted: results.length, source })
  } catch (e) { console.error('[/upload]', e.message); res.status(500).json({ error: e.message }) }
})

app.post('/search', async (req, res) => {
  try {
    const { query, k = 5 } = req.body
    if (!query) return res.status(400).json({ error: '"query" is required' })
    const vector = await embed(query.trim())
    const results = await engine.search(vector, k)
    const enriched = results.map(r => ({ id: r.id, score: r.score, ...store.get(r.id) }))
    res.json({ query, results: enriched })
  } catch (e) { console.error('[/search]', e.message); res.status(500).json({ error: e.message }) }
})

app.post('/ask', async (req, res) => {
  try {
    const { question, k = 5 } = req.body
    if (!question) return res.status(400).json({ error: '"question" is required' })
    const result = await ragQuery(question.trim(), k)
    res.json({ question, ...result })
  } catch (e) { console.error('[/ask]', e.message); res.status(500).json({ error: e.message }) }
})

app.delete('/delete/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id)
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' })
    await engine.remove(id)
    store.remove(id)
    res.json({ message: `Deleted doc ${id}` })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.get('/size', async (req, res) => {
  try {
    const size = await engine.size()
    res.json({ vectorCount: size, docCount: store.count() })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.get('/docs', (req, res) => {
  res.json({ count: store.count(), docs: store.getAll() })
})

app.listen(PORT, () => {
  console.log(`\n  ✅ Backend running  →  http://localhost:${PORT}`)
  console.log(`  ✅ C++ HNSW engine spawned`)
  console.log(`  📌 Embed model      →  ${EMBED_MODEL}`)
  console.log(`  📌 LLM model        →  ${LLM_MODEL}`)
  console.log(`\n  Endpoints:`)
  console.log(`    GET  /health`)
  console.log(`    POST /insert           { text, source? }`)
  console.log(`    POST /insert/batch     { chunks[], source? }`)
  console.log(`    POST /upload           multipart: file (PDF/.txt)`)
  console.log(`    POST /search           { query, k? }`)
  console.log(`    POST /ask              { question, k? }   <- RAG`)
  console.log(`    DEL  /delete/:id`)
  console.log(`    GET  /size`)
  console.log(`    GET  /docs\n`)
})