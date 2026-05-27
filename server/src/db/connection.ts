import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import 'dotenv/config';
import * as schema from './schema.js';
import { config } from '../config.js';

const pool = mysql.createPool({
  host: config.DB_HOST,
  port: config.DB_PORT,
  user: config.DB_USER,
  password: config.DB_PASSWORD,
  database: config.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 20,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
});

// Pool event monitoring
pool.on('connection', () => {
  console.log(JSON.stringify({
    level: 'debug',
    message: 'New database connection established',
    timestamp: new Date().toISOString(),
  }));
});

pool.on('acquire', () => {
  console.log(JSON.stringify({
    level: 'debug',
    message: 'Connection acquired from pool',
    timestamp: new Date().toISOString(),
  }));
});

pool.on('release', () => {
  console.log(JSON.stringify({
    level: 'debug',
    message: 'Connection released back to pool',
    timestamp: new Date().toISOString(),
  }));
});

pool.on('enqueue', () => {
  console.log(JSON.stringify({
    level: 'warn',
    message: 'Waiting for available connection slot - pool queueing',
    timestamp: new Date().toISOString(),
  }));
});

export const db = drizzle(pool, { schema, mode: 'default' });
