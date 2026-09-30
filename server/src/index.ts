import http from 'node:http';
import { config } from './config.js';
import { createApp } from './app.js';
import { migrate } from './db/migrate.js';
import { pool } from './db/pool.js';
import { initRealtime } from './realtime.js';

async function main() {
  const applied = await migrate();
  if (applied.length) console.log(`Migrations applied: ${applied.join(', ')}`);
  const server = http.createServer(createApp());
  initRealtime(server);
  server.listen(config.port, () => console.log(`Lumi API listening on :${config.port} (${config.env})`));

  const shutdown = () => {
    server.close(() => pool.end().finally(() => process.exit(0)));
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
