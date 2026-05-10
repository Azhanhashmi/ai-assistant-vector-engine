import React, { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Upload, Plus, Trash2, FileText, Database, Loader2, CheckCircle2, X, AlertCircle } from 'lucide-react'
import { api, DocChunk } from '../lib/api'
import { MemoryGraph } from './MemoryGraph'

interface Props {
  docs: DocChunk[]
  highlightedIds: Set<string>
  onDocsChange: () => void
  onBack: () => void
}

export function TrainingView({ docs, highlightedIds, onDocsChange, onBack }: Props) {
  const [text, setText] = useState('')
  const [source, setSource] = useState('')
  const [loading, setLoading] = useState(false)
  const [fileLoading, setFileLoading] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 3000)
  }

  const handleInsert = async () => {
    if (!text.trim()) return
    setLoading(true)
    try {
      await api.insert(text.trim(), source.trim() || 'manual')
      setText('')
      onDocsChange()
      showToast('success', 'Stored in memory')
    } catch { showToast('error', 'Failed to store') }
    finally { setLoading(false) }
  }

const handleFile = async (file: File) => {
    setFileLoading(true)
    try {
      if (file.type === 'application/pdf') {
        // Send PDF directly to backend — it handles parsing + chunking
        const result = await api.upload(file)
        onDocsChange()
        showToast('success', `${result.chunksInserted} chunks from "${file.name}"`)
      } else {
        // TXT/MD — chunk in browser and batch insert
        const content = await file.text()
        const words = content.split(/\s+/)
        const chunks: string[] = []
        let chunk = ''
        for (const w of words) {
          if ((chunk + ' ' + w).length > 500) { if (chunk) chunks.push(chunk.trim()); chunk = w }
          else chunk += (chunk ? ' ' : '') + w
        }
        if (chunk) chunks.push(chunk.trim())
        const valid = chunks.filter(c => c.length > 20)
        await api.insertBatch(valid, file.name)
        onDocsChange()
        showToast('success', `${valid.length} chunks from "${file.name}"`)
      }
    } catch { showToast('error', 'Failed to process file') }
    finally { setFileLoading(false) }
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    const f = e.dataTransfer.files[0]; if (f) handleFile(f)
  }, [])

  const handleDelete = async (id: string) => {
    try { await api.delete(id); onDocsChange() }
    catch { showToast('error', 'Delete failed') }
  }

  const grouped = docs.reduce((a, d) => {
    const s = d.source || 'unknown'
    if (!a[s]) a[s] = []
    a[s].push(d); return a
  }, {} as Record<string, DocChunk[]>)

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#0a0a0a' }}>

      {/* Top bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px',
        borderBottom: '1px solid #1a1a1a', flexShrink: 0
      }}>
        <button onClick={onBack} style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: '#141414', border: '1px solid #222',
          borderRadius: 22, padding: '7px 14px',
          fontSize: 13, color: '#aaa', cursor: 'pointer', transition: 'color 0.15s'
        }}
          onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
          onMouseLeave={e => (e.currentTarget.style.color = '#aaa')}
        >
          <ArrowLeft size={14} />
          Back
        </button>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#e8eaf0' }}>Memory Training</div>
          <div style={{ fontSize: 12, color: '#555' }}>Store knowledge · Visualize vector space</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6,
          background: '#141414', border: '1px solid #222',
          borderRadius: 20, padding: '5px 12px', fontSize: 12, color: '#666' }}>
          <Database size={12} color="#7c6ff7" />
          <span>{docs.length} vectors</span>
        </div>
      </div>

      {/* Body: input left + graph right */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* LEFT — input panel */}
        <div style={{
          width: 340, flexShrink: 0,
          borderRight: '1px solid #141414',
          display: 'flex', flexDirection: 'column',
          overflowY: 'auto', padding: 20, gap: 20
        }}>

          {/* Text input section */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 11, color: '#444', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'monospace' }}>
              Add Memory
            </div>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Paste text, notes, documents..."
              rows={6}
              style={{
                background: '#111', border: '1px solid #1e1e1e',
                borderRadius: 16, padding: '12px 16px',
                fontSize: 14, color: '#e8eaf0', resize: 'none',
                outline: 'none', lineHeight: 1.6, fontFamily: 'inherit',
                transition: 'border-color 0.15s'
              }}
              onFocus={e => (e.target.style.borderColor = '#7c6ff7')}
              onBlur={e => (e.target.style.borderColor = '#1e1e1e')}
            />
            <input
              value={source}
              onChange={e => setSource(e.target.value)}
              placeholder="Source label (e.g. research, notes)"
              style={{
                background: '#111', border: '1px solid #1e1e1e',
                borderRadius: 12, padding: '9px 14px',
                fontSize: 13, color: '#888', outline: 'none',
                fontFamily: 'monospace', transition: 'border-color 0.15s'
              }}
              onFocus={e => (e.target.style.borderColor = '#7c6ff7')}
              onBlur={e => (e.target.style.borderColor = '#1e1e1e')}
            />
            <button
              onClick={handleInsert}
              disabled={loading || !text.trim()}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                background: text.trim() ? 'linear-gradient(135deg,#7c6ff7,#a78bfa)' : '#1a1a1a',
                border: 'none', borderRadius: 12, padding: '11px 0',
                fontSize: 14, fontWeight: 600,
                color: text.trim() ? '#fff' : '#333',
                cursor: text.trim() ? 'pointer' : 'default',
                transition: 'all 0.15s'
              }}
            >
              {loading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={14} />}
              {loading ? 'Storing…' : 'Save to Memory'}
            </button>
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: '#141414' }} />

          {/* File upload */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 11, color: '#444', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'monospace' }}>
              Upload File
            </div>
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              style={{
                background: dragging ? 'rgba(124,111,247,0.08)' : '#0d0d0d',
                border: `2px dashed ${dragging ? '#7c6ff7' : '#1e1e1e'}`,
                borderRadius: 16, padding: '28px 20px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                cursor: 'pointer', transition: 'all 0.15s'
              }}
            >
              {fileLoading
                ? <Loader2 size={24} color="#7c6ff7" style={{ animation: 'spin 1s linear infinite' }} />
                : <Upload size={24} color={dragging ? '#7c6ff7' : '#333'} />}
              <span style={{ fontSize: 13, color: '#555' }}>
                {fileLoading ? 'Processing…' : 'Drop PDF or TXT'}
              </span>
              <span style={{ fontSize: 12, color: '#333' }}>or click to browse</span>
              <input ref={fileRef} type="file" accept=".txt,.pdf,.md" style={{ display: 'none' }}
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
            </div>
          </div>

          {/* Divider */}
          {Object.keys(grouped).length > 0 && <div style={{ height: 1, background: '#141414' }} />}

          {/* Stored docs list */}
          {Object.entries(grouped).map(([src, chunks]) => (
            <div key={src}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <FileText size={13} color="#7c6ff7" />
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#ccc', fontFamily: 'monospace' }}>{src}</span>
                </div>
                <span style={{
                  fontSize: 11, color: '#7c6ff7', fontFamily: 'monospace',
                  background: 'rgba(124,111,247,0.12)', borderRadius: 10, padding: '2px 8px'
                }}>{chunks.length}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 140, overflowY: 'auto' }}>
                {chunks.map(c => (
                  <div key={c.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '6px 10px',
                    background: '#0d0d0d', borderRadius: 10, border: '1px solid #141414' }}>
                    <p style={{ flex: 1, fontSize: 12, color: '#444', fontFamily: 'monospace', margin: 0,
                      lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box',
                      WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {c.text}
                    </p>
                    <button onClick={() => handleDelete(c.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer',
                        color: '#333', flexShrink: 0, padding: 2, transition: 'color 0.15s' }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                      onMouseLeave={e => (e.currentTarget.style.color = '#333')}>
                      <Trash2 size={11} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {docs.length === 0 && (
            <div style={{ textAlign: 'center', padding: '30px 0', color: '#2a2a2a' }}>
              <Database size={32} style={{ margin: '0 auto 10px' }} />
              <p style={{ fontSize: 13, fontFamily: 'monospace' }}>No memories stored yet</p>
            </div>
          )}
        </div>

        {/* RIGHT — graph */}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <MemoryGraph docs={docs} highlightedIds={highlightedIds} />
        </div>
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            style={{
              position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
              display: 'flex', alignItems: 'center', gap: 10,
              background: toast.type === 'success' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
              border: `1px solid ${toast.type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
              borderRadius: 24, padding: '10px 20px', fontSize: 13, fontFamily: 'monospace',
              color: toast.type === 'success' ? '#10b981' : '#ef4444',
              backdropFilter: 'blur(10px)', zIndex: 999, whiteSpace: 'nowrap'
            }}>
            {toast.type === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
            {toast.msg}
            <button onClick={() => setToast(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>
              <X size={12} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}