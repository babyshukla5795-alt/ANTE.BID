# Ante — deployment & payments setup

This folder is a complete site: `index.html` (frontend) + `/api` (three serverless
functions) that together take real payments through Stripe Checkout and store bids
in Upstash Redis. It's written for Vercel, since its serverless functions need no
extra config there — the `/api` folder is auto-detected.

The frontend automatically detects whether a live backend is present: open
`index.html` on its own (or in the Claude preview) and it falls back to a
local, simulated "no real charge" demo mode. Once deployed with the steps
below, it switches itself into live mode — no code change needed.

## 1. Create accounts (both have free tiers)

- **Stripe** — stripe.com → Dashboard. You'll need this in **test mode** first.
- **Upstash** — upstash.com → create a Redis database (any free region).
- **Vercel** — vercel.com, if you don't already have an account.

## 2. Get your keys

From the Stripe Dashboard (test mode toggle in the top right):
- `STRIPE_SECRET_KEY` — Developers → API keys → Secret key (starts `sk_test_`)

From Upstash, on your database's page:
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

`STRIPE_WEBHOOK_SECRET` comes in step 4, after you have a live URL to point Stripe at.

## 3. Deploy

```
npm install -g vercel     # if you don't have it
cd ante-site
vercel                     # follow the prompts, deploy to a new project
```

Then in the Vercel project dashboard → Settings → Environment Variables, add:
- `STRIPE_SECRET_KEY`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `STRIPE_WEBHOOK_SECRET` (add this after step 4, then redeploy)

Redeploy after adding env vars: `vercel --prod`

## 4. Point Stripe at your webhook

The webhook is what actually publishes a bid — Checkout alone doesn't. In the
Stripe Dashboard: Developers → Webhooks → Add endpoint.

- Endpoint URL: `https://your-deployed-domain.vercel.app/api/webhook`
- Event to send: `checkout.session.completed`

Stripe will show you a signing secret (starts `whsec_`) — that's your
`STRIPE_WEBHOOK_SECRET`. Add it to Vercel's env vars and redeploy.

To test locally before going live, the Stripe CLI can forward events to your
machine: `stripe listen --forward-to localhost:3000/api/webhook`.

## 5. Test with a real (test-mode) card

Use `4242 4242 4242 4242`, any future expiry, any CVC. A successful test
payment should appear on the board within a few seconds (the frontend polls
briefly after returning from Checkout).

## 6. Go live

Switch Stripe out of test mode, swap `STRIPE_SECRET_KEY` for your live secret
key (`sk_live_...`), and repeat step 4 for a live-mode webhook endpoint with
its own `STRIPE_WEBHOOK_SECRET`. Stripe takes its standard processing fee
(around 2.9% + 30¢ in the US) out of each charge — there's no extra fee added
by this code.

## Notes

- Bids are only written to Redis by the webhook, after Stripe confirms
  payment — never directly from the browser. This is what stops someone
  from calling the API and adding a bid for free.
- `api/bids.js` is public and read-only; it just returns the current board.
- If you'd rather use a different database, only `api/webhook.js` and
  `api/bids.js` touch storage — swap the Redis calls for your database of
  choice and leave the Stripe logic untouched.
