import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).end();
  }
  try {
    const bids = (await redis.get('bids')) || [];
    res.setHeader('Cache-Control', 's-maxage=2, stale-while-revalidate=8');
    return res.status(200).json({ bids });
  } catch (err) {
    console.error('bids error:', err);
    return res.status(500).json({ error: 'Could not load bids' });
  }
}
