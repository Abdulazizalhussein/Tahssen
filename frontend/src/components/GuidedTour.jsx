import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, ArrowRight, X, TriangleAlert, CheckCircle2 } from 'lucide-react'
import { useAccount } from '../store/AccountContext'
import './GuidedTour.css'

const L = (lang, o) => (lang === 'en' ? o.en ?? o.ar : o.ar)

// Centre an element in view robustly. scrollIntoView is unreliable here because
// a non-scrolling `overflow:auto` ancestor (e.g. .analytics-screen) swallows it,
// so we scroll the window AND the nearest genuinely-scrollable ancestor directly.
function scrollToCenter(el) {
  const b = el.getBoundingClientRect()
  const vh = window.innerHeight || document.documentElement.clientHeight
  const winY = window.scrollY + b.top - vh / 2 + b.height / 2
  window.scrollTo({ top: Math.max(0, winY), behavior: 'auto' })
  let p = el.parentElement
  while (p && p !== document.body) {
    const cs = getComputedStyle(p)
    if ((cs.overflowY === 'auto' || cs.overflowY === 'scroll') && p.scrollHeight > p.clientHeight + 2) {
      const pr = p.getBoundingClientRect()
      const cur = el.getBoundingClientRect()
      p.scrollTop += (cur.top - pr.top) - (p.clientHeight / 2 - cur.height / 2)
      break
    }
    p = p.parentElement
  }
}

function DemoChat({ lang, rows, verdict }) {
  return (
    <div className="tour-chat" dir={lang === 'en' ? 'ltr' : 'rtl'}>
      {rows.map((r, k) => <div key={k} className={`tour-bubble ${r.who}`}>{L(lang, r)}</div>)}
      {verdict && (
        <div className={`tour-verdict ${verdict.tone}`}>
          {verdict.tone === 'danger' ? <TriangleAlert size={14} /> : <CheckCircle2 size={14} />}
          <span>{L(lang, verdict)}</span>
        </div>
      )}
    </div>
  )
}

function buildSteps(lang) {
  return [
    {
      route: '/app/home',
      title: L(lang, { ar: 'أهلاً بك في تحصين', en: 'Welcome to Tahseen' }),
      body: L(lang, { ar: 'سنتجوّل معك داخل الموقع خطوة بخطوة — نضغط هنا ونريك، بدل الشرح فقط. اضغط «التالي».', en: 'We’ll walk you through the app step by step — pointing at the real screens. Tap “Next”.' }),
    },
    {
      route: '/app/home', target: '.home-balance-wrap',
      title: L(lang, { ar: 'رصيدك وحالتك', en: 'Your balance & status' }),
      body: L(lang, { ar: 'هنا رصيدك المتاح وإنفاق الشهر — نقطة انطلاقك.', en: 'Your available balance and monthly spend — your starting point.' }),
    },
    {
      route: '/app/home', target: '.home-actions',
      title: L(lang, { ar: 'كل خدماتك من هنا', en: 'All your services here' }),
      body: L(lang, { ar: 'من الإجراءات السريعة تصل لكل شيء. لنبدأ بالحماية المجتمعية.', en: 'Quick actions reach everything. Let’s start with community protection.' }),
    },
    {
      route: '/app/community', target: '.community-stats',
      title: L(lang, { ar: 'الحماية مبنية على مستفيديك', en: 'Protection built on your payees' }),
      body: L(lang, { ar: 'نراقب كل مستفيد أضفته: كم منهم بمخاطر وكم آمن.', en: 'Every payee you added is screened: how many are risky vs. safe.' }),
    },
    {
      route: '/app/community', target: '.payee-card.risky', clickToExpand: '.payee-card.risky .payee-card-head',
      title: L(lang, { ar: 'مستفيدون بمخاطر', en: 'Beneficiaries at risk' }),
      body: L(lang, { ar: 'مُبلّغ عنهم من المجتمع. اضغط أي اسم لترى شبكته وأسباب البلاغ وسلوكه (يسحب فوراً أو يحوّل لوسطاء).', en: 'Community-reported. Tap any name to see their network, the report reasons, and their behaviour (cash-out vs. mules).' }),
    },
    {
      route: '/app/beneficiaries', target: '.ben-risk-badge',
      title: L(lang, { ar: 'حالة كل مستفيد', en: 'Every payee’s status' }),
      body: L(lang, { ar: 'كل مستفيد يظهر بوسم واضح: «آمن» أو «مُبلّغ عنه».', en: 'Each beneficiary carries a clear badge: “Safe” or “Reported”.' }),
    },
    {
      route: '/app/transfer', target: '.transfer-ben-list',
      title: L(lang, { ar: 'التحويل — الوكيل يتحقق أولاً', en: 'Transfer — the agent verifies first' }),
      body: L(lang, { ar: 'إن لم يكن مُبلّغاً عنه، يسألك الوكيل عن سبب التحويل حتى يتأكد قبل التنفيذ:', en: 'If not reported, the agent asks about the reason until it’s sure — before sending:' }),
      example: (
        <DemoChat
          lang={lang}
          rows={[
            { who: 'agent', ar: 'ما سبب هذا التحويل؟', en: 'What’s this transfer for?' },
            { who: 'user', ar: 'أستثمر فلوسي معه — لا أعرفه وبلا ضمانات رسمية', en: 'Investing with him — I don’t know him, no official guarantees' },
          ]}
          verdict={{ tone: 'danger', ar: 'احتيال محتمل ٩٢٪ · يُنصح بإيقاف التحويل', en: 'Likely fraud 92% · stop the transfer' }}
        />
      ),
    },
    {
      route: '/app/chat', target: '.chat-textarea',
      title: L(lang, { ar: 'محادثة تحصين', en: 'Chat with Tahseen' }),
      body: L(lang, { ar: 'اسأله عن وضعك المالي واطلب خطة تحسين — يجيبك بالأرقام:', en: 'Ask about your finances and request a plan — it answers with numbers:' }),
      example: (
        <DemoChat
          lang={lang}
          rows={[
            { who: 'user', ar: 'أبي أشتري سيارة نهاية العام، أقدر؟', en: 'I want to buy a car end of year — can I?' },
            { who: 'agent', ar: 'ادّخر ~٤٬٥٠٠ ﷼ شهرياً وحوّل الفائض تلقائياً — تبلغ الهدف في نوفمبر.', en: 'Save ~4,500 ﷼/mo and auto-transfer the surplus — you hit the goal in November.' },
          ]}
        />
      ),
    },
    {
      route: '/app/analytics', target: '.analytics-health-card',
      title: L(lang, { ar: 'التحليلات والتوقّع', en: 'Analytics & forecast' }),
      body: L(lang, { ar: 'مؤشر صحتك المالية هنا، وتحتها توقّع رصيد نهاية الشهر وإنفاقك الشهري (ماضٍ ← الآن ← أشهر قادمة).', en: 'Your financial-health score here, with the month-end forecast and monthly spend (past → now → months ahead) below.' }),
    },
    {
      route: '/app/recommendations', target: '.recs-forecast',
      title: L(lang, { ar: 'التوصيات الذكية', en: 'Smart recommendations' }),
      body: L(lang, { ar: 'توقّع وضعك أعلى الصفحة، وتحته توصيات عملية لتحسينه — كل واحدة بأثرها المتوقّع بالريال.', en: 'Your forecast at the top, with actionable tips below — each with its riyal impact.' }),
    },
    {
      route: '/app/home', finish: true,
      title: L(lang, { ar: 'جاهز؟ ابدأ الآن', en: 'Ready? Let’s go' }),
      body: L(lang, { ar: 'أنت الآن تعرف كيف يحميك تحصين. تقدر تعيد الجولة من الإعدادات في أي وقت.', en: 'You now know how Tahseen protects you. Replay the tour anytime from Settings.' }),
    },
  ]
}

