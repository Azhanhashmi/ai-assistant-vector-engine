import React, { useEffect, useRef, useState, useCallback } from 'react'
import * as d3 from 'd3'
import { motion, AnimatePresence } from 'framer-motion'
import { ZoomIn, ZoomOut, Maximize2, RefreshCw, Network } from 'lucide-react'
import { DocChunk } from '../lib/api'

interface Props {
  docs: DocChunk[]
  highlightedIds: Set<string>
}

interface SimNode extends d3.SimulationNodeDatum {
  id: string; text: string; source: string; highlighted: boolean
}

interface SimLink { source: string | SimNode; target: string | SimNode; strength: number }

const PALETTE = ['#7c6ff7', '#a78bfa', '#06b6d4', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#34d399']

export function MemoryGraph({ docs, highlightedIds }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null)
  const colorMap = useRef<Map<string, string>>(new Map())
  const [tooltip, setTooltip] = useState<{ x: number; y: number; node: SimNode } | null>(null)
  const [tick, setTick] = useState(0) // force re-render to rebuild

  const getColor = (src: string) => {
    if (!colorMap.current.has(src))
      colorMap.current.set(src, PALETTE[colorMap.current.size % PALETTE.length])
    return colorMap.current.get(src)!
  }

  const build = useCallback(() => {
    const svg = svgRef.current
    if (!svg) return
    const W = svg.clientWidth, H = svg.clientHeight
    if (!W || !H) return

    d3.select(svg).selectAll('*').remove()

    if (docs.length === 0) return

    const nodes: SimNode[] = docs.map(d => ({
      id: d.id, text: d.text, source: d.source || 'unknown',
      highlighted: highlightedIds.has(d.id)
    }))

    const links: SimLink[] = []
    const bySource = d3.group(nodes, n => n.source)
    bySource.forEach(grp => {
      for (let i = 0; i < grp.length - 1; i++)
        links.push({ source: grp[i].id, target: grp[i + 1].id, strength: 0.4 })
    })
    if (nodes.length > 4) {
      for (let i = 0; i < Math.min(nodes.length, 12); i++) {
        const a = nodes[Math.floor(Math.random() * nodes.length)]
        const b = nodes[Math.floor(Math.random() * nodes.length)]
        if (a.id !== b.id) links.push({ source: a.id, target: b.id, strength: 0.05 })
      }
    }

    const g = d3.select(svg).append('g')

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 5])
      .on('zoom', e => g.attr('transform', e.transform.toString()))
    zoomRef.current = zoom
    d3.select(svg).call(zoom)

    // grid dots background
    const defs = d3.select(svg).append('defs')
    const pat = defs.append('pattern').attr('id', 'grid').attr('width', 30).attr('height', 30)
      .attr('patternUnits', 'userSpaceOnUse')
    pat.append('circle').attr('cx', 1).attr('cy', 1).attr('r', 0.8).attr('fill', '#1a1a1a')
    d3.select(svg).insert('rect', ':first-child')
      .attr('width', '100%').attr('height', '100%')
      .attr('fill', 'url(#grid)')

    // links
    const linkEl = g.append('g').selectAll('line').data(links).join('line')
      .attr('stroke', '#1e1e1e').attr('stroke-width', 1)

    // nodes
    const nodeEl = g.append('g').selectAll<SVGGElement, SimNode>('g').data(nodes).join('g')
      .style('cursor', 'pointer')
      .call(d3.drag<SVGGElement, SimNode>()
        .on('start', (event, d) => { if (!event.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y })
        .on('drag', (event, d) => { d.fx = event.x; d.fy = event.y })
        .on('end', (event, d) => { if (!event.active) sim.alphaTarget(0); d.fx = null; d.fy = null }))

    // outer glow ring for highlighted
    nodeEl.filter(d => d.highlighted).append('circle')
      .attr('r', 16).attr('fill', 'none')
      .attr('stroke', d => getColor(d.source)).attr('stroke-width', 1)
      .attr('stroke-dasharray', '3 3').attr('opacity', 0.5)

    // soft glow bg
    nodeEl.append('circle')
      .attr('r', d => d.highlighted ? 13 : 9)
      .attr('fill', d => getColor(d.source))
      .attr('opacity', 0.12)

    // main node
    nodeEl.append('circle')
      .attr('r', d => d.highlighted ? 9 : 6)
      .attr('fill', d => getColor(d.source))
      .attr('opacity', d => d.highlighted ? 1 : 0.75)
      .attr('stroke', d => d.highlighted ? '#fff' : 'none')
      .attr('stroke-width', 1.5)

    // label (short, only on highlight or hover)
    nodeEl.filter(d => d.highlighted).append('text')
      .attr('dy', 20).attr('text-anchor', 'middle')
      .attr('fill', d => getColor(d.source))
      .attr('font-size', 10)
      .attr('font-family', 'monospace')
      .text(d => d.source.slice(0, 12))

    nodeEl
      .on('mouseenter', (event, d) => {
        const rect = svg.getBoundingClientRect()
        setTooltip({ x: event.clientX - rect.left, y: event.clientY - rect.top, node: d })
      })
      .on('mousemove', (event) => {
        const rect = svg.getBoundingClientRect()
        setTooltip(p => p ? { ...p, x: event.clientX - rect.left, y: event.clientY - rect.top } : null)
      })
      .on('mouseleave', () => setTooltip(null))

    const sim = d3.forceSimulation<SimNode>(nodes)
      .force('link', d3.forceLink<SimNode, SimLink>(links).id(d => d.id)
        .strength(d => (d as any).strength).distance(55))
      .force('charge', d3.forceManyBody().strength(-90))
      .force('center', d3.forceCenter(W / 2, H / 2))
      .force('collision', d3.forceCollide(20))

    sim.on('tick', () => {
      linkEl
        .attr('x1', d => (d.source as SimNode).x!)
        .attr('y1', d => (d.source as SimNode).y!)
        .attr('x2', d => (d.target as SimNode).x!)
        .attr('y2', d => (d.target as SimNode).y!)
      nodeEl.attr('transform', d => `translate(${d.x},${d.y})`)
    })
  }, [docs, highlightedIds, tick])

  useEffect(() => { build() }, [build])

  const doZoom = (dir: 1 | -1) => {
    if (!svgRef.current || !zoomRef.current) return
    d3.select(svgRef.current).transition().duration(250)
      .call(zoomRef.current.scaleBy, dir === 1 ? 1.5 : 0.67)
  }

  const sources = Array.from(new Set(docs.map(d => d.source || 'unknown')))

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#080808' }}>

      {/* Graph header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px', borderBottom: '1px solid #141414', flexShrink: 0
      }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#888', fontFamily: 'monospace' }}>
            <Network size={13} style={{ display: 'inline', marginRight: 6, verticalAlign: -1 }} />
            Vector Space
          </div>
          <div style={{ fontSize: 11, color: '#333', fontFamily: 'monospace', marginTop: 2 }}>
            {docs.length} nodes · hover to inspect
          </div>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {[
            { icon: ZoomIn, fn: () => doZoom(1) },
            { icon: ZoomOut, fn: () => doZoom(-1) },
            { icon: Maximize2, fn: () => { if (svgRef.current && zoomRef.current) d3.select(svgRef.current).transition().duration(300).call(zoomRef.current.transform, d3.zoomIdentity) } },
            { icon: RefreshCw, fn: () => setTick(t => t + 1) }
          ].map(({ icon: Icon, fn }, i) => (
            <button key={i} onClick={fn} style={{
              width: 30, height: 30, borderRadius: 8, background: '#111',
              border: '1px solid #1e1e1e', cursor: 'pointer', color: '#555',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'color 0.15s'
            }}
              onMouseEnter={e => (e.currentTarget.style.color = '#aaa')}
              onMouseLeave={e => (e.currentTarget.style.color = '#555')}>
              <Icon size={13} />
            </button>
          ))}
        </div>
      </div>

      {/* SVG */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {docs.length === 0 ? (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 10, color: '#222' }}>
            <Network size={36} />
            <p style={{ fontSize: 12, fontFamily: 'monospace' }}>Add memories to see the graph</p>
          </div>
        ) : (
          <svg ref={svgRef} style={{ width: '100%', height: '100%' }} />
        )}

        {/* Tooltip */}
        <AnimatePresence>
          {tooltip && (
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              style={{
                position: 'absolute', pointerEvents: 'none',
                left: tooltip.x + 16, top: tooltip.y - 50,
                background: '#111', border: '1px solid #2a2a2a',
                borderRadius: 14, padding: '10px 14px',
                maxWidth: 240, zIndex: 10,
                boxShadow: '0 8px 32px rgba(0,0,0,0.6)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: getColor(tooltip.node.source), flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: getColor(tooltip.node.source), fontFamily: 'monospace', fontWeight: 600 }}>
                  {tooltip.node.source}
                </span>
              </div>
              <p style={{ fontSize: 12, color: '#666', fontFamily: 'monospace', margin: 0, lineHeight: 1.6 }}>
                {tooltip.node.text?.slice(0, 120)}{tooltip.node.text?.length > 120 ? '…' : ''}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Legend */}
      {sources.length > 0 && (
        <div style={{ padding: '10px 16px', borderTop: '1px solid #141414', flexShrink: 0,
          display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {sources.map(src => (
            <div key={src} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: getColor(src),
                boxShadow: `0 0 6px ${getColor(src)}60` }} />
              <span style={{ fontSize: 11, color: '#444', fontFamily: 'monospace' }}>{src}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}