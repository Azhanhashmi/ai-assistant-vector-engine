const BASE = 'http://localhost:3001'

export interface DocChunk {
  id: string
  text: string
  source: string
  score?: number
}

export interface AskResponse {
  answer: string
  sources: DocChunk[]
}

export interface UploadResponse {
  message: string
  chunksInserted: number
  source: string
}

export const api = {
  async health() {
    const r = await fetch(`${BASE}/health`)
    return r.json()
  },

  async insert(text: string, source = 'manual') {
    const r = await fetch(`${BASE}/insert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, source })
    })
    return r.json()
  },

  async insertBatch(chunks: string[], source = 'file') {
    const r = await fetch(`${BASE}/insert/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chunks, source })
    })
    return r.json()
  },

  // ── NEW: send PDF or TXT directly to backend for parsing + chunking ──
  async upload(file: File): Promise<UploadResponse> {
    const form = new FormData()
    form.append('file', file)
    const r = await fetch(`${BASE}/upload`, {
      method: 'POST',
      body: form   // no Content-Type header — browser sets multipart boundary automatically
    })
    if (!r.ok) {
      const err = await r.json().catch(() => ({ error: 'Upload failed' }))
      throw new Error(err.error || 'Upload failed')
    }
    return r.json()
  },

  async search(query: string, k = 5): Promise<DocChunk[]> {
    const r = await fetch(`${BASE}/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, k })
    })
    return r.json()
  },

  async ask(question: string, k = 5): Promise<AskResponse> {
    const r = await fetch(`${BASE}/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, k })
    })
    return r.json()
  },

  async delete(id: string) {
    const r = await fetch(`${BASE}/delete/${id}`, { method: 'DELETE' })
    return r.json()
  },

  async size(): Promise<{ count: number }> {
    const r = await fetch(`${BASE}/size`)
    return r.json()
  },

  async docs(): Promise<DocChunk[]> {
    const r = await fetch(`${BASE}/docs`)
    const data = await r.json()
    // backend returns { count, docs: [...] } — unwrap it
    return Array.isArray(data) ? data : (data.docs ?? [])
  }
}