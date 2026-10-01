import fs from 'node:fs';
import path from 'node:path';
import request from 'supertest';
import sharp from 'sharp';
import { config } from './config.js';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { query } from './db/pool.js';
import { createApp } from './app.js';
import { app, closeDb, makeUser, PNG, resetDb } from './test-utils.js';

beforeEach(resetDb);
afterAll(closeDb);

describe('auth', () => {
  it('registers, logs in, refreshes and logs out', async () => {
    const reg = await request(app).post('/auth/register').send({
      email: 'Ana@Example.com', password: 'password123', name: 'Ana', birthdate: '1998-01-01',
      gender: 'woman', interestedIn: ['man'], locale: 'es',
    });
    expect(reg.status).toBe(201);
    expect(reg.body.user.email).toBe('ana@example.com');
    expect(reg.body.user.locale).toBe('es');
    expect(reg.body.user.plan).toBe('free');

    const dup = await request(app).post('/auth/register').send({
      email: 'ana@example.com', password: 'password123', name: 'Ana', birthdate: '1998-01-01', gender: 'woman', interestedIn: ['man'],
    });
    expect(dup.status).toBe(409);
    expect(dup.body.error).toBe('email_taken');

    const bad = await request(app).post('/auth/login').send({ email: 'ana@example.com', password: 'wrongpass' });
    expect(bad.status).toBe(401);
    const login = await request(app).post('/auth/login').send({ email: 'ANA@example.com', password: 'password123' });
    expect(login.status).toBe(200);

    const refreshed = await request(app).post('/auth/refresh').send({ refreshToken: login.body.refreshToken });
    expect(refreshed.status).toBe(200);
    // Old refresh token is single-use.
    const reuse = await request(app).post('/auth/refresh').send({ refreshToken: login.body.refreshToken });
    expect(reuse.status).toBe(401);

    await request(app).post('/auth/logout').send({ refreshToken: refreshed.body.refreshToken }).expect(204);
    await request(app).post('/auth/refresh').send({ refreshToken: refreshed.body.refreshToken }).expect(401);
  });

  it('rejects minors and invalid input', async () => {
    const minor = await request(app).post('/auth/register').send({
      email: 'kid@example.com', password: 'password123', name: 'Kid', birthdate: `${new Date().getFullYear() - 15}-01-01`,
      gender: 'man', interestedIn: ['woman'],
    });
    expect(minor.body.error).toBe('underage');
    const invalid = await request(app).post('/auth/register').send({ email: 'x' });
    expect(invalid.status).toBe(400);
    expect(invalid.body.error).toBe('validation_error');
  });

  it('protects routes', async () => {
    await request(app).get('/favicon.ico').expect(404);
    await request(app).get('/discover').expect(401);
    await request(app).get('/me').expect(401);
    await request(app).get('/me').set('Authorization', 'Bearer nope').expect(401);
  });
});

