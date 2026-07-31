import { useEffect, useMemo, useState } from 'react'

const SCOPE_PRESETS = [
  'read_products',
  'write_products',
  'read_orders',
  'write_orders',
  'read_customers',
  'write_customers',
  'read_inventory',
  'write_inventory',
  'read_content',
  'read_themes',
]

const STEPS = ['Credentials', 'Authorize', 'Token']

export default function App() {
  const [form, setForm] = useState({ shop: '', apiKey: '', apiSecret: '', scopes: 'read_products' })
  const [showSecret, setShowSecret] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null) // { access_token, scope, shop }

  const step = result ? 3 : 1

  // On return from Shopify the URL carries ?state=... (success) or ?error=...
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const err = params.get('error')
    const state = params.get('state')
    if (err) {
      setError(err)
      window.history.replaceState({}, '', '/')
    } else if (state) {
      setBusy(true)
      fetch(`/api/token/${state}`)
        .then(async (r) => {
          const data = await r.json()
          if (!r.ok) throw new Error(data.error || 'Could not retrieve the token.')
          setResult(data)
        })
        .catch((e) => setError(e.message))
        .finally(() => {
          setBusy(false)
          window.history.replaceState({}, '', '/')
        })
    }
  }, [])

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const scopeList = useMemo(
    () => form.scopes.split(',').map((s) => s.trim()).filter(Boolean),
    [form.scopes],
  )

  const toggleScope = (scope) => {
    const has = scopeList.includes(scope)
    const next = has ? scopeList.filter((s) => s !== scope) : [...scopeList, scope]
    setForm((f) => ({ ...f, scopes: next.join(', ') }))
  }

  async function connect() {
    setError('')
    setBusy(true)
    try {
      const r = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error || 'Something went wrong.')
      // Hand the browser over to Shopify's consent screen.
      window.location.href = data.authorizeUrl
    } catch (e) {
      setError(e.message)
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen px-5 py-10 sm:py-16">
      <div className="mx-auto w-full max-w-xl">
        <Header step={step} />

        {error && (
          <div className="mt-6 flex items-start gap-3 rounded-lg border border-rose/40 bg-rose/5 px-4 py-3 text-sm text-rose">
            <span className="mt-0.5 font-mono text-xs">!</span>
            <div className="flex-1">{error}</div>
            <button onClick={() => setError('')} className="font-mono text-xs text-rose/70 hover:text-rose">
              dismiss
            </button>
          </div>
        )}

        {result ? (
          <TokenCard result={result} onReset={() => setResult(null)} />
        ) : (
          <div className="mt-6 rounded-2xl border border-line bg-panel/70 p-6 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.8)] backdrop-blur">
            <div className="space-y-5">
              <div>
                <label className="label">Store domain</label>
                <input
                  className="field"
                  placeholder="mystore.myshopify.com"
                  value={form.shop}
                  onChange={set('shop')}
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>

              <div>
                <label className="label">Client ID · API key</label>
                <input
                  className="field"
                  placeholder="a1b2c3d4e5f6..."
                  value={form.apiKey}
                  onChange={set('apiKey')}
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>

              <div>
                <label className="label">Client secret · API secret key</label>
                <div className="relative">
                  <input
                    className="field pr-16"
                    type={showSecret ? 'text' : 'password'}
                    placeholder="shpss_..."
                    value={form.apiSecret}
                    onChange={set('apiSecret')}
                    autoComplete="off"
                    spellCheck={false}
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecret((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-2 py-1 font-mono text-[11px] text-fog hover:text-mint"
                  >
                    {showSecret ? 'hide' : 'show'}
                  </button>
                </div>
                <p className="mt-1.5 font-mono text-[11px] text-fog/70">
                  Never leaves your machine — used server-side for the token exchange only.
                </p>
              </div>

              <div>
                <label className="label">Access scopes</label>
                <input
                  className="field"
                  placeholder="read_products, write_orders"
                  value={form.scopes}
                  onChange={set('scopes')}
                  spellCheck={false}
                />
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {SCOPE_PRESETS.map((s) => {
                    const on = scopeList.includes(s)
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => toggleScope(s)}
                        className={
                          'rounded-full border px-2.5 py-1 font-mono text-[11px] transition ' +
                          (on
                            ? 'border-mint/50 bg-mint/10 text-mint'
                            : 'border-line bg-panel2 text-fog hover:border-fog/40 hover:text-chalk')
                        }
                      >
                        {on ? '· ' : '+ '}
                        {s}
                      </button>
                    )
                  })}
                </div>
              </div>

              <button
                onClick={connect}
                disabled={busy}
                className="group relative w-full overflow-hidden rounded-lg bg-mint px-4 py-3 font-display font-semibold text-ink transition hover:bg-mint/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? 'Contacting Shopify…' : 'Continue to Shopify →'}
              </button>
            </div>
          </div>
        )}

        <RedirectHint />
      </div>
    </div>
  )
}

