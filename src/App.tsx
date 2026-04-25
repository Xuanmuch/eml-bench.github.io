import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import en from './i18n/en.json'
import zh from './i18n/zh.json'

type Lang = 'en' | 'zh'
type Dict = Record<string, string>
type ThemeId = 'default' | 'archive' | 'tpor' | 'oxide' | 'field'
type View = 'system' | 'science' | 'leaderboard'
type TextScale = 'sm' | 'md' | 'lg'
type WlNode = { atom: string } | { head: string; args: WlNode[] }
type SourceDetail = { alias: string; tree: string; mathMl: string; mathMlDisplay: string }

const STR: Record<Lang, Dict> = { en: en as Dict, zh: zh as Dict }

type LeaderEntry = {
  id: string
  source_wl: string
  eml: string
  metrics: {
    char_len: number
    eml_node_count: number
    max_bracket_depth: number
  }
  verified: string
  submitter?: string
  rank_hint?: number
  lineage?: 'baseline' | 'community'
  category?: string
}

type LeaderPayload = { version: number; entries: LeaderEntry[] }

type EntryGroup = { source_wl: string; rows: LeaderEntry[] }

const CATEGORY_ORDER = ['constant', 'unary', 'binary', 'extended']
const APP_MAX_WIDTH_CLASS = 'max-w-[75rem]'
const ALIAS_HEADS: Record<string, string> = {
  ArcCos: 'arccos',
  ArcCosh: 'arccosh',
  ArcSin: 'arcsin',
  ArcSinh: 'arcsinh',
  ArcTan: 'arctan',
  ArcTanh: 'arctanh',
  Avg: 'avg',
  Cos: 'cos',
  Cosh: 'cosh',
  Exp: 'exp',
  Hypot: 'hypot',
  Log: 'log',
  LogisticSigmoid: 'sigmoid',
  Sin: 'sin',
  Sinh: 'sinh',
  Sqrt: 'sqrt',
  Tan: 'tan',
  Tanh: 'tanh',
}
const PRECEDENCE_SUM = 10
const PRECEDENCE_PRODUCT = 20
const PRECEDENCE_POWER = 30
const PRECEDENCE_UNARY = 40
const ROOT_FONT_SIZE_PT: Record<TextScale, string> = {
  sm: '12pt',
  md: '14pt',
  lg: '16pt',
}
const LG_SPAN_CLASSES = {
  1: 'lg:col-span-1',
  2: 'lg:col-span-2',
  3: 'lg:col-span-3',
  4: 'lg:col-span-4',
  5: 'lg:col-span-5',
  6: 'lg:col-span-6',
} as const

function t(lang: Lang, key: string): string {
  return STR[lang][key] ?? STR.en[key] ?? key
}