describe('profile', () => {
  it('updates profile, settings and photos', async () => {
    const u = await makeUser({ photo: false });
    const patch = await request(app).patch('/me').set(u.auth).send({
      bio: 'Hola', jobTitle: 'Designer', interests: ['travel', 'travel', 'music'], heightCm: 170, lookingFor: 'long_term',
    });
    expect(patch.status).toBe(200);
    expect(patch.body.interests).toEqual(['travel', 'music']);
    expect(patch.body.lookingFor).toBe('long_term');

    const prompts = await request(app).patch('/me').set(u.auth).send({
      prompts: [{ id: 'ideal_sunday', answer: ' Coffee, a long walk and a good book ' }, { id: 'green_flag', answer: 'Kind to waiters' }],
    });
    expect(prompts.body.prompts).toEqual([
      { id: 'ideal_sunday', answer: 'Coffee, a long walk and a good book' }, { id: 'green_flag', answer: 'Kind to waiters' },
    ]);
    await request(app).patch('/me').set(u.auth).send({ prompts: [{ id: 'nope', answer: 'x' }] }).expect(400);
    await request(app).patch('/me').set(u.auth).send({ prompts: [{ id: 'green_flag', answer: 'a' }, { id: 'green_flag', answer: 'b' }] }).expect(400);
    const four = ['ideal_sunday', 'green_flag', 'two_truths', 'best_trip'].map((id) => ({ id, answer: 'x' }));
    await request(app).patch('/me').set(u.auth).send({ prompts: four }).expect(400);

    const settings = await request(app).patch('/me/settings').set(u.auth).send({ ageMin: 25, ageMax: 35, maxDistanceKm: 20 });
    expect(settings.body.settings).toMatchObject({ ageMin: 25, ageMax: 35, maxDistanceKm: 20 });
    await request(app).patch('/me/settings').set(u.auth).send({ ageMin: 40, ageMax: 30 }).expect(400);
    const hide = await request(app).patch('/me/settings').set(u.auth).send({ hideAge: true });
    expect(hide.body.error).toBe('premium_required');

    const fake = await request(app).post('/me/photos').set(u.auth)
      .attach('photo', Buffer.from('not an image at all'), { filename: 'a.png', contentType: 'image/png' });
    expect(fake.status).toBe(400);

    const p1 = await request(app).post('/me/photos').set(u.auth).attach('photo', PNG, { filename: 'a.png', contentType: 'image/png' });
    const p2 = await request(app).post('/me/photos').set(u.auth).attach('photo', PNG, { filename: 'b.png', contentType: 'image/png' });
    expect(p1.status).toBe(201);
    const served = await request(app).get(new URL(p1.body.url).pathname);
    expect(served.status).toBe(200);

    const order = await request(app).put('/me/photos/order').set(u.auth).send({ ids: [p2.body.id, p1.body.id] });
    expect(order.body.photos.map((p: any) => p.id)).toEqual([p2.body.id, p1.body.id]);
    const del = await request(app).delete(`/me/photos/${p2.body.id}`).set(u.auth);
    expect(del.body.photos.map((p: any) => p.id)).toEqual([p1.body.id]);
  });
});

