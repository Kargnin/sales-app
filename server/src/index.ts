import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import authRouter from './routes/auth.routes.js';
import usersRouter from './routes/users.routes.js';
import shopsRouter from './routes/shops.routes.js';
import visitsRouter from './routes/visits.routes.js';
import ordersRouter from './routes/orders.routes.js';
import productsRouter from './routes/products.routes.js';
import { notificationsRouter } from './routes/notifications.routes.js';

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Global Middleware ───────────────────────────────
app.use(cors());
app.use(express.json());

// ─── Routes ──────────────────────────────────────────
app.use('/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/shops', shopsRouter);
app.use('/api/visits', visitsRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/products', productsRouter);
app.use('/api/notifications', notificationsRouter);

// ─── Health Check ────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '0.1.0',
  });
});

// ─── Global Error Handler ────────────────────────────
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
  },
);

// ─── Start Server ────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/api/health`);
});

export { app };
