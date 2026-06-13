import express from 'express';
import { scrapeReviews } from './crawler.js';
import { reviewsToCsv } from './csv.js';

const app = express();
app.use(express.json({ limit: '1mb' }));

const AUTH_TOKEN = process.env.CRAWLER_AUTH_TOKEN ?? '';

function checkAuth(req, res) {
  if (!AUTH_TOKEN) return true; // auth disabled
  const token =
    req.headers['x-reviewboost-token'] ??
    req.headers['authorization']?.replace(/^Bearer\s+/i, '');
  if (token !== AUTH_TOKEN) {
    res.status(401).json({ error: '인증 실패' });
    return false;
  }
  return true;
}

// Health check
app.get('/health', (_req, res) => res.json({ ok: true }));

// POST /api/coupang/reviews/csv
// Body: { url: string, limit?: number }
app.post('/api/coupang/reviews/csv', async (req, res) => {
  if (!checkAuth(req, res)) return;

  const url = String(req.body?.url ?? '').trim();
  const limit = Math.min(Math.max(1, Number(req.body?.limit ?? 100)), 300);

  if (!url) {
    return res.status(400).json({ error: 'url 필드가 필요합니다.' });
  }

  console.log(`[${new Date().toISOString()}] scrape start url=${url} limit=${limit}`);

  try {
    const reviews = await scrapeReviews(url, limit);
    const csv = reviewsToCsv(reviews);
    const filename = `coupang-reviews-${Date.now()}.csv`;

    res.setHeader('content-type', 'text/csv; charset=utf-8');
    res.setHeader(
      'content-disposition',
      `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`
    );
    res.setHeader('cache-control', 'no-store');
    console.log(`[${new Date().toISOString()}] scrape done reviews=${reviews.length}`);
    res.send(Buffer.from(csv, 'utf-8'));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[${new Date().toISOString()}] scrape error: ${message}`);
    res.status(500).json({ error: message });
  }
});

const PORT = Number(process.env.PORT ?? 3010);
app.listen(PORT, () => console.log(`crawler listening on :${PORT}`));
