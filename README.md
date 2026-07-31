# Shopify Token Forge

Generate a **Shopify Admin API access token** through the OAuth 2.0 flow.
React + Vite + Tailwind front end, with a small Express back end that performs
the secure `code → access_token` exchange (this step cannot run in the browser —
Shopify blocks CORS on the token endpoint, and your API secret must stay off the
client).

## Prerequisites

- Node.js 18+ (the backend uses the global `fetch`)
- A Shopify app (Partners dashboard → Apps → *Create app*, or a custom app in a
  store's admin). You need its **Client ID** (API key) and **Client secret**.

## Setup

```bash
npm install
npm run dev
```

This starts:

- the UI on `http://localhost:5173`
- the API on `http://localhost:3001`

## Configure your Shopify app once

In the app settings, add this **Allowed redirection URL**:

```
http://localhost:3001/api/callback
```

Without it, Shopify rejects the OAuth request.

## How it works

1. Enter your store domain, Client ID, Client secret, and the scopes you want.
2. Click **Continue to Shopify** — you're sent to the store's consent screen.
3. After you approve, Shopify redirects back; the backend verifies the request
   HMAC, exchanges the `code` for a token, and hands it to the UI.
4. Copy the token, or hit **Verify against Shopify** to confirm it works.

## Notes

- Tokens are held in memory and served to the UI **once**, then dropped.
- This is a local developer utility. Don't deploy it to a shared/public server
  as-is (credentials would be exposed, and the in-memory store isn't safe for
  multiple users).
- Default API version is `2024-10`; change it in `.env` if needed.

## Scripts

| command           | does                                  |
| ----------------- | ------------------------------------- |
| `npm run dev`     | run UI + API together                 |
| `npm run dev:web` | UI only                               |
| `npm run dev:api` | API only                              |
| `npm run build`   | production build of the UI            |