describe('discovery, matching and chat', () => {
  it('matches mutual likes and exchanges messages', async () => {
    const ana = await makeUser({ gender: 'woman', interestedIn: ['man'] });
    const ben = await makeUser({ gender: 'man', interestedIn: ['woman'] });
    const carl = await makeUser({ gender: 'man', interestedIn: ['man'] }); // not compatible with ana
    const far = await makeUser({ gender: 'man', interestedIn: ['woman'], lat: 48.8566, lng: 2.3522 }); // Paris

    const deck = await request(app).get('/discover').set(ana.auth);
    const ids = deck.body.profiles.map((p: any) => p.id);
    expect(ids).toContain(ben.id);
    expect(ids).not.toContain(carl.id);
    expect(ids).not.toContain(far.id);
    expect(deck.body.profiles[0].distanceKm).toBe(1);
    expect(deck.body.profiles[0]).not.toHaveProperty('email');

    const first = await request(app).post('/swipes').set(ana.auth).send({ targetId: ben.id, action: 'like' });
    expect(first.body.matched).toBe(false);
    await request(app).post('/swipes').set(ana.auth).send({ targetId: ben.id, action: 'like' }).expect(409);
    const deck2 = await request(app).get('/discover').set(ana.auth);
    expect(deck2.body.profiles.map((p: any) => p.id)).not.toContain(ben.id);

    // Ben (free) sees that someone liked him, but not who.
    const likes = await request(app).get('/likes/received').set(ben.auth);
    expect(likes.body).toMatchObject({ locked: true, count: 1, profiles: [] });

    const second = await request(app).post('/swipes').set(ben.auth).send({ targetId: ana.id, action: 'superlike' });
    expect(second.body.matched).toBe(true);
    const matchId = second.body.match.id;
    expect(second.body.match.user.id).toBe(ana.id);

    const anaMatches = await request(app).get('/matches').set(ana.auth);
    expect(anaMatches.body.matches).toHaveLength(1);

    await request(app).post(`/matches/${matchId}/messages`).set(ana.auth).send({ body: 'Hola Ben!' }).expect(201);
    await request(app).post(`/matches/${matchId}/messages`).set(carl.auth).send({ body: 'intruder' }).expect(404);
    const benMatches = await request(app).get('/matches').set(ben.auth);
    expect(benMatches.body.matches[0]).toMatchObject({ unread: 1, lastMessage: { body: 'Hola Ben!' } });
    await request(app).post(`/matches/${matchId}/read`).set(ben.auth).expect(204);
    const after = await request(app).get('/matches').set(ben.auth);
    expect(after.body.matches[0].unread).toBe(0);
    const history = await request(app).get(`/matches/${matchId}/messages`).set(ben.auth);
    expect(history.body.messages).toHaveLength(1);
    expect(history.body.messages[0].readAt).not.toBeNull();

    await request(app).delete(`/matches/${matchId}`).set(ben.auth).expect(204);
    expect((await request(app).get('/matches').set(ana.auth)).body.matches).toHaveLength(0);
    await request(app).post(`/matches/${matchId}/messages`).set(ana.auth).send({ body: 'hey' }).expect(404);
  });

  it('enforces daily like and super like limits for free users', async () => {
    const me = await makeUser();
    const others = await Promise.all([1, 2, 3].map(() => makeUser()));
    // Use up the 50 daily likes on filler users.
    await query(
      `WITH n AS (
         INSERT INTO users (email, password_hash, name, birthdate, gender)
         SELECT 'filler' || g || '@x.com', '', 'F', '1990-01-01', 'man' FROM generate_series(1, 50) g RETURNING id)
       INSERT INTO swipes (swiper_id, target_id, action) SELECT $1, id, 'like' FROM n`,
      [me.id],
    );
    const out = await request(app).post('/swipes').set(me.auth).send({ targetId: others[0].id, action: 'like' });
    expect(out.status).toBe(403);
    expect(out.body.error).toBe('out_of_likes');
    await request(app).post('/swipes').set(me.auth).send({ targetId: others[0].id, action: 'pass' }).expect(200);

    await request(app).post('/swipes').set(me.auth).send({ targetId: others[1].id, action: 'superlike' }).expect(200);
    const noSuper = await request(app).post('/swipes').set(me.auth).send({ targetId: others[2].id, action: 'superlike' });
    expect(noSuper.body.error).toBe('out_of_superlikes');

    // Buying a super like pack unlocks more.
    await request(app).post('/billing/dev-activate').set(me.auth).send({ product: 'superlike_pack' }).expect(200);
    await request(app).post('/swipes').set(me.auth).send({ targetId: others[2].id, action: 'superlike' }).expect(200);
    const profile = await request(app).get('/me').set(me.auth);
    expect(profile.body.limits.superLikesRemaining).toBe(14);
  });

  it('blocking and reporting hide users from each other', async () => {
    const a = await makeUser();
    const b = await makeUser();
    const c = await makeUser();
    await request(app).post(`/users/${b.id}/block`).set(a.auth).expect(204);
    expect((await request(app).get('/discover').set(a.auth)).body.profiles.map((p: any) => p.id)).not.toContain(b.id);
    expect((await request(app).get('/discover').set(b.auth)).body.profiles.map((p: any) => p.id)).not.toContain(a.id);
    await request(app).get(`/users/${a.id}`).set(b.auth).expect(404);

    await request(app).post(`/users/${c.id}/report`).set(a.auth).send({ reason: 'spam' }).expect(201);
    expect((await request(app).get('/discover').set(a.auth)).body.profiles).toHaveLength(0);
  });
});

