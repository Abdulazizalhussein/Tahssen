import React from 'react'
import { ShieldCheck } from 'lucide-react'
import { useAccount } from '../store/AccountContext'

export default function MessageBubble({ role, content }) {
  const { isRTL } = useAccount()
  const isUser = role === 'user'

  if (isUser) {
    return (
      <div className="chat-bubble-wrap chat-bubble-user-wrap">
        <div className="chat-bubble chat-bubble-user">
          <p className="chat-bubble-text chat-bubble-user-text" style={{ textAlign: 'start' }}>
            {content}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="chat-bubble-wrap chat-bubble-ai-wrap">
      <div className="chat-avatar" aria-hidden="true">
        <ShieldCheck size={18} color="var(--gold)" />
      </div>
      <div className="chat-bubble chat-bubble-ai">
        <p className="chat-bubble-text chat-bubble-ai-text" style={{ textAlign: 'start' }}>
          {content}
        </p>
      </div>
    </div>
  )
}
