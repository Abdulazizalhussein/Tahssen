import React, { useState } from 'react'
import {
  ShieldCheck, UserPlus, Bot, ShieldAlert, MessageCircle, BarChart2, Sparkles,
  ArrowLeft, ArrowRight, X, TriangleAlert, CheckCircle2, TrendingUp,
} from 'lucide-react'
import { useAccount } from '../store/AccountContext'
import RiyalSymbol from './RiyalSymbol'
import './Onboarding.css'

// Bilingual picker — every string carries { ar, en }.
const L = (lang, o) => (lang === 'en' ? o.en ?? o.ar : o.ar)

/* ── A scripted mini-conversation used to demo a service ── */
function DemoChat({ lang, rows, verdict }) {
  return (
    <div className="onb-chat" dir={lang === 'en' ? 'ltr' : 'rtl'}>
      {rows.map((r, k) => (
        <div key={k} className={`onb-bubble ${r.who}`}>{L(lang, r)}</div>
      ))}
      {verdict && (
        <div className={`onb-verdict ${verdict.tone}`}>
          {verdict.tone === 'danger' ? <TriangleAlert size={16} /> : <CheckCircle2 size={16} />}
          <span>{L(lang, verdict)}</span>
        </div>
      )}
    </div>
  )
}

function ReportedPreview({ lang }) {
  return (
    <div className="onb-reported">
      <div className="onb-reported-head">
        <span className="onb-reported-avatar"><TriangleAlert size={16} color="var(--danger)" /></span>
        <div>
          <div className="onb-reported-name">خالد العتيبي <span className="onb-reported-count">9 {L(lang, { ar: 'بلاغ', en: 'reports' })}</span></div>
          <div className="onb-reported-cat">{L(lang, { ar: 'استثمار وهمي', en: 'Fake investment' })}</div>
        </div>
      </div>
      <p className="onb-reported-reason">“{L(lang, { ar: 'وعدني بمضاعفة المبلغ ثم اختفى', en: 'Promised to double my money, then vanished' })}”</p>
      <div className="onb-reported-behavior"><TrendingUp size={12} /> {L(lang, { ar: 'يسحب الأموال فوراً ويحوّلها لوسطاء ومحافظ خارجية', en: 'Cashes out instantly and routes to mules / external wallets' })}</div>
    </div>
  )
}

function MiniStats({ lang }) {
  return (
    <div className="onb-mini-stats">
      <div className="onb-mini-stat"><span className="onb-mini-val" style={{ color: 'var(--success-bright)' }}>78</span><span className="onb-mini-lbl">{L(lang, { ar: 'مؤشر الصحة', en: 'Health' })}</span></div>
      <div className="onb-mini-stat"><span className="onb-mini-val">29,626 <RiyalSymbol size="0.7em" /></span><span className="onb-mini-lbl">{L(lang, { ar: 'رصيد نهاية الشهر', en: 'Month-end' })}</span></div>
      <div className="onb-mini-stat"><span className="onb-mini-val" style={{ color: 'var(--gold)' }}>↑</span><span className="onb-mini-lbl">{L(lang, { ar: 'توقّع الإنفاق', en: 'Forecast' })}</span></div>
    </div>
  )
}

function MiniRecs({ lang }) {
  return (
    <div className="onb-recs">
      <div className="onb-rec">
        <span className="onb-rec-title">{L(lang, { ar: 'قلّل الاشتراكات غير المستخدمة', en: 'Cut unused subscriptions' })}</span>
        <span className="onb-rec-impact">+180 <RiyalSymbol size="0.7em" /> / {L(lang, { ar: 'شهر', en: 'mo' })}</span>
      </div>
      <div className="onb-rec">
        <span className="onb-rec-title">{L(lang, { ar: 'حوّل الفائض تلقائياً للادخار', en: 'Auto-move surplus to savings' })}</span>
        <span className="onb-rec-impact">+4,500 <RiyalSymbol size="0.7em" /> / {L(lang, { ar: 'شهر', en: 'mo' })}</span>
      </div>
    </div>
  )
}

