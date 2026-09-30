import pg from 'pg';
import { config } from '../config.js';

// Return BIGINT/COUNT as numbers and DATE as plain 'YYYY-MM-DD' strings.
pg.types.setTypeParser(20, (v) => Number(v));
pg.types.setTypeParser(1082, (v) => v);

export const pool = new pg.Pool({ connectionString: config.databaseUrl, max: 10 });

export async function query<T extends pg.QueryResultRow = any>(text: string, params: unknown[] = []) {
  return pool.query<T>(text, params);
}

export async function one<T extends pg.QueryResultRow = any>(text: string, params: unknown[] = []): Promise<T | null> {
  const res = await pool.query<T>(text, params);
  return res.rows[0] ?? null;
}

export async function tx<T>(fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