function baseUrl(): string {
  return import.meta.env.BASE_URL.replace(/\/?$/, '/')
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function showVerifiedMark(verified: string): boolean {
  const x = verified.toLowerCase()
  return x === 'verified' || x === 'pr'
}

function inferLineage(e: LeaderEntry): 'baseline' | 'community' {
  if (e.lineage === 'baseline' || e.lineage === 'community') return e.lineage
  if (e.verified.toLowerCase() === 'seed') return 'baseline'
  return 'community'
}

function compareRows(a: LeaderEntry, b: LeaderEntry): number {
  const da = a.metrics.max_bracket_depth
  const db = b.metrics.max_bracket_depth
  if (da !== db) return da - db
  const na = a.metrics.eml_node_count
  const nb = b.metrics.eml_node_count
  if (na !== nb) return na - nb
  return a.id.localeCompare(b.id)
}

/** Stable fragment id for #jump; disambiguates e.g. 1/2 vs -1/2. */
function anchorFromWl(wl: string): string {
  const t = wl.trim()
  const neg = t.startsWith('-') ? 'm' : ''
  const slug = t
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
  return `src-${neg}${slug}`
}

function baselineLgSpan(wl: string, alias: string): 1 | 2 | 3 | 4 | 5 | 6 {
  const combined = Math.max(wl.length, alias.length)
  return combined > 18 ? 2 : 1
}

function usesCompactIndexCardLayout(category: string): boolean {
  return category === 'unary' || category === 'binary' || category === 'extended'
}

function indexCategoryGridClass(category: string): string {
  if (category === 'extended') return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
  return 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6'
}

function isCallNode(node: WlNode): node is { head: string; args: WlNode[] } {
  return 'head' in node
}

function parseWl(source: string): WlNode | null {
  const input = source.trim()
  let idx = 0

  const skipWhitespace = () => {
    while (/\s/.test(input[idx] ?? '')) idx += 1
  }

  const readToken = () => {
    const start = idx
    while (idx < input.length && !['[', ']', ','].includes(input[idx])) idx += 1
    return input.slice(start, idx).trim()
  }

  const parseExpr = (): WlNode | null => {
    skipWhitespace()
    const token = readToken()
    if (!token) return null

    skipWhitespace()
    if (input[idx] !== '[') return { atom: token }

    idx += 1
    const args: WlNode[] = []
    skipWhitespace()

    while (idx < input.length && input[idx] !== ']') {
      const child = parseExpr()
      if (!child) return null
      args.push(child)
      skipWhitespace()
      if (input[idx] === ',') {
        idx += 1
        skipWhitespace()
      }
    }

    if (input[idx] !== ']') return null
    idx += 1
    return { head: token, args }
  }

  const node = parseExpr()
  skipWhitespace()
  if (!node || idx !== input.length) return null
  return node
}

function wrapIfNeeded(value: string, shouldWrap: boolean): string {
  return shouldWrap ? `(${value})` : value
}

function aliasHead(head: string): string {
  return ALIAS_HEADS[head] ?? head
}

function formatAliasNode(node: WlNode, parentPrecedence = 0): string {
  if (!isCallNode(node)) return node.atom

  const { head, args } = node

  if (head === 'Plus' && args.length >= 2) {
    const rendered = args
      .map((arg, index) => {
        const text = formatAliasNode(arg, PRECEDENCE_SUM)
        if (index === 0) return text
        return text.startsWith('-') ? text : `+ ${text}`
      })
      .join(' ')
      .replace(/\+\s-/g, '- ')
    return wrapIfNeeded(rendered, PRECEDENCE_SUM < parentPrecedence)
  }

  if (head === 'Subtract' && args.length === 2) {
    const rendered = `${formatAliasNode(args[0], PRECEDENCE_SUM)} - ${formatAliasNode(args[1], PRECEDENCE_SUM + 1)}`
    return wrapIfNeeded(rendered, PRECEDENCE_SUM < parentPrecedence)
  }

  if (head === 'Times' && args.length >= 2) {
    if (args.length === 2 && !isCallNode(args[0]) && args[0].atom === '-1') {
      const rendered = `-${formatAliasNode(args[1], PRECEDENCE_UNARY)}`
      return wrapIfNeeded(rendered, PRECEDENCE_UNARY < parentPrecedence)
    }
    const rendered = args.map((arg) => formatAliasNode(arg, PRECEDENCE_PRODUCT)).join(' × ')
    return wrapIfNeeded(rendered, PRECEDENCE_PRODUCT < parentPrecedence)
  }

  if (head === 'Divide' && args.length === 2) {
    const rendered = `${formatAliasNode(args[0], PRECEDENCE_PRODUCT)} / ${formatAliasNode(args[1], PRECEDENCE_PRODUCT + 1)}`
    return wrapIfNeeded(rendered, PRECEDENCE_PRODUCT < parentPrecedence)
  }

  if ((head === 'Power' || head === 'Sqr') && args.length >= 1) {
    const base = formatAliasNode(args[0], PRECEDENCE_POWER)
    const exponent = head === 'Sqr' ? '2' : formatAliasNode(args[1] ?? { atom: '1' }, PRECEDENCE_POWER)
    const rendered = `${base}^${exponent}`
    return wrapIfNeeded(rendered, PRECEDENCE_POWER < parentPrecedence)
  }

  if (head === 'Minus' && args.length === 1) {
    const rendered = `-${formatAliasNode(args[0], PRECEDENCE_UNARY)}`
    return wrapIfNeeded(rendered, PRECEDENCE_UNARY < parentPrecedence)
  }

  if (head === 'Half' && args.length === 1) {
    const rendered = `${formatAliasNode(args[0], PRECEDENCE_PRODUCT)} / 2`
    return wrapIfNeeded(rendered, PRECEDENCE_PRODUCT < parentPrecedence)
  }

  if (head === 'Inv' && args.length === 1) {
    const rendered = `1 / ${formatAliasNode(args[0], PRECEDENCE_PRODUCT + 1)}`
    return wrapIfNeeded(rendered, PRECEDENCE_PRODUCT < parentPrecedence)
  }

  if (head === 'Sqrt' && args.length === 1) {
    return `√(${formatAliasNode(args[0])})`
  }

  return `${aliasHead(head)}(${args.map((arg) => formatAliasNode(arg)).join(', ')})`
}

function formatReadableAliasFromNode(node: WlNode): string {
  return formatAliasNode(node)
}

function wrapMathMl(inner: string, displayMode = false): string {
  const displayAttr = displayMode ? ' display="block"' : ''
  return `<math xmlns="http://www.w3.org/1998/Math/MathML"${displayAttr}><mrow>${inner}</mrow></math>`
}

function wrapMathMlIfNeeded(inner: string, shouldWrap: boolean): string {
  return shouldWrap ? `<mrow><mo>(</mo>${inner}<mo>)</mo></mrow>` : inner
}

function isNegativeNode(node: WlNode): boolean {
  if (!isCallNode(node)) return String(node.atom).startsWith('-')
  if (node.head === 'Minus' && node.args.length === 1) return true
  return node.head === 'Times' && node.args.length === 2 && !isCallNode(node.args[0]) && node.args[0].atom === '-1'
}

function renderPositiveMathMlNode(node: WlNode): string {
  if (!isCallNode(node)) {
    if (String(node.atom).startsWith('-')) return renderMathMlNode({ atom: String(node.atom).slice(1) })
    return renderMathMlNode(node)
  }

  if (node.head === 'Minus' && node.args.length === 1) return renderMathMlNode(node.args[0])
  if (node.head === 'Times' && node.args.length === 2 && !isCallNode(node.args[0]) && node.args[0].atom === '-1') {
    return renderMathMlNode(node.args[1], PRECEDENCE_UNARY)
  }

  return renderMathMlNode(node)
}

function renderMathMlNode(node: WlNode, parentPrecedence = 0): string {
  if (!isCallNode(node)) {
    if (/^[a-zA-Z]+$/.test(node.atom)) return `<mi>${esc(node.atom)}</mi>`
    return `<mn>${esc(node.atom)}</mn>`
  }

  const { head, args } = node

  if (head === 'Plus' && args.length >= 2) {
    const rendered = args
      .map((arg, index) => {
        const inner = renderMathMlNode(arg, PRECEDENCE_SUM)
        if (index === 0) return inner
        if (isNegativeNode(arg)) return `<mo>−</mo>${renderPositiveMathMlNode(arg)}`
        return `<mo>+</mo>${inner}`
      })
      .join('')
    return wrapMathMlIfNeeded(`<mrow>${rendered}</mrow>`, PRECEDENCE_SUM < parentPrecedence)
  }

  if (head === 'Subtract' && args.length === 2) {
    const rendered = `<mrow>${renderMathMlNode(args[0], PRECEDENCE_SUM)}<mo>−</mo>${renderMathMlNode(args[1], PRECEDENCE_SUM + 1)}</mrow>`
    return wrapMathMlIfNeeded(rendered, PRECEDENCE_SUM < parentPrecedence)
  }

  if (head === 'Times' && args.length >= 2) {
    if (args.length === 2 && !isCallNode(args[0]) && args[0].atom === '-1') {
      const rendered = `<mrow><mo>−</mo>${renderMathMlNode(args[1], PRECEDENCE_UNARY)}</mrow>`
      return wrapMathMlIfNeeded(rendered, PRECEDENCE_UNARY < parentPrecedence)
    }
    const rendered = `<mrow>${args.map((arg) => renderMathMlNode(arg, PRECEDENCE_PRODUCT)).join('<mo>×</mo>')}</mrow>`
    return wrapMathMlIfNeeded(rendered, PRECEDENCE_PRODUCT < parentPrecedence)
  }

  if (head === 'Divide' && args.length === 2) {
    const rendered = `<mfrac>${renderMathMlNode(args[0], PRECEDENCE_PRODUCT)}${renderMathMlNode(args[1], PRECEDENCE_PRODUCT + 1)}</mfrac>`
    return wrapMathMlIfNeeded(rendered, PRECEDENCE_PRODUCT < parentPrecedence)
  }

  if ((head === 'Power' || head === 'Sqr') && args.length >= 1) {
    const exponentNode = head === 'Sqr' ? { atom: '2' } : (args[1] ?? { atom: '1' })
    const rendered = `<msup>${renderMathMlNode(args[0], PRECEDENCE_POWER)}${renderMathMlNode(exponentNode, PRECEDENCE_POWER)}</msup>`
    return wrapMathMlIfNeeded(rendered, PRECEDENCE_POWER < parentPrecedence)
  }

  if (head === 'Minus' && args.length === 1) {
    const rendered = `<mrow><mo>−</mo>${renderMathMlNode(args[0], PRECEDENCE_UNARY)}</mrow>`
    return wrapMathMlIfNeeded(rendered, PRECEDENCE_UNARY < parentPrecedence)
  }

  if (head === 'Half' && args.length === 1) {
    const rendered = `<mfrac>${renderMathMlNode(args[0], PRECEDENCE_PRODUCT)}<mn>2</mn></mfrac>`
    return wrapMathMlIfNeeded(rendered, PRECEDENCE_PRODUCT < parentPrecedence)
  }

  if (head === 'Inv' && args.length === 1) {
    const rendered = `<mfrac><mn>1</mn>${renderMathMlNode(args[0], PRECEDENCE_PRODUCT + 1)}</mfrac>`
    return wrapMathMlIfNeeded(rendered, PRECEDENCE_PRODUCT < parentPrecedence)
  }

  if (head === 'Sqrt' && args.length === 1) {
    return `<msqrt>${renderMathMlNode(args[0])}</msqrt>`
  }

  const funcName = aliasHead(head)
  const renderedArgs = args.map((arg, index) => `${index > 0 ? '<mo>,</mo>' : ''}${renderMathMlNode(arg)}`).join('')
  return `<mrow><mi mathvariant="normal">${esc(funcName)}</mi><mo>(</mo>${renderedArgs}<mo>)</mo></mrow>`
}

function renderMathMl(source: string, displayMode = false): string {
  const node = parseWl(source)
  return node ? wrapMathMl(renderMathMlNode(node), displayMode) : wrapMathMl(`<mtext>${esc(source)}</mtext>`, displayMode)
}

function renderSourceTree(source: string): string {
  const node = parseWl(source)
  if (!node) return source

  const lines: string[] = []

  const walk = (current: WlNode, prefix: string, isLast: boolean, depth: number) => {
    const label = isCallNode(current) ? current.head : current.atom
    const connector = depth === 0 ? '' : isLast ? '└─ ' : '├─ '
    lines.push(`${prefix}${connector}${label}`)

    if (!isCallNode(current)) return

    const nextPrefix = depth === 0 ? '' : `${prefix}${isLast ? '   ' : '│  '}`
    current.args.forEach((child, index) => {
      walk(child, nextPrefix, index === current.args.length - 1, depth + 1)
    })
  }

  walk(node, '', true, 0)
  return lines.join('\n')
}

function buildSourceDetail(source: string): SourceDetail {
  const node = parseWl(source)
  return {
    alias: node ? formatReadableAliasFromNode(node) : source,
    tree: renderSourceTree(source),
    mathMl: node ? wrapMathMl(renderMathMlNode(node)) : renderMathMl(source),
    mathMlDisplay: node ? wrapMathMl(renderMathMlNode(node), true) : renderMathMl(source, true),
  }
}

function MathFormula({
  detail,
  className = '',
  displayMode = false,
}: {
  detail: SourceDetail
  className?: string
  displayMode?: boolean
}) {
  return (
    <span
      className={`emlhub-math ${displayMode ? 'emlhub-math-display' : ''} ${className}`}
      aria-label={detail.alias}
      title={detail.alias}
      dangerouslySetInnerHTML={{ __html: displayMode ? detail.mathMlDisplay : detail.mathMl }}
    />
  )
}

/** Full-width band; inner column max-w-5xl centered (no left-1/2/transform — avoids clash with CSS animations on transform). */
function BleedStrip({
  id,
  bandClassName = '',
  innerClassName = '',
  children,
}: {
  id?: string
  bandClassName?: string
  innerClassName?: string
  children: ReactNode
}) {
  return (
    <section id={id} className={`emlhub-section w-full min-w-0 ${bandClassName}`}>
      <div className={`mx-auto w-full ${APP_MAX_WIDTH_CLASS} px-3 sm:px-4 ${innerClassName}`}>{children}</div>
    </section>
  )
}

/** Case-file style: index · label · rule line · optional right slot (cf. s__header + s__rule) */
function SectionRuleHeader({ num, label, right }: { num: string; label: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2">
      <span className="font-mono text-[0.72rem] tabular-nums tracking-tight text-[var(--accent-warm)]">{num}</span>
      <div className="shrink-0">{label}</div>
      <span className="h-px min-w-[2rem] flex-1 bg-[var(--hairline)]" aria-hidden />
      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  )
}

const btnBase =
  'border border-[var(--hairline-strong)] bg-[var(--panel-bg)] px-2.5 py-1 font-mono text-[0.72rem] uppercase tracking-wide text-[var(--ink)] transition-shadow hover:shadow-[1px_1px_0_0_var(--shadow)] active:translate-x-px active:translate-y-px active:shadow-none'

const btnTabActive = 'bg-[var(--tab-active-bg)] text-[var(--tab-active-fg)]'

function MultilineMuted({ text, className = '' }: { text: string; className?: string }) {
  const parts = text.split('\n\n')
  return (
    <div className={`space-y-4 leading-[1.85] text-[var(--muted)] ${className}`}>
      {parts.map((p, i) => (
        <p key={i} className="m-0 text-pretty">
          {p.split('\n').map((line, j) => (
            <Fragment key={j}>
              {j > 0 ? <br /> : null}
              {line}
            </Fragment>
          ))}
        </p>
      ))}
    </div>
  )
}

/** Bordered prose block with subtle perspective tilt on hover. `hoverShadow={false}` for IX / 源表达式速览 copy (no drop shadow). */
function ProsePanel({
  children,
  className = '',
  hoverShadow = true,
}: {
  children: ReactNode
  className?: string
  hoverShadow?: boolean
}) {
  const tilt = hoverShadow ? 'emlhub-tilt' : 'emlhub-tilt emlhub-tilt-plain'
  return <div className={`emlhub-prose ${tilt} ${className}`}>{children}</div>
}

export default function App() {
  const [lang, setLang] = useState<Lang>(() => {
    const s = localStorage.getItem('emlhub_lang') as Lang | null
    return s === 'zh' || s === 'en' ? s : 'en'
  })
  const [theme, setTheme] = useState<ThemeId>(() => {
    const s = localStorage.getItem('emlhub_theme')
    if (s === 'white') return 'default'
    return s === 'default' || s === 'oxide' || s === 'field' || s === 'tpor' || s === 'archive' ? s : 'default'
  })
  const [dark, setDark] = useState<boolean>(() => localStorage.getItem('emlhub_dark') === '1')
  const [textScale, setTextScale] = useState<TextScale>(() => {
    const s = localStorage.getItem('emlhub_text_scale') as TextScale | null
    return s === 'sm' || s === 'md' || s === 'lg' ? s : 'md'
  })
  const [view, setView] = useState<View>('system')
  const [entries, setEntries] = useState<LeaderEntry[]>([])
  const [loadErr, setLoadErr] = useState<string | null>(null)
  const [activeEml, setActiveEml] = useState<{ id: string; source_wl: string; eml: string } | null>(null)

  useEffect(() => {
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en'
    localStorage.setItem('emlhub_lang', lang)
  }, [lang])

  useEffect(() => {
    localStorage.setItem('emlhub_theme', theme)
  }, [theme])

  useEffect(() => {
    localStorage.setItem('emlhub_dark', dark ? '1' : '0')
  }, [dark])

  useEffect(() => {
    document.documentElement.style.fontSize = ROOT_FONT_SIZE_PT[textScale]
    localStorage.setItem('emlhub_text_scale', textScale)
    return () => {
      document.documentElement.style.removeProperty('font-size')
    }
  }, [textScale])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const url = `${baseUrl()}data/leaderboard.json`
        const r = await fetch(url)
        if (!r.ok) throw new Error('leaderboard load failed')
        const data = (await r.json()) as LeaderPayload
        if (!cancelled) {
          setEntries([...data.entries])
          setLoadErr(null)
        }
      } catch {
        if (!cancelled) {
          setLoadErr('Failed to load leaderboard.json')
          setEntries([])
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const groups = useMemo(() => {
    const map = new Map<string, LeaderEntry[]>()
    for (const e of entries) {
      const k = e.source_wl
      if (!map.has(k)) map.set(k, [])
      map.get(k)!.push(e)
    }
    const keys = [...map.keys()].sort((a, b) => a.localeCompare(b))
    const outG: EntryGroup[] = keys.map((k) => {
      const rows = [...map.get(k)!]
      rows.sort(compareRows)
      return { source_wl: k, rows }
    })
    return outG
  }, [entries])

  const baselineByCategory = useMemo(() => {
    const baselines = entries.filter((e) => inferLineage(e) === 'baseline')
    const m = new Map<string, LeaderEntry[]>()
    for (const e of baselines) {
      const cat = e.category && e.category.trim() ? e.category : 'other'
      if (!m.has(cat)) m.set(cat, [])
      m.get(cat)!.push(e)
    }
    for (const arr of m.values()) {
      arr.sort((a, b) => a.source_wl.localeCompare(b.source_wl))
    }
    const order = [...CATEGORY_ORDER, 'other']
    const keys = [...m.keys()].sort((a, b) => {
      const ia = order.indexOf(a)
      const ib = order.indexOf(b)
      const sa = ia === -1 ? 999 : ia
      const sb = ib === -1 ? 999 : ib
      if (sa !== sb) return sa - sb
      return a.localeCompare(b)
    })
    return { map: m, keys }
  }, [entries])

  const sourceDetails = useMemo(() => {
    const details = new Map<string, SourceDetail>()
    for (const { source_wl } of entries) {
      if (details.has(source_wl)) continue
      details.set(source_wl, buildSourceDetail(source_wl))
    }
    return details
  }, [entries])

  const navBtn = (v: View, label: string) => (
    <button
      type="button"
      className={`${btnBase} ${view === v ? btnTabActive : ''}`}
      onClick={() => setView(v)}
    >
      {label}
    </button>
  )

  const themeBtn = (id: ThemeId, label: string) => (
    <button
      type="button"
      className={`${btnBase} ${theme === id ? btnTabActive : ''}`}
      onClick={() => setTheme(id)}
      title={t(lang, `theme_${id}_hint`)}
    >
      {label}
    </button>
  )

  const scaleBtn = (s: TextScale, label: string) => (
    <button
      type="button"
      className={`${btnBase} min-w-[2.25rem] px-2 ${textScale === s ? btnTabActive : ''}`}
      onClick={() => setTextScale(s)}
      title={t(lang, 'text_scale_hint')}
    >
      {label}
    </button>
  )

  const modeLabel = dark ? t(lang, 'mode_dark') : t(lang, 'mode_light')

  const catLabel = (cat: string) => {
    if (cat === 'constant') return t(lang, 'cat_constant')
    if (cat === 'unary') return t(lang, 'cat_unary')
    if (cat === 'binary') return t(lang, 'cat_binary')
    if (cat === 'extended') return t(lang, 'cat_extended')
    return cat
  }

  const getSourceDetail = useCallback(
    (sourceWl: string) => sourceDetails.get(sourceWl) ?? buildSourceDetail(sourceWl),
    [sourceDetails],
  )

  const activeSourceDetail = useMemo(
    () => (activeEml ? getSourceDetail(activeEml.source_wl) : null),
    [activeEml, getSourceDetail],
  )

  const jumpFlashTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const runJumpFlash = useCallback((anchorId: string) => {
    window.setTimeout(() => {
      const el = document.getElementById(anchorId)
      if (!el) return
      el.classList.remove('emlhub-jump-flash')
      void el.offsetWidth
      el.classList.add('emlhub-jump-flash')
      if (jumpFlashTimer.current) clearTimeout(jumpFlashTimer.current)
      jumpFlashTimer.current = window.setTimeout(() => {
        el.classList.remove('emlhub-jump-flash')
        jumpFlashTimer.current = null
      }, 10200)
    }, 100)
  }, [])

  useEffect(() => {
    if (view !== 'leaderboard') return

    const onHash = () => {
      const id = window.location.hash.slice(1)
      if (!id.startsWith('src-')) return
      runJumpFlash(id)
    }

    onHash()
    window.addEventListener('hashchange', onHash)
    return () => {
      window.removeEventListener('hashchange', onHash)
      if (jumpFlashTimer.current) {
        clearTimeout(jumpFlashTimer.current)
        jumpFlashTimer.current = null
      }
    }
  }, [view, entries.length, runJumpFlash])

  return (
    <div
      data-theme={theme}
      data-mode={dark ? 'dark' : 'light'}
      data-text-scale={textScale}
      className="relative min-h-screen overflow-x-hidden bg-[var(--page-bg)] text-[var(--ink)]"
      style={{ fontFamily: '"IBM Plex Sans", system-ui, sans-serif' }}
    >
      <header className="border-b border-[var(--hairline)] bg-[var(--page-bg)]">
        <div className={`mx-auto flex w-full ${APP_MAX_WIDTH_CLASS} flex-col gap-3 px-3 py-2.5 sm:px-4 lg:flex-row lg:items-center lg:justify-between`}>
          <div className="text-[22px] font-black leading-none tracking-tight text-[var(--ink)]">
            <span>{t(lang, 'brand_console')}</span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {navBtn('system', t(lang, 'nav_console_system'))}
            {navBtn('science', t(lang, 'nav_console_science'))}
            {navBtn('leaderboard', t(lang, 'nav_console_board'))}
            <span className="mx-0.5 hidden h-5 w-px bg-[var(--hairline-strong)] sm:inline" aria-hidden />
            {themeBtn('default', t(lang, 'theme_default'))}
            {themeBtn('archive', t(lang, 'theme_archive'))}
            {themeBtn('tpor', t(lang, 'theme_tpor'))}
            {themeBtn('oxide', t(lang, 'theme_oxide'))}
            {themeBtn('field', t(lang, 'theme_field'))}
            <button type="button" className={btnBase} onClick={() => setDark((d) => !d)} title={t(lang, 'mode_toggle_hint')}>
              {modeLabel}
            </button>
            <span className="hidden h-5 w-px bg-[var(--hairline-strong)] sm:inline" aria-hidden />
            {scaleBtn('sm', t(lang, 'text_scale_sm'))}
            {scaleBtn('md', t(lang, 'text_scale_md'))}
            {scaleBtn('lg', t(lang, 'text_scale_lg'))}
            <button type="button" className={btnBase} onClick={() => setLang(lang === 'en' ? 'zh' : 'en')}>
              {lang === 'en' ? t(lang, 'lang_label_en') : t(lang, 'lang_label_zh')}
            </button>
          </div>
        </div>
      </header>

      <main className="w-full min-w-0 pb-16 pt-5">
        {view === 'system' && (
          <div>
            <BleedStrip bandClassName="bg-[var(--band-alt)]" innerClassName="py-8">
              <SectionRuleHeader
                num="00"
                label={
                  <span className="font-mono text-[0.72rem] uppercase tracking-[0.2em] text-[var(--muted)]">
                    {t(lang, 'band_overview')}
                  </span>
                }
              />
              <p className="font-mono text-[0.7rem] uppercase tracking-[0.14em] text-[var(--accent-warm)]">{t(lang, 'tagline')}</p>
              <h1 className="mt-2 w-full max-w-none text-xl font-bold tracking-tight text-[var(--ink)] sm:text-2xl">
                {t(lang, 'hero_title')}
              </h1>
              <ProsePanel className="mt-4">
                <MultilineMuted text={t(lang, 'hero_body')} className="w-full max-w-none" />
              </ProsePanel>
              <div className="mt-6 flex flex-wrap gap-2">
                <button type="button" className={btnBase} onClick={() => setView('science')}>
                  {t(lang, 'hero_cta_science')}
                </button>
                <button type="button" className={btnBase} onClick={() => setView('leaderboard')}>
                  {t(lang, 'hero_cta_board')}
                </button>
              </div>
            </BleedStrip>

            <BleedStrip innerClassName="py-8">
              <SectionRuleHeader
                num="01"
                label={
                  <span className="font-mono text-[0.72rem] uppercase tracking-[0.2em] text-[var(--muted)]">
                    {t(lang, 'band_contribute')}
                  </span>
                }
              />
              <h2 className="text-lg font-bold tracking-tight text-[var(--ink)]">{t(lang, 'section_submit')}</h2>
              <ProsePanel className="mt-3">
                <MultilineMuted text={t(lang, 'section_submit_body')} className="w-full max-w-none" />
              </ProsePanel>
            </BleedStrip>
          </div>
        )}

        {view === 'science' && (
          <div>
            <BleedStrip bandClassName="border-b border-[var(--hairline)] bg-[var(--band-alt)]" innerClassName="pb-6 pt-2">
              <p className="font-mono text-[0.7rem] uppercase tracking-[0.14em] text-[var(--accent-warm)]">{t(lang, 'science_page_kicker')}</p>
              <h1 className="mt-2 w-full max-w-none text-2xl font-bold tracking-tight text-[var(--ink)]">{t(lang, 'science_page_title')}</h1>
            </BleedStrip>
            {[1, 2, 3, 4, 5].map((n, idx) => (
              <BleedStrip
                key={n}
                bandClassName={idx % 2 === 1 ? 'bg-[var(--band-alt)]' : ''}
                innerClassName="py-7"
              >
                <SectionRuleHeader
                  num={String(n).padStart(2, '0')}
                  label={
                    <h2 className="text-base font-bold tracking-tight text-[var(--ink)] sm:text-lg">
                      {t(lang, `science_s${n}_title`)}
                    </h2>
                  }
                />
                <ProsePanel>
                  <MultilineMuted text={t(lang, `science_s${n}_body`)} className="w-full max-w-none" />
                </ProsePanel>
              </BleedStrip>
            ))}
          </div>
        )}

        {view === 'leaderboard' && (
          <div>
            <BleedStrip bandClassName="border-b border-[var(--hairline)]" innerClassName="pb-6 pt-2">
              <SectionRuleHeader
                num="LB"
                label={<h2 className="text-lg font-bold tracking-tight text-[var(--ink)]">{t(lang, 'section_board')}</h2>}
              />
              <ProsePanel className="mt-1" hoverShadow={false}>
                <p className="m-0 text-pretty text-xs leading-relaxed text-[var(--muted)]">{t(lang, 'section_board_desc')}</p>
              </ProsePanel>
              {loadErr ? <p className="mt-3 font-mono text-sm text-[var(--accent)]">{loadErr}</p> : null}
            </BleedStrip>

            {!loadErr && entries.length > 0 && (
              <BleedStrip bandClassName="bg-[var(--band-alt)]" innerClassName="py-3">
                <SectionRuleHeader
                  num="IX"
                  label={
                    <span className="font-mono text-[0.72rem] uppercase tracking-[0.2em] text-[var(--muted)]">
                      {t(lang, 'baseline_catalog_title')}
                    </span>
                  }
                />
                <ProsePanel className="mb-2" hoverShadow={false}>
                  <p className="m-0 text-pretty text-sm leading-relaxed text-[var(--muted)]">{t(lang, 'baseline_catalog_desc')}</p>
                </ProsePanel>
                <div className="space-y-3">
                  {baselineByCategory.keys.map((cat) => {
                    const rows = baselineByCategory.map.get(cat) ?? []
                    if (rows.length === 0) return null
                    return (
                      <div key={cat}>
                        <h3 className="mb-1.5 font-mono text-[0.72rem] font-bold uppercase tracking-wider text-[var(--accent-warm)]">
                          {catLabel(cat)}
                        </h3>
                        <div className={`grid grid-flow-dense gap-1 ${indexCategoryGridClass(cat)}`}>
                          {rows.map((e) => {
                            const detail = getSourceDetail(e.source_wl)
                            const usesCompactLayout = usesCompactIndexCardLayout(cat)
                            const displayedInlineLabel = usesCompactLayout ? e.source_wl : detail.alias
                            const aliasWideClass =
                              cat === 'extended' ? '' : displayedInlineLabel.length > 18 ? 'sm:col-span-2 md:col-span-2 lg:col-span-2' : ''
                            const cardSpanClass =
                              cat === 'extended' ? LG_SPAN_CLASSES[1] : LG_SPAN_CLASSES[baselineLgSpan(e.source_wl, displayedInlineLabel)]
                            return (
                              <div
                                key={e.id}
                                className={`emlhub-float-wrap min-w-0 ${aliasWideClass} ${cardSpanClass}`}
                              >
                                <a
                                  href={`#${anchorFromWl(e.source_wl)}`}
                                  onClick={(ev) => {
                                    const id = anchorFromWl(e.source_wl)
                                    const href = `#${id}`
                                    if (window.location.hash === href) {
                                      ev.preventDefault()
                                      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                                      runJumpFlash(id)
                                    }
                                  }}
                                  className={`emlhub-tilt emlhub-tilt-plain group relative border-0 border-b border-[var(--hairline)] border-l-2 border-l-[var(--accent-warm)] bg-[var(--panel-bg)] px-2 py-1.5 pl-2 no-underline ${
                                    usesCompactLayout ? 'flex h-full min-h-[5.75rem] flex-col justify-between' : 'block'
                                  }`}
                                >
                                  <div className="pointer-events-none absolute inset-x-0 bottom-full z-20 mb-2 hidden group-hover:block group-focus-visible:block">
                                    <div className="border border-[var(--hairline-strong)] bg-[var(--panel-bg)] px-2 py-1.5 shadow-[3px_4px_0_0_var(--shadow)]">
                                      <p className="m-0 font-mono text-[0.62rem] uppercase tracking-[0.08em] text-[var(--muted)]">
                                        {t(lang, 'formula_alias_label')}
                                      </p>
                                      <div className="mt-1 min-w-0 overflow-hidden text-[0.92rem] text-[var(--ink)]">
                                        <MathFormula detail={detail} displayMode />
                                      </div>
                                    </div>
                                  </div>
                                  <div
                                    className={`border-b border-[var(--hairline)] pb-1 ${
                                      usesCompactLayout ? 'flex items-center justify-between gap-2' : 'flex items-baseline justify-between gap-3'
                                    }`}
                                  >
                                    <code
                                      className={`block min-w-0 flex-1 font-mono text-[0.86rem] font-semibold text-[var(--link)] ${
                                        usesCompactLayout ? 'overflow-hidden text-ellipsis whitespace-nowrap' : 'break-all'
                                      }`}
                                    >
                                      {esc(e.source_wl)}
                                    </code>
                                    {!usesCompactLayout && detail.alias !== e.source_wl ? (
                                      <div
                                        className="shrink-0 min-w-[5.75rem] text-right text-[0.92rem] text-[var(--muted)]"
                                      >
                                        <MathFormula detail={detail} className="w-full justify-end" />
                                      </div>
                                    ) : null}
                                  </div>
                                  <div className="mt-1 space-y-0.5 font-mono text-[0.68rem] tabular-nums text-[var(--muted)]">
                                    <div>
                                      {t(lang, 'col_nodes')}: {e.metrics.eml_node_count}
                                    </div>
                                    <div className="flex items-end justify-between gap-2">
                                      <span className="whitespace-nowrap">
                                        {t(lang, 'col_depth')}: {e.metrics.max_bracket_depth}
                                      </span>
                                      <span className="inline-block whitespace-nowrap text-[var(--accent-warm)] group-hover:underline">
                                        {t(lang, 'card_jump')} →
                                      </span>
                                    </div>
                                  </div>
                                </a>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </BleedStrip>
            )}

            {!loadErr && (
              <BleedStrip innerClassName="py-2">
                <div className="grid grid-cols-1 gap-1.5 md:grid-cols-2">
                  {groups.map((g, i) => {
                    return (
                      <div key={g.source_wl} className="emlhub-float-wrap min-w-0">
                        <section
                          id={anchorFromWl(g.source_wl)}
                          className="emlhub-tilt emlhub-tilt-plain scroll-mt-20 border-0 border-b border-[var(--hairline)] border-l-2 border-l-[var(--accent-warm)] bg-[var(--panel-bg)] px-2 pb-2 pt-1"
                        >
                          <div className="overflow-x-auto">
                            <table className="emlhub-mini-table w-full table-fixed border-collapse text-left font-mono text-[0.72rem]">
                              <colgroup>
                                <col className="w-[2.25rem]" />
                                <col />
                                <col className="w-[3.75rem]" />
                                <col className="w-[4.5rem]" />
                                <col className="w-[min(34%,10rem)]" />
                              </colgroup>
                              <thead>
                                <tr className="text-[var(--table-head-fg)]" style={{ backgroundColor: 'var(--table-head-bg)' }}>
                                  <th
                                    colSpan={2}
                                    className="border-0 border-b border-[var(--hairline-strong)] px-1.5 py-1.5 text-left align-bottom font-semibold normal-case"
                                  >
                                    <div className="grid grid-cols-[1.75rem_minmax(0,1fr)] items-start gap-x-2">
                                      <span className="shrink-0 text-[var(--accent-warm)]">{String(i + 1).padStart(2, '0')}</span>
                                      <span
                                        className="block min-w-0 break-words font-mono leading-tight text-[var(--table-head-fg)]"
                                        title={g.source_wl}
                                      >
                                        {esc(g.source_wl)}
                                      </span>
                                    </div>
                                  </th>
                                  <th className="border-0 border-b border-[var(--hairline-strong)] px-1 py-1.5 text-right align-bottom text-[0.64rem] font-semibold uppercase tracking-[0.06em] whitespace-nowrap">
                                    {t(lang, 'col_nodes')}
                                  </th>
                                  <th className="border-0 border-b border-[var(--hairline-strong)] px-1 py-1.5 text-right align-bottom text-[0.64rem] font-semibold uppercase tracking-[0.06em] whitespace-nowrap">
                                    {t(lang, 'col_depth')}
                                  </th>
                                  <th className="border-0 border-b border-[var(--hairline-strong)] px-1 py-1.5 text-right align-bottom text-[0.64rem] font-semibold uppercase tracking-[0.06em] whitespace-nowrap">
                                    <span className="block truncate" title={t(lang, 'col_submitter_verify')}>
                                      {t(lang, 'col_submitter_verify')}
                                    </span>
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {g.rows.map((e, idx) => {
                                  const mark = showVerifiedMark(e.verified)
                                  const base = inferLineage(e) === 'baseline'
                                  return (
                                    <tr
                                      key={e.id}
                                      role="button"
                                      tabIndex={0}
                                      onClick={() => setActiveEml({ id: e.id, source_wl: e.source_wl, eml: e.eml })}
                                      onKeyDown={(ev) => {
                                        if (ev.key === 'Enter' || ev.key === ' ') {
                                          ev.preventDefault()
                                          setActiveEml({ id: e.id, source_wl: e.source_wl, eml: e.eml })
                                        }
                                      }}
                                      className={`cursor-pointer transition-colors hover:bg-[var(--accent-glow)] focus-visible:outline focus-visible:outline-1 focus-visible:outline-[var(--accent-warm)] ${base ? 'bg-[var(--baseline-row-bg)]' : 'bg-[var(--panel-bg)]'}`}
                                    >
                                      <td className="emlhub-mini-td border-0 border-b border-[var(--hairline)] px-1 py-1 text-center align-middle tabular-nums">
                                        {idx + 1}
                                      </td>
                                      <td className="emlhub-mini-td border-0 border-b border-[var(--hairline)] px-1 py-1 align-middle">
                                        <span
                                          className="block max-w-full truncate text-left text-[var(--link)] underline-offset-2"
                                          title={esc(e.id)}
                                        >
                                          {esc(e.id)}
                                        </span>
                                      </td>
                                      <td className="emlhub-mini-td border-0 border-b border-[var(--hairline)] px-1 py-1 text-right align-middle tabular-nums">{e.metrics.eml_node_count}</td>
                                      <td className="emlhub-mini-td border-0 border-b border-[var(--hairline)] px-1 py-1 text-right align-middle tabular-nums">{e.metrics.max_bracket_depth}</td>
                                      <td className="emlhub-mini-td border-0 border-b border-[var(--hairline)] px-1 py-1 text-right align-top">
                                        <div className="ml-auto flex min-w-0 max-w-full flex-col items-end gap-0.5 text-right leading-tight">
                                          <span className="block max-w-full truncate text-[0.72rem] text-[var(--ink)]" title={esc(e.submitter ?? '—')}>
                                            {mark ? <span className="mr-0.5 font-bold text-[var(--accent)]">[V]</span> : null}
                                            {esc(e.submitter ?? '—')}
                                          </span>
                                          <span className="font-mono text-[0.64rem] uppercase tracking-wide text-[var(--muted)]">{esc(e.verified.toUpperCase())}</span>
                                        </div>
                                      </td>
                                    </tr>
                                  )
                                })}
                              </tbody>
                            </table>
                          </div>
                        </section>
                      </div>
                    )
                  })}
                </div>
              </BleedStrip>
            )}
          </div>
        )}
      </main>
      {activeEml && (
        <div
          className="fixed inset-0 z-50 flex items-end bg-black/40 p-0 sm:items-center sm:justify-center sm:p-6"
          onClick={() => setActiveEml(null)}
        >
          <div
            className="max-h-[84vh] w-full border border-[var(--hairline-strong)] bg-[var(--panel-bg)] p-3 sm:max-w-4xl"
            style={{ boxShadow: 'inset 2px 0 0 0 var(--accent-warm)' }}
            onClick={(ev) => ev.stopPropagation()}
          >
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="m-0 font-mono text-[0.7rem] uppercase tracking-wide text-[var(--muted)]">{t(lang, 'eml_detail_label')}</p>
                <code className="block truncate text-sm font-semibold text-[var(--link)]">{esc(activeEml.source_wl)}</code>
                {activeSourceDetail && activeSourceDetail.alias !== activeEml.source_wl ? (
                  <div className="mt-1 truncate text-sm text-[var(--muted)]">
                    <MathFormula detail={activeSourceDetail} />
                  </div>
                ) : null}
              </div>
              <button type="button" className={`${btnBase} px-2 py-0.5`} onClick={() => setActiveEml(null)}>
                {t(lang, 'btn_hide')}
              </button>
            </div>
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)]">
              <div className="max-h-[66vh] overflow-auto border border-[var(--hairline)] bg-[var(--accent-glow)] p-2">
                <pre className="m-0 whitespace-pre-wrap break-all font-mono text-[0.8rem] leading-relaxed text-[var(--ink)]">
                  {esc(activeEml.eml)}
                </pre>
              </div>
              <div className="space-y-3">
                <div className="border border-[var(--hairline)] bg-[var(--panel-bg)] p-2">
                  <p className="m-0 font-mono text-[0.68rem] uppercase tracking-wide text-[var(--muted)]">
                    {t(lang, 'formula_alias_label')}
                  </p>
                  {activeSourceDetail ? (
                    <div className="mt-2 break-words text-[1.15rem] text-[var(--ink)]">
                      <MathFormula detail={activeSourceDetail} displayMode />
                    </div>
                  ) : null}
                </div>
                <div className="border border-[var(--hairline)] bg-[var(--panel-bg)] p-2">
                  <p className="m-0 font-mono text-[0.68rem] uppercase tracking-wide text-[var(--muted)]">
                    {t(lang, 'source_tree_label')}
                  </p>
                  <pre className="mt-1 overflow-auto whitespace-pre font-mono text-[0.78rem] leading-relaxed text-[var(--ink)]">
                    {activeSourceDetail?.tree}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