describe('premium', () => {
  it('gates features by plan and grants them after purchase', async () => {
    const me = await makeUser();
    const fan = await makeUser();
    await request(app).post('/swipes').set(fan.auth).send({ targetId: me.id, action: 'like' });

    await request(app).post('/swipes/rewind').set(me.auth).expect(403);
    await request(app).post('/boost').set(me.auth).expect(403);
    await request(app).get('/likes/sent').set(me.auth).expect(403);

    const gold = await request(app).post('/billing/dev-activate').set(me.auth).send({ product: 'gold' });
    expect(gold.body.plan).toBe('gold');
    expect(gold.body.entitlements.seeWhoLikesYou).toBe(true);
    expect(gold.body.boost.credits).toBe(1);
    expect(gold.body.limits.likesRemaining).toBeNull();

    const likes = await request(app).get('/likes/received').set(me.auth);
    expect(likes.body.locked).toBe(false);
    expect(likes.body.profiles[0].id).toBe(fan.id);

    await request(app).post('/swipes').set(me.auth).send({ targetId: fan.id, action: 'pass' });
    const rewind = await request(app).post('/swipes/rewind').set(me.auth);
    expect(rewind.body.profile.id).toBe(fan.id);

    const boost = await request(app).post('/boost').set(me.auth);
    expect(boost.body.boost.activeUntil).not.toBeNull();
    expect((await request(app).post('/boost').set(me.auth)).body.error).toBe('boost_active');

    const note = await request(app).post('/swipes').set(me.auth).send({ targetId: fan.id, action: 'superlike', note: 'hi!' });
    expect(note.body.error).toBe('premium_required');

    // Expired plans fall back to free automatically.
    await query(`UPDATE users SET plan_expires_at = now() - interval '1 day' WHERE id = $1`, [me.id]);
    expect((await request(app).get('/me').set(me.auth)).body.plan).toBe('free');
  });

  it('boosted and incognito users are ranked/hidden correctly', async () => {
    const viewer = await makeUser();
    const normal = await makeUser();
    const boosted = await makeUser();
    const hidden = await makeUser();
    await request(app).post('/billing/dev-activate').set(boosted.auth).send({ product: 'boost_pack' });
    await request(app).post('/boost').set(boosted.auth).expect(200);
    await request(app).post('/billing/dev-activate').set(hidden.auth).send({ product: 'platinum' });
    await request(app).patch('/me/settings').set(hidden.auth).send({ incognito: true }).expect(200);

    const deck = (await request(app).get('/discover').set(viewer.auth)).body.profiles.map((p: any) => p.id);
    expect(deck[0]).toBe(boosted.id);
    expect(deck).toContain(normal.id);
    expect(deck).not.toContain(hidden.id);

    // Incognito users are visible to people they liked.
    await request(app).post('/swipes').set(hidden.auth).send({ targetId: viewer.id, action: 'superlike', note: 'Nice smile' }).expect(200);
    const deck2 = (await request(app).get('/discover').set(viewer.auth)).body.profiles;
    const h = deck2.find((p: any) => p.id === hidden.id);
    expect(h).toMatchObject({ superLikedYou: true, note: 'Nice smile' });
  });

  it('lists plans and falls back to dev checkout without Stripe', async () => {
    const plans = await request(app).get('/billing/plans');
    expect(plans.body.products.map((p: any) => p.id)).toEqual(['plus', 'gold', 'platinum', 'plus_yearly', 'gold_yearly', 'platinum_yearly', 'boost_pack', 'superlike_pack']);
    const me = await makeUser();
    const checkout = await request(app).post('/billing/checkout').set(me.auth).send({ product: 'plus' });
    expect(checkout.body).toEqual({ url: null, devMode: true });
  });

  it('rejects unauthenticated RevenueCat webhooks', async () => {
    await request(app).post('/billing/webhook/revenuecat').send({ event: {} }).expect(401);
  });
});

