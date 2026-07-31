import { createConnection } from 'mysql2/promise';
import { describe } from 'vitest';
import { config } from '../../config.js';

/**
 * Probes for a reachable MySQL database at module load.
 *
 * Integration tests are wrapped in `describeIfDb` so the suite still passes
 * (with a clear skip message) when no database server is running. The warning
 * tells the user exactly how to start MySQL and re-run. CI always starts a
 * MySQL service container, so nothing is skipped there — this only affects
 * local dev machines without a DB up.
 */
async function probeDb(): Promise<boolean> {
  let conn;
  try {
    conn = await createConnection({
      host: config.DB_HOST,
      port: config.DB_PORT,
      user: config.DB_USER,
      password: config.DB_PASSWORD,
      database: config.DB_NAME,
      connectTimeout: 1500,
    });
    await conn.query('SELECT 1');
    return true;
  } catch {
    return false;
  } finally {
    await conn?.end().catch(() => undefined);
  }
}

export const dbAvailable = await probeDb();

if (!dbAvailable) {
  console.warn(
    `\n⚠️  MySQL server is NOT running (tried ${config.DB_HOST}:${config.DB_PORT}).\n` +
      `    DB integration test suites were SKIPPED.\n` +
      `    Start the project's MySQL container and re-run:\n` +
      `      docker start mysql-local\n` +
      '    then re-run: npm run test:server\n',
  );
}

export const describeIfDb: ReturnType<typeof describe.skipIf> =
  describe.skipIf(!dbAvailable);
