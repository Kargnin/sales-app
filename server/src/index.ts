import { app } from './app.js';
import { config } from './config.js';

// ─── Start Server ────────────────────────────────────
// NOTE: the HTTP listener lives ONLY in this entry file, never in app.ts.
// Importing app.ts (e.g. from tests) must not bind a port.
app.listen(config.PORT, () => {
  console.log(
    JSON.stringify({
      level: 'info',
      message: `Server running on http://localhost:${config.PORT}`,
      health: `http://localhost:${config.PORT}/api/health`,
      timestamp: new Date().toISOString(),
    }),
  );
});