function buildSlides(lang) {
  return [
    {
      icon: <ShieldCheck size={26} />, tone: 'gold',
      title: L(lang, { ar: 'أهلاً بك في تحصين', en: 'Welcome to Tahseen' }),
      body: L(lang, {
        ar: 'منصة مالية تساعدك على تقليل الاحتيال — من لحظة إضافة مستفيد جديد وحتى تنفيذ التحويل. لنأخذك بجولة سريعة على الخدمات.',
        en: 'A financial platform that helps you cut fraud — from adding a new beneficiary all the way to sending a transfer. Here’s a quick tour.',
      }),
    },
    {
      icon: <UserPlus size={26} />, tone: 'gold',
      title: L(lang, { ar: 'إضافة مستفيد + التحقق المجتمعي', en: 'Add a beneficiary — community check' }),
      body: L(lang, {
        ar: 'عند إضافة مستفيد جديد يتحقق تحصين منه عبر الحماية المجتمعية وأنماط الهندسة الاجتماعية. إن كان مُبلّغاً عنه يظهر لك مع الأسباب وسلوكه المالي — هل يسحب الأموال فور وصولها أو يحوّلها لوسطاء ومحافظ أخرى.',
        en: 'When you add a payee, Tahseen screens them against community reports and social-engineering patterns. If reported, you see the reasons and their money behaviour — do they cash out instantly or route to mules and wallets.',
      }),
      example: <ReportedPreview lang={lang} />,
    },
    {
      icon: <Bot size={26} />, tone: 'teal',
      title: L(lang, { ar: 'لم يكن مُبلّغاً عنه؟ الوكيل يتحقق معك', en: 'Not reported? The agent verifies with you' }),
      body: L(lang, {
        ar: 'إن لم يكن المستفيد معروفاً للمجتمع، نتعرّف عليه من سبب التحويل. بعد إضافته يسألك وكيل تحصين عن الأسباب ويستمر حتى يصل إلى يقين — سليم أو مشبوه — ثم يعطيك التوصية.',
        en: 'If the payee is unknown to the community, we learn from the transfer reason. After you add them, the agent asks about the purpose and keeps probing until it’s certain — safe or suspicious — then gives you a recommendation.',
      }),
    },
    {
      icon: <ShieldAlert size={26} />, tone: 'danger',
      title: L(lang, { ar: 'مثال: تحويل استثماري مشبوه', en: 'Example: a suspicious “investment”' }),
      body: L(lang, {
        ar: 'وعودٌ بأرباح مضمونة من شخص لا تعرفه = مؤشر احتيال. يوقفه تحصين قبل أن تخسر.',
        en: 'Guaranteed returns from a stranger = a fraud signal. Tahseen stops it before you lose.',
      }),
      example: (
        <DemoChat
          lang={lang}
          rows={[
            { who: 'agent', ar: 'ما سبب هذا التحويل؟', en: 'What’s this transfer for?' },
            { who: 'user', ar: 'أستثمر فلوسي معه', en: 'Investing my money with him' },
            { who: 'agent', ar: 'هل تعرفه شخصياً؟', en: 'Do you know him personally?' },
            { who: 'user', ar: 'لا', en: 'No' },
            { who: 'agent', ar: 'هل توجد ضمانات رسمية؟', en: 'Are there official guarantees?' },
            { who: 'user', ar: 'لا شيء رسمي، لكنه يقول إنها مضمونة', en: 'Nothing official, but he says it’s guaranteed' },
          ]}
          verdict={{ tone: 'danger', ar: 'احتيال محتمل — درجة الخطر ٩٢٪ · يُنصح بإيقاف التحويل', en: 'Likely fraud — risk 92% · stop the transfer' }}
        />
      ),
    },
    {
      icon: <ShieldCheck size={26} />, tone: 'teal',
      title: L(lang, { ar: 'مثال: تحويل آمن لقريب', en: 'Example: a safe transfer to family' }),
      body: L(lang, {
        ar: 'التحويلات المألوفة للأقارب تمرّ مباشرة دون إزعاج.',
        en: 'Familiar transfers to family pass straight through — no friction.',
      }),
      example: (
        <DemoChat
          lang={lang}
          rows={[
            { who: 'agent', ar: 'ما سبب هذا التحويل؟', en: 'What’s this transfer for?' },
            { who: 'user', ar: 'مصروف شهري لوالدتي', en: 'Monthly allowance for my mother' },
          ]}
          verdict={{ tone: 'safe', ar: 'تحويل آمن — مستفيد موثوق · تمت الموافقة فوراً', en: 'Safe — trusted payee · approved instantly' }}
        />
      ),
    },
    {
      icon: <MessageCircle size={26} />, tone: 'gold',
      title: L(lang, { ar: 'محادثة تحصين — مستشارك المالي', en: 'Chat with Tahseen — your money coach' }),
      body: L(lang, {
        ar: 'اسأله عن وضعك المالي واطلب خطة للتطوير والتحسين — يجيبك بالأرقام.',
        en: 'Ask about your finances and request an improvement plan — it answers with numbers.',
      }),
      example: (
        <DemoChat
          lang={lang}
          rows={[
            { who: 'user', ar: 'أبي أشتري سيارة نهاية العام، أقدر؟', en: 'I want to buy a car end of year — can I?' },
            {
              who: 'agent',
              ar: 'دخلك يسمح بادّخار ~٤٬٥٠٠ ﷼ شهرياً ← ٢٢٬٥٠٠ خلال ٥ أشهر. لسيارة بـ ٤٠٬٠٠٠: قلّل إنفاقك المتغيّر ١٠٪ وحوّل الفائض تلقائياً — تبلغ الهدف في نوفمبر.',
              en: 'You can save ~4,500 ﷼/mo → 22,500 in 5 months. For a 40,000 car: trim variable spend 10% and auto-transfer the surplus — you hit the goal by November.',
            },
          ]}
        />
      ),
    },
    {
      icon: <BarChart2 size={26} />, tone: 'teal',
      title: L(lang, { ar: 'التحليلات', en: 'Analytics' }),
      body: L(lang, {
        ar: 'مؤشر صحتك المالية، توقّع رصيد نهاية الشهر، والإنفاق الشهري (ماضٍ + توقّع) — كلها تتحدّث مع أرقامك مباشرة.',
        en: 'Your health score, month-end forecast, and monthly spend (past + forecast) — all live with your numbers.',
      }),
      example: <MiniStats lang={lang} />,
    },
    {
      icon: <Sparkles size={26} />, tone: 'gold',
      title: L(lang, { ar: 'التوصيات الذكية', en: 'Smart recommendations' }),
      body: L(lang, {
        ar: 'توصيات عملية لتحسين وضعك، كل واحدة بأثرها المتوقّع بالريال.',
        en: 'Actionable tips to improve your finances, each with its riyal impact.',
      }),
      example: <MiniRecs lang={lang} />,
    },
    {
      icon: <ShieldCheck size={26} />, tone: 'gold',
      title: L(lang, { ar: 'جاهز؟ لنبدأ', en: 'Ready? Let’s go' }),
      body: L(lang, {
        ar: 'أنت الآن تعرف كيف يحميك تحصين. ابدأ بإضافة مستفيد أو بمحادثة تحصين.',
        en: 'You now know how Tahseen protects you. Start by adding a payee or chatting with Tahseen.',
      }),
    },
  ]
}

