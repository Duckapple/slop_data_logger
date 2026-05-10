import { Hono } from 'hono';
import type { Env } from './env';
import { errorResponse } from './errors';
import misspellings from './routes/misspellings';
import attachments, { uploads } from './routes/attachments';
import stats from './routes/stats';
import exportApp from './routes/export';
import auth from './routes/auth';
import invites from './routes/invites';

const app = new Hono<{ Bindings: Env }>();

app.get('/api/health', (c) => c.json({ ok: true }));

app.route('/api/auth', auth);
app.route('/api/invites', invites);
app.route('/api/misspellings', misspellings);
app.route('/api/attachments', attachments);
app.route('/api/stats', stats);
app.route('/api', exportApp);
app.route('/uploads', uploads);

app.onError((err, c) => {
  console.error('Worker error:', err);
  return errorResponse(c, 'Unexpected error', 'INTERNAL_ERROR', 500);
});

app.all('*', (c) => c.env.ASSETS.fetch(c.req.raw));

export default app;
