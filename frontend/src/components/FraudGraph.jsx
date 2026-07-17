import React, { useMemo, useState } from 'react'
import { AlertTriangle, User, ArrowRightLeft } from 'lucide-react'
import { useAccount } from '../store/AccountContext'
import { buildGraph } from '../store/community'
import RiyalSymbol from './RiyalSymbol'
import './FraudGraph.css'

/**
 * Money-flow relationship graph for one reported payee.
 * Victims (money in) sit on the right, the reported account in the centre,
 * mules (money out) on the left — so the flow reads right-to-left in Arabic.
 * A shared mule is highlighted as part of a wider laundering ring.
 */
export default function FraudGraph({ network }) {
  const { t, lang, formatMoney } = useAccount()
  const { nodes, edges, hasRing } = useMemo(() => buildGraph(network), [network])
  const [sel, setSel] = useState(null)

  const victims = nodes.filter((n) => n.side === 'in')
  const mules = nodes.filter((n) => n.side === 'out')
  const center = nodes.find((n) => n.id === 'center')

  const rows = Math.max(victims.length, mules.length, 1)
  const ROW = 66
  const PAD = 46
  const W = 360
  const H = PAD * 2 + (rows - 1) * ROW + 24
  const cx = W / 2
  const cy = H / 2
  const colRight = W - 54
  const colLeft = 54

  const maxAmt = Math.max(1, ...nodes.map((n) => n.amount || 0))
  const rFor = (amt) => 11 + Math.min(11, ((amt || 0) / maxAmt) * 11)
  const yFor = (count, i) => cy - ((count - 1) * ROW) / 2 + i * ROW

  const pos = { center: { x: cx, y: cy } }
  victims.forEach((n, i) => (pos[n.id] = { x: colRight, y: yFor(victims.length, i) }))
  mules.forEach((n, i) => (pos[n.id] = { x: colLeft, y: yFor(mules.length, i) }))

  const edgeColor = (e) => (e.ring ? 'var(--gold)' : e.dir === 'in' ? 'var(--teal-light)' : 'var(--warning)')
  const isDim = (id) => sel && sel !== id && sel !== 'center' && !(id === 'center')

  const selNode = sel ? nodes.find((n) => n.id === sel) : null

  return (
    <div className="fgraph">
      <svg viewBox={`0 0 ${W} ${H}`} className="fgraph-svg" role="img" aria-label={t('graphAria')}>
        <defs>
          <marker id="fg-arrow-in" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill="var(--teal-light)" />
          </marker>
          <marker id="fg-arrow-out" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill="var(--warning)" />
          </marker>
          <marker id="fg-arrow-ring" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill="var(--gold)" />
          </marker>
        </defs>

        {/* Edges (drawn in flow direction so the animated dashes read correctly) */}
        {edges.map((e, i) => {
          const a = pos[e.from]
          const b = pos[e.to]
          if (!a || !b) return null
          const mx = (a.x + b.x) / 2
          const d = `M ${a.x} ${a.y} Q ${mx} ${a.y} ${b.x} ${b.y}`
          const marker = e.ring ? 'fg-arrow-ring' : e.dir === 'in' ? 'fg-arrow-in' : 'fg-arrow-out'
          const w = 1.4 + Math.min(3, ((e.amount || 0) / maxAmt) * 3)
          return (
            <path
              key={i}
              d={d}
              className="fgraph-edge"
              stroke={edgeColor(e)}
              strokeWidth={w}
              fill="none"
              markerEnd={`url(#${marker})`}
              opacity={sel && sel !== e.from && sel !== e.to ? 0.18 : 0.85}
            />
          )
        })}

        {/* Nodes */}
        {nodes.map((n, i) => {
          const p = pos[n.id]
          if (!p) return null
          const isCenter = n.id === 'center'
          const r = isCenter ? 27 : rFor(n.amount)
          const cls = `fgraph-node ${n.role}${sel === n.id ? ' sel' : ''}`
          return (
            <g
              key={n.id}
              className={cls}
              transform={`translate(${p.x} ${p.y})`}
              style={{ animationDelay: `${i * 60}ms`, opacity: isDim(n.id) ? 0.28 : 1, cursor: 'pointer' }}
              onClick={() => setSel(sel === n.id ? null : n.id)}
            >
              {isCenter && <circle r={r + 6} className="fgraph-pulse" />}
              <circle r={r} className="fgraph-dot" />
              {isCenter ? (
                <AlertTriangle x={-9} y={-9} width={18} height={18} />
              ) : n.role === 'victim' ? (
                <User x={-7} y={-7} width={14} height={14} />
              ) : (
                <ArrowRightLeft x={-7} y={-7} width={14} height={14} />
              )}
              <text className="fgraph-label" y={r + 14}>
                {n.label.length > 14 ? n.label.slice(0, 13) + '…' : n.label}
              </text>
            </g>
          )
        })}
      </svg>

      {/* Detail / legend */}
      {selNode ? (
        <div className="fgraph-detail">
          <div className="fgraph-detail-row">
            <span className={`fgraph-role-chip ${selNode.role}`}>{t(`role_${selNode.role}`)}</span>
            <strong>{selNode.label}</strong>
          </div>
          <div className="fgraph-detail-meta">
            {selNode.amount > 0 && (
              <span>{selNode.id === 'center' ? t('graphTotalIn') : t('graphAmount')}: <b>{formatMoney(selNode.amount)} <RiyalSymbol size="0.8em" /></b></span>
            )}
            {selNode.city && <span>· {selNode.city}</span>}
          </div>
        </div>
      ) : (
        <div className="fgraph-legend">
          <span><i className="dot victim" /> {t('role_victim')}</span>
          <span><i className="dot scammer" /> {t('role_scammer')}</span>
          <span><i className="dot mule" /> {t('role_mule')}</span>
          {hasRing && <span><i className="dot ring" /> {t('role_ring')}</span>}
        </div>
      )}
    </div>
  )
}
