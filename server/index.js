import express from 'express'
import crypto from 'node:crypto'
import dotenv from 'dotenv'

dotenv.config()

const app = express()
app.use(express.json())

const PORT = process.env.PORT || 3001
const APP_URL = process.env.APP_URL || 'http://localhost:5173'
const REDIRECT_URI = process.env.REDIRECT_URI || `http://localhost:${PORT}/api/callback`
const API_VERSION = process.env.SHOPIFY_API_VERSION || '2024-10'

// In-memory stores. This is a local developer tool, so state does not need
// to survive a restart. Do NOT deploy this to a shared server as-is.
const sessions = new Map() // state -> { shop, apiKey, apiSecret, scopes }
const tokens = new Map() //   state -> { access_token, scope, shop }

// Turn "https://My-Store.myshopify.com/" or "my-store" into "my-store.myshopify.com"
function normalizeShop(shop) {
  let s = (shop || '').trim().toLowerCase()
  s = s.replace(/^https?:\/\//, '').replace(/\/.*$/, '')
  if (!s) return null
  if (!s.endsWith('.myshopify.com') && !s.includes('.')) s = `${s}.myshopify.com`
  return /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(s) ? s : null
}

function verifyHmac(query, secret) {
  const { hmac, signature, ...rest } = query
  const message = Object.keys(rest)
    .sort()
    .map((k) => `${k}=${rest[k]}`)
    .join('&')
  const digest = crypto.createHmac('sha256', secret).update(message).digest('hex')
  try {
    return crypto.timingSafeEqual(Buffer.from(digest, 'utf8'), Buffer.from(hmac || '', 'utf8'))
  } catch {
    return false
  }
}

// Step 1 — receive the app credentials, stash them under a random state
// nonce, and hand back the Shopify authorize URL.
app.post('/api/session', (req, res) => {
  const { shop, apiKey, apiSecret, scopes } = req.body || {}
  const normShop = normalizeShop(shop)
  if (!normShop) return res.status(400).json({ error: 'Enter a valid store, like mystore.myshopify.com' })
  if (!apiKey || !apiSecret) return res.status(400).json({ error: 'Client ID and Client secret are both required' })

  const state = crypto.randomBytes(16).toString('hex')
  const scopeStr = (scopes || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .join(',')

  sessions.set(state, { shop: normShop, apiKey, apiSecret, scopes: scopeStr })

  const url = new URL(`https://${normShop}/admin/oauth/authorize`)
  url.searchParams.set('client_id', apiKey)
  url.searchParams.set('scope', scopeStr)
  url.searchParams.set('redirect_uri', REDIRECT_URI)
  url.searchParams.set('state', state)

  res.json({ authorizeUrl: url.toString(), state, redirectUri: REDIRECT_URI })
})

// Step 2 — Shopify redirects the merchant back here with ?code&hmac&state.
// Verify, exchange the code for a token, then bounce back to the UI.
app.get('/api/callback', async (req, res) => {
  const { code, shop, state } = req.query
  const session = sessions.get(state)
  const fail = (msg) => res.redirect(`${APP_URL}/?error=${encodeURIComponent(msg)}`)

  if (!session) return fail('Session expired or invalid state. Start again.')
  if (!verifyHmac(req.query, session.apiSecret)) return fail('HMAC check failed — the request was not signed by Shopify.')
  if (normalizeShop(shop) !== session.shop) return fail('Store mismatch between request and session.')

  try {
    const r = await fetch(`https://${session.shop}/admin/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ client_id: session.apiKey, client_secret: session.apiSecret, code }),
    })
    const data = await r.json()
    if (!r.ok || !data.access_token) {
      return fail(data.error_description || data.error || 'Token exchange failed.')
    }
    tokens.set(state, { access_token: data.access_token, scope: data.scope, shop: session.shop })
    sessions.delete(state)
    res.redirect(`${APP_URL}/?state=${state}`)
  } catch (e) {
    fail(e.message || 'Network error during token exchange.')
  }
})

// Step 3 — the UI fetches the freshly minted token exactly once.
app.get('/api/token/:state', (req, res) => {
  const t = tokens.get(req.params.state)
  if (!t) return res.status(404).json({ error: 'No token found for this session.' })
  tokens.delete(req.params.state) // single use — it never lingers in memory
  res.json(t)
})

// Optional — confirm a token actually works by reading the shop record.
app.post('/api/verify', async (req, res) => {
  const { shop, token } = req.body || {}
  const normShop = normalizeShop(shop)
  if (!normShop || !token) return res.status(400).json({ error: 'Store and token are required.' })
  try {
    const r = await fetch(`https://${normShop}/admin/api/${API_VERSION}/shop.json`, {
      headers: { 'X-Shopify-Access-Token': token },
    })
    const data = await r.json()
    if (!r.ok) return res.status(r.status).json({ error: 'Shopify rejected the token.' })
    res.json({
      ok: true,
      name: data.shop?.name,
      plan: data.shop?.plan_display_name,
      domain: data.shop?.myshopify_domain,
      email: data.shop?.email,
    })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.listen(PORT, () => {
  console.log(`\n  Shopify Token Forge — API\n  → http://localhost:${PORT}`)
  console.log(`  → Redirect URI (add this to your app): ${REDIRECT_URI}\n`)
})