describe('membership benefits', () => {
  it('advanced filters, top picks, read receipts, message hearts and yearly plans', async () => {
    const me = await makeUser({ gender: 'woman', interestedIn: ['man'] });
    const verified = await makeUser({ gender: 'man', interestedIn: ['woman'] });
    const plain = await makeUser({ gender: 'man', interestedIn: ['woman'] });
    await query('UPDATE users SET is_verified = true, interests = $2 WHERE id = $1', [verified.id, ['wine', 'surf']]);
    await query('UPDATE users SET interests = $2 WHERE id = $1', [me.id, ['wine', 'surf']]);

    // Free: filters and top picks are gated
    expect((await request(app).patch('/me/settings').set(me.auth).send({ filterVerified: true })).body.error).toBe('premium_required');
    await request(app).get('/top-picks').set(me.auth).expect(403);

    // Yearly Plus unlocks filters for 12 months
    const plus = await request(app).post('/billing/dev-activate').set(me.auth).send({ product: 'plus_yearly' });
    expect(plus.body.plan).toBe('plus');
    expect(new Date(plus.body.planExpiresAt).getTime()).toBeGreaterThan(Date.now() + 300 * 24 * 3600 * 1000);
    const f = await request(app).patch('/me/settings').set(me.auth).send({ filterVerified: true, filterLookingFor: ['long_term', 'long_term'] });
    expect(f.body.settings).toMatchObject({ filterVerified: true, filterLookingFor: ['long_term'] });
    await request(app).patch('/me/settings').set(me.auth).send({ filterLookingFor: [] });
    const deck = (await request(app).get('/discover').set(me.auth)).body.profiles.map((p: any) => p.id);
    expect(deck).toEqual([verified.id]);
    await request(app).get('/top-picks').set(me.auth).expect(403);

    // Gold: top picks ranked by compatibility
    await request(app).patch('/me/settings').set(me.auth).send({ filterVerified: false });
    await request(app).post('/billing/dev-activate').set(me.auth).send({ product: 'gold' });
    const picks = await request(app).get('/top-picks').set(me.auth);
    expect(picks.body.profiles.map((p: any) => p.id)).toEqual([verified.id, plain.id]);

    // Read receipts: visible to Gold sender, hidden from free sender
    await request(app).post('/swipes').set(me.auth).send({ targetId: plain.id, action: 'like' });
    const m = await request(app).post('/swipes').set(plain.auth).send({ targetId: me.id, action: 'like' });
    const matchId = m.body.match.id;
    const mine = await request(app).post(`/matches/${matchId}/messages`).set(me.auth).send({ body: 'hi' });
    const theirs = await request(app).post(`/matches/${matchId}/messages`).set(plain.auth).send({ body: 'hey' });
    await request(app).post(`/matches/${matchId}/read`).set(plain.auth).expect(204);
    await request(app).post(`/matches/${matchId}/read`).set(me.auth).expect(204);
    const forMe = await request(app).get(`/matches/${matchId}/messages`).set(me.auth);
    expect(forMe.body.messages.find((x: any) => x.id === mine.body.id).readAt).not.toBeNull();
    const forPlain = await request(app).get(`/matches/${matchId}/messages`).set(plain.auth);
    expect(forPlain.body.messages.find((x: any) => x.id === theirs.body.id).readAt).toBeNull();

    // Hearts: only on messages you received, toggles
    const liked = await request(app).post(`/matches/${matchId}/messages/${theirs.body.id}/like`).set(me.auth);
    expect(liked.body.likedAt).not.toBeNull();
    await request(app).post(`/matches/${matchId}/messages/${mine.body.id}/like`).set(me.auth).expect(404);
    const unliked = await request(app).post(`/matches/${matchId}/messages/${theirs.body.id}/like`).set(me.auth);
    expect(unliked.body.likedAt).toBeNull();
  });
});

