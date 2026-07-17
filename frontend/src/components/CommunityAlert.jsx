import React from 'react'
import { ShieldAlert, Network, Users } from 'lucide-react'
import { networkReasons } from '../store/community'
import './CommunityAlert.css'

/**
 * Warning banner shown when a transfer payee has been reported by the
 * community (direct) or received money from a reported account (linked/mule).
 */
export default function CommunityAlert({ community, t, lang, onSeeNetwork }) {
  if (!community?.found) return null
  const direct = community.kind === 'direct'
  const net = community.network
  const count = net.reportCount || 1
  const reasons = networkReasons(net, lang, 2)

  return (
    <div className={`calert ${direct ? 'direct' : 'linked'}`} role="alert">
      <span className="calert-icon">
        {direct ? <ShieldAlert size={20} /> : <Users size={20} />}
      </span>
      <div className="calert-body">
        <strong className="calert-title">
          {direct ? t('communityWarnTitle') : t('communityLinkedTitle')}
        </strong>
        <p className="calert-text">
          {direct
            ? t('communityWarnBody').replace('{n}', String(count))
            : t('communityLinkedBody').replace('{payee}', net.payee)}
        </p>
        {direct && reasons.length > 0 && (
          <ul className="calert-reasons">
            {reasons.map((r, i) => <li key={i}>“{r}”</li>)}
          </ul>
        )}
        <button type="button" className="calert-link" onClick={onSeeNetwork}>
          <Network size={13} /> {t('communitySeeNetwork')}
        </button>
      </div>
    </div>
  )
}