export default function GuidedTour({ onDone }) {
  const { lang, isRTL } = useAccount()
  const navigate = useNavigate()
  const location = useLocation()
  const [idx, setIdx] = useState(0)
  const [rect, setRect] = useState(null)
  const steps = useMemo(() => buildSteps(lang), [lang])
  const step = steps[idx]
  const last = idx === steps.length - 1

  // Navigate to the step's screen, then keep the spotlight GLUED to the real
  // element. A polling loop re-queries the target every tick, so it doesn't
  // matter how long the page takes to render — the moment the element appears we
  // scroll it into view (once) and then track it through scroll/layout/resize.
  useEffect(() => {
    setRect(null)
    if (step.route && location.pathname !== step.route) navigate(step.route)
    if (!step.target) return
    let scrollTries = 0
    const sameRect = (a, b) => a && b && a.top === b.top && a.left === b.left && a.width === b.width && a.height === b.height
    const measure = () => {
      const el = document.querySelector(step.target)
      if (!el) return
      if (scrollTries === 0 && step.clickToExpand) document.querySelector(step.clickToExpand)?.click()
      // Re-centre a few times as the page finishes laying out (charts/lists mount late).
      if (scrollTries < 5) {
        scrollTries += 1
        scrollToCenter(el)
      }
      const b = el.getBoundingClientRect()
      const nr = { top: b.top, left: b.left, width: b.width, height: b.height }
      setRect((prev) => (sameRect(prev, nr) ? prev : nr))
    }
    measure()
    const interval = setInterval(measure, 120)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx])

  const next = () => (last ? onDone() : setIdx((i) => i + 1))
  const back = () => setIdx((i) => Math.max(0, i - 1))

  const PAD = 8
  const spot = rect ? { top: rect.top - PAD, left: rect.left - PAD, width: rect.width + 2 * PAD, height: rect.height + 2 * PAD } : null
  const cardPos = spot ? ((spot.top + spot.height / 2) > window.innerHeight / 2 ? 'top' : 'bottom') : 'center'
  const Next = isRTL ? ArrowLeft : ArrowRight
  const Back = isRTL ? ArrowRight : ArrowLeft

  return (
    <div className="tour-overlay" role="dialog" aria-modal="true" aria-label={step.title}>
      {spot
        ? <div className="tour-spot" style={{ top: spot.top, left: spot.left, width: spot.width, height: spot.height }} />
        : <div className="tour-dim" />}

      <div className={`tour-card ${cardPos}`} key={idx}>
        <div className="tour-top">
          <span className="tour-count">{idx + 1} / {steps.length}</span>
          <button className="tour-skip" onClick={onDone} type="button">
            {L(lang, { ar: 'تخطّي', en: 'Skip' })} <X size={14} />
          </button>
        </div>
        <h3 className="tour-title">{step.title}</h3>
        <p className="tour-body">{step.body}</p>
        {step.example && <div className="tour-example">{step.example}</div>}
        <div className="tour-nav">
          <button className="tour-back" onClick={back} disabled={idx === 0} type="button">
            <Back size={15} /> {L(lang, { ar: 'السابق', en: 'Back' })}
          </button>
          <div className="tour-dots" aria-hidden="true">
            {steps.map((_, k) => <span key={k} className={`tour-dot${k === idx ? ' on' : ''}`} />)}
          </div>
          <button className="tour-next" onClick={next} type="button">
            {last ? L(lang, { ar: 'تم', en: 'Done' }) : L(lang, { ar: 'التالي', en: 'Next' })} <Next size={15} />
          </button>
        </div>
      </div>
    </div>
  )
}
