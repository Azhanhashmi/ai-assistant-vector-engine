import React, { useEffect, useState, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChatView } from './components/ChatView'
import { TrainingView } from './components/TrainingView'
import { api, DocChunk } from './lib/api'
import { Starfield } from './components/ui/Starfield'

export default function App() {
  const [trainOpen, setTrainOpen] = useState(false)
  const [docs, setDocs] = useState<DocChunk[]>([])
  const [highlightedIds, setHighlightedIds] = useState<Set<string>>(new Set())
  const [backendOk, setBackendOk] = useState<boolean | null>(null)

  const fetchDocs = useCallback(async () => {
    try {
      const d = await api.docs()
      setDocs(Array.isArray(d) ? d : [])
    } catch { setDocs([]) }
  }, [])

  useEffect(() => {
    api.health().then(() => setBackendOk(true)).catch(() => setBackendOk(false))
    fetchDocs()
    const t = setInterval(fetchDocs, 8000)
    return () => clearInterval(t)
  }, [])

  const handleSearch = (chunks: DocChunk[]) => {
    const ids = new Set(chunks.map(c => c.id).filter(Boolean))
    setHighlightedIds(ids)
    setTimeout(() => setHighlightedIds(new Set()), 10000)
  }

  return (
    <div style={{ height: '100vh', overflow: 'hidden', position: 'relative', background: '#050505' }}>

      {/* ── Background: aurora + starfield ── */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0, overflow: 'hidden', pointerEvents: 'none' }}>

        {/* Base dark red radial */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse 90% 55% at 50% 110%, #1a0404 0%, #080202 50%, #050505 100%)'
        }} />

        {/* Left red blob */}
        <div style={{
          position: 'absolute', bottom: '-25%', left: '-10%',
          width: '60%', height: '70%', borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(150,15,15,0.25) 0%, transparent 70%)',
          animation: 'drift1 14s ease-in-out infinite alternate'
        }} />

        {/* Right purple blob */}
        <div style={{
          position: 'absolute', bottom: '-15%', right: '-5%',
          width: '48%', height: '62%', borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(80,10,140,0.18) 0%, transparent 70%)',
          animation: 'drift2 17s ease-in-out infinite alternate'
        }} />

        {/* Center glow */}
        <div style={{
          position: 'absolute', bottom: '-5%', left: '50%',
          width: '34%', height: '44%', borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(170,25,25,0.15) 0%, transparent 70%)',
          animation: 'drift3 10s ease-in-out infinite alternate'
        }} />

        {/* Stars on top of aurora */}
        <Starfield
          starColor="rgba(255,255,255,0.75)"
          bgColor="rgba(0,0,0,0)"
          speed={0.4}
          quantity={280}
        />
      </div>

      {/* ── Top nav ── */}
      <div style={{ position: 'relative', zIndex: 10, display: 'flex', justifyContent: 'center', padding: '18px 0 0' }}>
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          style={{
            display: 'flex', alignItems: 'center', gap: 2,
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 999, padding: '5px 6px',
            backdropFilter: 'blur(24px)',
          }}
        >
          <span style={{ padding: '5px 14px', fontSize: 13, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>
            AI Assitant
          </span>

          <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.07)', margin: '0 2px' }} />

          <button
            onClick={() => setTrainOpen(true)}
            style={{
              padding: '5px 14px', borderRadius: 999, border: 'none',
              background: 'transparent', color: '#888',
              fontSize: 12, fontWeight: 400, cursor: 'pointer',
              fontFamily: 'inherit', transition: 'color 0.15s'
            }}
            onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
            onMouseLeave={e => (e.currentTarget.style.color = '#888')}
          >Train-AI</button>



        </motion.div>
      </div>

      {/* ── Floating chat card ── */}
      <div style={{
        position: 'relative', zIndex: 10,
        height: 'calc(100vh - 72px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px'
      }}>
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.45, delay: 0.1, ease: 'easeOut' }}
          style={{
            width: '100%', maxWidth: 500,
            height: '78vh', maxHeight: 680,
            background: 'rgba(5,5,5,0.65)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 24,
            backdropFilter: 'blur(32px)',
            overflow: 'hidden',
            boxShadow: '0 24px 64px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)'
          }}
        >
          <ChatView
            docs={docs}
            backendOk={backendOk}
            onSearch={handleSearch}
            onOpenTraining={() => setTrainOpen(true)}
          />
        </motion.div>
      </div>

      {/* ── Train Memory modal ── */}
      <AnimatePresence>
        {trainOpen && (
          <>
            <motion.div
              key="bd"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={() => setTrainOpen(false)}
              style={{ position: 'fixed', inset: 0, zIndex: 20, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}
            />
            <motion.div
              key="modal"
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              style={{
                position: 'fixed', inset: '4%', zIndex: 30,
                background: '#080808',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 24, overflow: 'hidden',
                boxShadow: '0 32px 80px rgba(0,0,0,0.75)'
              }}
            >
              <TrainingView
                docs={docs}
                highlightedIds={highlightedIds}
                onDocsChange={fetchDocs}
                onBack={() => setTrainOpen(false)}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}