function Header({ step }) {
  return (
    <header>
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-lg border border-mint/30 bg-mint/5">
          <KeyGlyph />
        </div>
        <div>
          <h1 className="font-display text-xl font-semibold tracking-tight text-chalk">Shopify Token Forge</h1>
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-fog">Admin API · OAuth 2.0</p>
        </div>
      </div>

      <ol className="mt-7 flex items-center gap-2">
        {STEPS.map((s, i) => {
          const n = i + 1
          const done = step > n
          const active = step === n
          return (
            <li key={s} className="flex flex-1 items-center gap-2">
              <span
                className={
                  'grid h-6 w-6 shrink-0 place-items-center rounded-full border font-mono text-[11px] ' +
                  (done
                    ? 'border-mint bg-mint text-ink'
                    : active
                      ? 'border-mint text-mint'
                      : 'border-line text-fog')
                }
              >
                {done ? '✓' : n}
              </span>
              <span
                className={
                  'font-mono text-[11px] tracking-wide ' + (active || done ? 'text-chalk' : 'text-fog')
                }
              >
                {s}
              </span>
              {n < STEPS.length && <span className="h-px flex-1 bg-line" />}
            </li>
          )
        })}
      </ol>
    </header>
  )
}

function TokenCard({ result, onReset }) {
  const [revealed, setRevealed] = useState(false)
  const [copied, setCopied] = useState(false)
  const [verify, setVerify] = useState(null) // { loading, data, error }

  const token = result.access_token
  const masked = token.slice(0, 6) + '•'.repeat(18) + token.slice(-4)

  const copy = async () => {
    await navigator.clipboard.writeText(token)
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }

  const runVerify = async () => {
    setVerify({ loading: true })
    try {
      const r = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shop: result.shop, token }),
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error || 'Verification failed.')
      setVerify({ data })
    } catch (e) {
      setVerify({ error: e.message })
    }
  }

  return (
    <div className="mt-6 rounded-2xl border border-mint/25 bg-panel/70 p-6 shadow-glow backdrop-blur">
      <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] text-mint">
        <span className="h-1.5 w-1.5 rounded-full bg-mint" />
        Access token issued
      </div>

      <div className="mt-4 rounded-xl border border-line bg-panel2 p-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="font-mono text-[11px] text-fog">X-Shopify-Access-Token</span>
          <button
            onClick={() => setRevealed((v) => !v)}
            className="font-mono text-[11px] text-fog hover:text-mint"
          >
            {revealed ? 'mask' : 'reveal'}
          </button>
        </div>
        <div className="break-all font-mono text-sm leading-relaxed text-mint">
          {revealed ? token : masked}
        </div>
        <button
          onClick={copy}
          className="mt-3 w-full rounded-lg border border-mint/40 bg-mint/10 py-2 font-display text-sm font-medium text-mint transition hover:bg-mint/20"
        >
          {copied ? 'Copied ✓' : 'Copy token'}
        </button>
      </div>

      <dl className="mt-4 grid grid-cols-1 gap-2 font-mono text-xs">
        <Row label="store" value={result.shop} />
        <Row label="granted scopes" value={result.scope || '—'} />
      </dl>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          onClick={runVerify}
          disabled={verify?.loading}
          className="rounded-lg border border-line bg-panel2 px-3.5 py-2 font-mono text-xs text-chalk transition hover:border-mint/50 disabled:opacity-50"
        >
          {verify?.loading ? 'Checking…' : 'Verify against Shopify'}
        </button>
        <button
          onClick={onReset}
          className="rounded-lg border border-line bg-panel2 px-3.5 py-2 font-mono text-xs text-fog transition hover:text-chalk"
        >
          Start over
        </button>
      </div>

      {verify?.data && (
        <div className="mt-4 rounded-lg border border-mint/30 bg-mint/5 px-4 py-3 font-mono text-xs text-chalk">
          <div className="mb-1 text-mint">Token is live.</div>
          <div className="text-fog">
            {verify.data.name} · {verify.data.plan} · {verify.data.domain}
          </div>
        </div>
      )}
      {verify?.error && (
        <div className="mt-4 rounded-lg border border-rose/40 bg-rose/5 px-4 py-3 font-mono text-xs text-rose">
          {verify.error}
        </div>
      )}
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex items-baseline justify-between gap-4 rounded-lg border border-line bg-panel2 px-3.5 py-2.5">
      <dt className="text-fog">{label}</dt>
      <dd className="break-all text-right text-chalk">{value}</dd>
    </div>
  )
}

function RedirectHint() {
  const uri = 'http://localhost:3001/api/callback'
  return (
    <p className="mt-6 text-center font-mono text-[11px] leading-relaxed text-fog/70">
      In your Shopify app → set the redirect URL to{' '}
      <span className="text-fog">{uri}</span>
    </p>
  )
}

function KeyGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#34E39A" strokeWidth="1.8">
      <circle cx="8" cy="8" r="4" />
      <path d="M11 11l8 8M16 16l2-2M19 19l1.5-1.5" strokeLinecap="round" />
    </svg>
  )
}
