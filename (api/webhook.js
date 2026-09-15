import Stripe from 'stripe';
import { Redis } from '@upstash/redis';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export const config = { api: { bodyParser: false } };

function buffer(readable) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    readable.on('data', (chunk) => chunks.push(chunk));
    readable.on('end', () => resolve(Buffer.concat(chunks)));
    readable.on('error', reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).end();
  }

  const sig = req.headers['stripe-signature'];
  const buf = await buffer(req);

  let event;
  try {
    event = stripe.webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    const name = session.metadata && session.metadata.bid_name;
    const url = session.metadata && session.metadata.bid_url;
    const amount = session.metadata && Number(session.metadata.bid_amount);

    if (name && url && Number.isFinite(amount)) {
      const bid = {
        id: session.id,
        name,
        url,
        amount,
        ts: Date.now(),
      };

      const bids = (await redis.get('bids')) || [];
      bids.push(bid);
      await redis.set('bids', bids);
    } else {
      console.error('checkout.session.completed missing expected metadata', session.id);
    }
  }

  res.status(200).json({ received: true });
}
