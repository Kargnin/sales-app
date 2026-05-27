import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config.js';
import { requestId } from './middleware/requestId.js';
import { requestLogger } from './middleware/requestLogger.js';
import authRouter from './routes/auth.routes.js';
import usersRouter from './routes/users.routes.js';
import shopsRouter from './routes/shops.routes.js';
import visitsRouter from './routes/visits.routes.js';
import ordersRouter from './routes/orders.routes.js';
import productsRouter from './routes/products.routes.js';
import { notificationsRouter } from './routes/notifications.routes.js';

const app = express();
const PORT = config.PORT;

// ─── Global Middleware ───────────────────────────────
app.use(helmet());
app.use(cors({
  origin: config.CORS_ORIGIN === '*' ? true : config.CORS_ORIGIN.split(',').map(s => s.trim()),
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));
app.use(requestId);
app.use(requestLogger);

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

// ─── 404 Handler ─────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ─── Global Error Handler ────────────────────────────
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error(JSON.stringify({
      level: 'error',
      message: err.message,
      stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
      timestamp: new Date().toISOString(),
    }));
    res.status(500).json({ error: 'Internal server error' });
  },
);

// ─── Start Server ────────────────────────────────────
app.listen(PORT, () => {
  console.log(JSON.stringify({
    level: 'info',
    message: `Server running on http://localhost:${PORT}`,
    health: `http://localhost:${PORT}/api/health`,
    timestamp: new Date().toISOString(),
  }));
});

export { app };