describe('verification and moderation', () => {
  const ADMIN = { Authorization: 'Bearer test-admin-token-0123456789abcdef' };

  it('selfie verification goes through moderator review', async () => {
    const u = await makeUser();
    const v = await request(app).get('/me/verification').set(u.auth);
    expect(v.body).toMatchObject({ verified: false, status: 'none' });
    expect(['peace_sign', 'thumbs_up', 'touch_nose', 'hand_on_cheek', 'wave']).toContain(v.body.pose);

    await request(app).get('/admin/api/verifications').expect(401);
    await request(app).get('/admin/api/verifications').set({ Authorization: 'Bearer wrong-token-wrong-token-wrong!!' }).expect(401);

    const sent = await request(app).post('/me/verification').set(u.auth).attach('photo', PNG, { filename: 's.png', contentType: 'image/png' });
    expect(sent.status).toBe(201);
    const again = await request(app).post('/me/verification').set(u.auth).attach('photo', PNG, { filename: 's.png', contentType: 'image/png' });
    expect(again.body.error).toBe('verification_pending');
    expect((await request(app).get('/me/verification').set(u.auth)).body.status).toBe('pending');

    const queue = await request(app).get('/admin/api/verifications').set(ADMIN);
    expect(queue.body.items).toHaveLength(1);
    const item = queue.body.items[0];
    const selfie = await request(app).get(`/admin/api/verifications/${item.id}/selfie`).set(ADMIN);
    expect(selfie.status).toBe(200);
    // never reachable through the public uploads path
    expect(fs.readdirSync(config.uploadDir)).not.toContain(path.basename(item.photo_file ?? ''));

    await request(app).post(`/admin/api/verifications/${item.id}`).set(ADMIN).send({ decision: 'approve' }).expect(200);
    const me = await request(app).get('/me').set(u.auth);
    expect(me.body.isVerified).toBe(true);
    expect((await request(app).get('/me/verification').set(u.auth)).body.status).toBe('approved');
  });

  it('reports can be dismissed or end in a ban', async () => {
    const a = await makeUser();
    const b = await makeUser();
    await request(app).post(`/users/${b.id}/report`).set(a.auth).send({ reason: 'harassment', details: 'rude' }).expect(201);
    const stats = await request(app).get('/admin/api/stats').set(ADMIN);
    expect(stats.body.open_reports).toBe(1);
    const reports = await request(app).get('/admin/api/reports').set(ADMIN);
    expect(reports.body.items[0]).toMatchObject({ reported_id: b.id, reason: 'harassment' });
    await request(app).post(`/admin/api/reports/${reports.body.items[0].id}`).set(ADMIN).send({ action: 'ban' }).expect(200);
    const blocked = await request(app).get('/me').set(b.auth);
    expect(blocked.body.error).toBe('account_banned');
    await request(app).post('/auth/refresh').send({ refreshToken: b.refreshToken }).expect(401);
  });
});

describe('account deletion', () => {
  it('deletes the account and frees the email', async () => {
    const u = await makeUser();
    const email = (await request(app).get('/me').set(u.auth)).body.email;
    await request(app).delete('/me').set(u.auth).expect(204);
    await request(app).get('/me').set(u.auth).expect(401);
    await request(app).post('/auth/refresh').send({ refreshToken: u.refreshToken }).expect(401);
    const again = await request(app).post('/auth/register').send({
      email, password: 'password123', name: 'New', birthdate: '1990-01-01', gender: 'man', interestedIn: ['woman'],
    });
    expect(again.status).toBe(201);
  });
});

describe('web app served from the API origin', () => {
  const dir = fs.mkdtempSync(path.join(config.uploadDir, '..', 'web-test-'));
  fs.writeFileSync(path.join(dir, 'index.html'), '<div id="root"></div>');
  const web = createApp({ webDir: dir });
  afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

  it('gives browser navigations the app shell and keeps the JSON API intact', async () => {
    const page = await request(web).get('/likes').set('Accept', 'text/html,application/xhtml+xml').expect(200);
    expect(page.text).toContain('id="root"');
    expect(page.headers['cache-control']).toBe('no-cache');
    await request(web).get('/likes/received').set('Accept', '*/*').expect(401);
    await request(web).get('/likes').set('Accept', 'application/json').expect(401);
    const csp = page.headers['content-security-policy'];
    expect(csp).toContain("img-src 'self' data: blob: https:");
    expect(csp).toContain("connect-src 'self' blob: ws: wss:");
  });
});