export default function Onboarding({ onDone }) {
  const { lang, isRTL } = useAccount()
  const [i, setI] = useState(0)
  const slides = buildSlides(lang)
  const slide = slides[i]
  const last = i === slides.length - 1
  const Next = isRTL ? ArrowLeft : ArrowRight
  const Back = isRTL ? ArrowRight : ArrowLeft

  const next = () => (last ? onDone() : setI((v) => v + 1))
  const back = () => setI((v) => Math.max(0, v - 1))

  return (
    <div className="onb-overlay" role="dialog" aria-modal="true" aria-label={slide.title}>
      <div className="onb-card">
        <div className="onb-top">
          <div className="onb-dots" aria-hidden="true">
            {slides.map((_, k) => (
              <span key={k} className={`onb-dot${k === i ? ' on' : ''}${k < i ? ' done' : ''}`} />
            ))}
          </div>
          <button className="onb-skip" onClick={onDone} type="button">
            {L(lang, { ar: 'تخطّي', en: 'Skip' })} <X size={14} />
          </button>
        </div>

        <div className="onb-body" key={i}>
          <span className={`onb-icon ${slide.tone || 'gold'}`}>{slide.icon}</span>
          <h2 className="onb-title">{slide.title}</h2>
          <p className="onb-text">{slide.body}</p>
          {slide.example && <div className="onb-example">{slide.example}</div>}
        </div>

        <div className="onb-nav">
          <button className="onb-back" onClick={back} disabled={i === 0} type="button">
            <Back size={16} /> {L(lang, { ar: 'السابق', en: 'Back' })}
          </button>
          <span className="onb-count">{i + 1} / {slides.length}</span>
          <button className="onb-next" onClick={next} type="button">
            {last ? L(lang, { ar: 'ابدأ الآن', en: 'Get started' }) : L(lang, { ar: 'التالي', en: 'Next' })} <Next size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
