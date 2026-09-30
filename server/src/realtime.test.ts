import http from 'node:http';
import type { AddressInfo } from 'node:net';
import request from 'supertest';
import { io as connect, type Socket } from 'socket.io-client';
import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest';
import { closeRealtime, initRealtime } from './realtime.js';
import { app, closeDb, makeUser, resetDb } from './test-utils.js';

let server: http.Server;
let url: string;
const sockets: Socket[] = [];

beforeAll(async () => {
  server = http.createServer(app);
  initRealtime(server);
  await new Promise<void>((r) => server.listen(0, r));
  url = `http://localhost:${(server.address() as AddressInfo).port}`;
});
beforeEach(resetDb);
afterAll(async () => {
  sockets.forEach((s) => s.close());
  closeRealtime();
  await new Promise((r) => server.close(r));
  await closeDb();
});

function socketFor(token: string): Promise<Socket> {
  return new Promise((resolve, reject) => {
    const s = connect(url, { auth: { token }, transports: ['websocket'] });
    sockets.push(s);
    s.on('connect', () => resolve(s));
    s.on('connect_error', reject);
  });
}

const next = <T>(s: Socket, event: string) => new Promise<T>((r) => s.once(event, r));

it('rejects sockets without a valid token', async () => {
  await expect(socketFor('bad')).rejects.toThrow('unauthorized');
});

it('pushes matches, messages and typing in real time', async () => {
  const a = await makeUser();
  const b = await makeUser();
  const sa = await socketFor(a.token);
  const sb = await socketFor(b.token);

  const liked = next<{ superlike: boolean }>(sb, 'like:new');
  await request(app).post('/swipes').set(a.auth).send({ targetId: b.id, action: 'like' });
  expect(await liked).toEqual({ superlike: false });

  const matched = next<any>(sa, 'match:new');
  const res = await request(app).post('/swipes').set(b.auth).send({ targetId: a.id, action: 'like' });
  const match = await matched;
  expect(match.id).toBe(res.body.match.id);
  expect(match.user.id).toBe(b.id);

  const typing = next<any>(sa, 'typing');
  sb.emit('typing', { matchId: match.id });
  expect(await typing).toEqual({ matchId: match.id, userId: b.id });

  const msg = next<any>(sb, 'message:new');
  await request(app).post(`/matches/${match.id}/messages`).set(a.auth).send({ body: 'hey!' });
  expect((await msg).body).toBe('hey!');
});
