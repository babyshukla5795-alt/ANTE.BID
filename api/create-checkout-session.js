import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { name, url, amount } = req.body || {};

    if (!name || typeof name !== 'string' || !name.trim() || name.length > 60) {
      return res.status(400).json({ error: 'Invalid name' });
    }

    let parsedUrl;
    try {
      parsedUrl = new URL(url);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) throw new Error('bad protocol');
    } catch {
      return res.status(400).json({ error: 'Invalid url' });
    }

    const amt = Math.round(Number(amount));
    if (!Number.isFinite(amt) || amt < 5) {
      return res.status(400).json({ error: 'Bid must be at least $5' });
    }

    const origin = req.headers.origin || `https://${req.headers.host}`;
    const cleanName = name.trim().slice(0, 60);

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: { name: `Ante bid — ${cleanName}` },
            unit_amount: amt * 100,
          },
          quantity: 1,
        },
      ],
      metadata: {
        bid_name: cleanName,
        bid_url: url,
        bid_amount: String(amt),
      },
      success_url: `${origin}/?paid=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?canceled=1`,
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('create-checkout-session error:', err);
    return res.status(500).json({ error: 'Something went wrong creating checkout' });
  }
      }