describe('integrity, privacy and safety', () => {
  beforeEach(resetDb);

  it('creates exactly one match when two people like each other at the same instant', async () => {
    for (let i = 0; i < 6; i++) {
      const a = await makeUser({ gender: 'woman', interestedIn: ['man'] });
      const b = await makeUser({ gender: 'man', interestedIn: ['woman'] });
      const [ra, rb] = await Promise.all([
        request(app).post('/swipes').set(a.auth).send({ targetId: b.id, action: 'like' }),
        request(app).post('/swipes').set(b.auth).send({ targetId: a.id, action: 'like' }),
      ]);
      expect([ra.body.matched, rb.body.matched].filter(Boolean)).toHaveLength(1);
      const rows = await query('SELECT count(*)::int AS n FROM matches WHERE user_a = ANY($1::uuid[]) AND user_b = ANY($1::uuid[])', [[a.id, b.id]]);
      expect(rows.rows[0].n).toBe(1);
    }
  });

  it('does not duplicate a message when the app retries with the same client id', async () => {
    const a = await makeUser({ gender: 'woman', interestedIn: ['man'] });
    const b = await makeUser({ gender: 'man', interestedIn: ['woman'] });
    await request(app).post('/swipes').set(a.auth).send({ targetId: b.id, action: 'like' });
    const m = await request(app).post('/swipes').set(b.auth).send({ targetId: a.id, action: 'like' });
    const matchId = m.body.match.id;
    const send = () => request(app).post(`/matches/${matchId}/messages`).set(a.auth).send({ body: 'Hola', clientId: 'c_0123456789abcdef' });
    const [first, retry] = await Promise.all([send(), send()]);
    expect([first.status, retry.status].sort()).toEqual([200, 201]);
    expect(first.body.id).toBe(retry.body.id);
    const list = await request(app).get(`/matches/${matchId}/messages`).set(b.auth);
    expect(list.body.messages).toHaveLength(1);
    // Someone else's conversation is never reachable by id.
    const outsider = await makeUser();
    await request(app).get(`/matches/${matchId}/messages`).set(outsider.auth).expect(404);
    await request(app).post(`/matches/${matchId}/messages`).set(outsider.auth).send({ body: 'hi' }).expect(404);
  });

  it('re-encodes photos without metadata and adds a thumbnail', async () => {
    const u = await makeUser({ photo: false });
    const withGps = await sharp({ create: { width: 900, height: 1200, channels: 3, background: '#334455' } })
      .jpeg().withExif({ IFD0: { Copyright: 'secret-location-marker' } }).toBuffer();
    expect(withGps.includes('secret-location-marker')).toBe(true);
    const up = await request(app).post('/me/photos').set(u.auth).attach('photo', withGps, { filename: 'p.jpg', contentType: 'image/jpeg' });
    expect(up.status).toBe(201);
    expect(up.body.thumb).toMatch(/-t\.jpg$/);
    const stored = fs.readFileSync(path.join(config.uploadDir, path.basename(up.body.url)));
    expect(stored.includes('secret-location-marker')).toBe(false);
    const meta = await sharp(stored).metadata();
    expect(meta.exif).toBeUndefined();
    const tiny = await sharp({ create: { width: 50, height: 50, channels: 3, background: '#000' } }).png().toBuffer();
    const small = await request(app).post('/me/photos').set(u.auth).attach('photo', tiny, { filename: 't.png', contentType: 'image/png' });
    expect(small.body.error).toBe('image_too_small');
  });

  it('keeps incognito and paused members out of reach', async () => {
    const hidden = await makeUser({ gender: 'woman', interestedIn: ['man'] });
    const stranger = await makeUser({ gender: 'man', interestedIn: ['woman'] });
    await request(app).get(`/users/${hidden.id}`).set(stranger.auth).expect(200);
    await request(app).post('/billing/dev-activate').set(hidden.auth).send({ product: 'platinum' }).expect(200);
    await request(app).patch('/me/settings').set(hidden.auth).send({ incognito: true }).expect(200);
    await request(app).get(`/users/${hidden.id}`).set(stranger.auth).expect(404);
    // Once she likes him, he may see her.
    await request(app).post('/swipes').set(hidden.auth).send({ targetId: stranger.id, action: 'like' });
    await request(app).get(`/users/${hidden.id}`).set(stranger.auth).expect(200);

    const paused = await makeUser({ gender: 'woman', interestedIn: ['man'] });
    await request(app).patch('/me/settings').set(paused.auth).send({ discoverable: false }).expect(200);
    const deck = await request(app).get('/discover').set(stranger.auth);
    expect(deck.body.profiles.map((p: { id: string }) => p.id)).not.toContain(paused.id);
  });

  it('hides activity status when the member turns it off', async () => {
    const a = await makeUser();
    const b = await makeUser();
    expect((await request(app).get(`/users/${a.id}`).set(b.auth)).body.recentlyActive).toBe(true);
    await request(app).patch('/me/settings').set(a.auth).send({ showActivity: false }).expect(200);
    expect((await request(app).get(`/users/${a.id}`).set(b.auth)).body.recentlyActive).toBe(false);
  });

  it('accepts the specific report reasons and records moderator decisions', async () => {
    const a = await makeUser();
    const b = await makeUser();
    await request(app).post(`/users/${b.id}/report`).set(a.auth).send({ reason: 'scam', details: 'asked for money' }).expect(201);
    await request(app).post(`/users/${b.id}/report`).set(a.auth).send({ reason: 'made_up' }).expect(400);
    const ADMIN = { Authorization: 'Bearer test-admin-token-0123456789abcdef' };
    // The admin token is never accepted from the query string.
    await request(app).get('/admin/api/reports?token=test-admin-token-0123456789abcdef').expect(401);
    const reports = await request(app).get('/admin/api/reports').set(ADMIN);
    await request(app).post(`/admin/api/reports/${reports.body.items[0].id}`).set(ADMIN).send({ action: 'ban' }).expect(200);
    const log = await request(app).get('/admin/api/actions').set(ADMIN);
    expect(log.body.items[0]).toMatchObject({ action: 'ban', target_user_id: b.id });
    await request(app).post(`/admin/api/users/${b.id}/unban`).set(ADMIN).expect(200);
    expect((await request(app).get('/admin/api/actions').set(ADMIN)).body.items[0].action).toBe('unban');
  });

  it('removes sent messages and ends conversations when an account is deleted', async () => {
    const a = await makeUser({ gender: 'woman', interestedIn: ['man'] });
    const b = await makeUser({ gender: 'man', interestedIn: ['woman'] });
    await request(app).post('/swipes').set(a.auth).send({ targetId: b.id, action: 'like' });
    const m = await request(app).post('/swipes').set(b.auth).send({ targetId: a.id, action: 'like' });
    await request(app).post(`/matches/${m.body.match.id}/messages`).set(a.auth).send({ body: 'private words' }).expect(201);
    await request(app).delete('/me').set(a.auth).expect(204);
    expect((await query('SELECT count(*)::int AS n FROM messages WHERE sender_id = $1', [a.id])).rows[0].n).toBe(0);
    expect((await request(app).get('/matches').set(b.auth)).body.matches).toHaveLength(0);
    await request(app).get(`/users/${a.id}`).set(b.auth).expect(404);
  });
});
