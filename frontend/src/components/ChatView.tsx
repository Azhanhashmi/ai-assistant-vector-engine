import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, ChevronDown } from 'lucide-react'
import { api, DocChunk } from '../lib/api'
import pfp from '../icons/pfp.webp'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  loading?: boolean
}

interface Props {
  docs: DocChunk[]
  backendOk: boolean | null
  onSearch: (chunks: DocChunk[]) => void
  onOpenTraining: () => void
}


function Bubble({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user'

  if (isUser) return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      style={{ display: 'flex', justifyContent: 'flex-end' }}
    >
      <div style={{
        maxWidth: '75%',
        background: 'rgba(255,255,255,0.9)',
        color: '#111',
        borderRadius: '18px 18px 4px 18px',
        padding: '10px 16px',
        fontSize: 14, lineHeight: 1.5,
        fontWeight: 450
      }}>
        {msg.content}
      </div>
    </motion.div>
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}
    >
      <div style={{
        width: 28, height: 28, borderRadius: '50%', flexShrink: 0, marginTop: 2,
        background: 'linear-gradient(135deg,#1a0505,#3d1010)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative'
      }}>
  <img
  src={pfp}
  alt="Profile"
  width={70}
  height={60}
  style={{ borderRadius: '50%', objectFit: 'cover' }}
/>
        <div style={{
          position: 'absolute', bottom: 0, right: 0,
          width: 7, height: 7, borderRadius: '50%',
          background: msg.loading ? '#f59e0b' : '#22c55e',
          border: '1.5px solid #080808'
        }} />
      </div>

      <div style={{ maxWidth: '80%', display: 'flex', flexDirection: 'column', gap: 1 }}>
        <span style={{ fontSize: 10, color: '#333', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Assitant</span>
        <div style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '4px 18px 18px 18px',
          padding: '10px 14px',
          fontSize: 14, color: '#d4d4d4', lineHeight: 1.65,
        }}>
          {msg.loading ? (
            <div style={{ display: 'flex', gap: 4, alignItems: 'center', height: 18 }}>
              {[0,1,2].map(i => (
                <motion.div key={i}
                  style={{ width: 5, height: 5, borderRadius: '50%', background: '#333' }}
                  animate={{ y: [0,-4,0] }}
                  transition={{ duration: 0.65, repeat: Infinity, delay: i * 0.13 }}
                />
              ))}
            </div>
          ) : (
            <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{msg.content}</p>
          )}
        </div>
      </div>
    </motion.div>
  )
}

export function ChatView({ docs, backendOk, onSearch, onOpenTraining }: Props) {
  const [messages, setMessages] = useState<Message[]>([{
    id: 'welcome', role: 'assistant',
    content: "Hi, Wassup?",
  }])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const send = async () => {
    if (!input.trim() || loading) return
    const q = input.trim()
    setInput('')
    setLoading(true)
    const uid = Date.now().toString()
    const aid = uid + '-ai'
    setMessages(p => [...p,
      { id: uid, role: 'user', content: q },
      { id: aid, role: 'assistant', content: '', loading: true }
    ])
    try {
      const res = await api.ask(q, 5)
      onSearch(res.sources || [])
      setMessages(p => p.map(m => m.id === aid
        ? { ...m, content: res.answer || 'No answer.', sources: res.sources, loading: false }
        : m))
    } catch {
      setMessages(p => p.map(m => m.id === aid
        ? { ...m, content: 'Cannot reach backend. Make sure it is running on port 3001.', loading: false }
        : m))
    } finally { setLoading(false) }
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'transparent' }}>

      {/* Minimal header — just title, no duplicate nav */}
      <div style={{
        padding: '16px 20px 12px',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0
      }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#e0e0e0', letterSpacing: '-0.01em' }}>AI Assistant</div>
          <div style={{ fontSize: 11, color: '#333', marginTop: 1 }}>
            {docs.length} memories loaded
          </div>
        </div>
        <button
          onClick={onOpenTraining}
          style={{
            fontSize: 11, color: '#555', background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20,
            padding: '4px 12px', cursor: 'pointer', fontFamily: 'inherit',
            transition: 'color 0.15s'
          }}
          onMouseEnter={e => (e.currentTarget.style.color = '#aaa')}
          onMouseLeave={e => (e.currentTarget.style.color = '#555')}
        >
          + Train
        </button>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1, overflowY: 'auto',
        padding: '16px 18px',
        display: 'flex', flexDirection: 'column', gap: 16
      }}>
        {messages.map(m => <Bubble key={m.id} msg={m} />)}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 50, padding: '7px 7px 7px 18px',
          transition: 'border-color 0.15s'
        }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
            placeholder="Ask anything…"
            disabled={loading}
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              fontSize: 14, color: '#d4d4d4', fontFamily: 'inherit'
            }}
          />
          <button
            onClick={send}
            disabled={loading || !input.trim()}
            style={{
              width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
              background: input.trim() ? 'rgba(192,57,43,0.8)' : 'rgba(255,255,255,0.05)',
              border: 'none', cursor: input.trim() ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.15s'
            }}
          >
            <Send size={13} color={input.trim() ? '#fff' : '#333'} />
          </button>
        </div>
      </div>
    </div>
  )
}