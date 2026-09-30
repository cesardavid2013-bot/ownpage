import { one, query } from '../db/pool.js';
import { effectivePlan, entitlementsFor } from '../plans.js';

export interface UserRow {
  id: string;
  email: string;
  name: string;
  birthdate: string;
  gender: string;
  interested_in: string[];
  bio: string;
  job_title: string;
  company: string;
  school: string;
  city: string;
  height_cm: number | null;
  looking_for: string;
  interests: string[];
  languages: string[];
  prompts: { id: string; answer: string }[];
  locale: string;
  lat: number | null;
  lng: number | null;
  passport_lat: number | null;
  passport_lng: number | null;
  max_distance_km: number;
  age_min: number;
  age_max: number;
  global_mode: boolean;
  hide_age: boolean;
  hide_distance: boolean;
  incognito: boolean;
  is_verified: boolean;
  is_banned: boolean;
  plan: string;
  plan_expires_at: Date | null;
  plan_source: string | null;
  stripe_customer_id: string | null;
  boost_credits: number;
  boost_until: Date | null;
  superlike_credits: number;
  last_active_at: Date;
  created_at: Date;
}

export interface Photo {
  id: string;
  url: string;
  position: number;
}

export function ageFrom(birthdate: string | Date): number {
  const b = new Date(birthdate);
  const now = new Date();
  let age = now.getUTCFullYear() - b.getUTCFullYear();
  const m = now.getUTCMonth() - b.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < b.getUTCDate())) age--;
  return age;
}

export function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

export async function getUser(id: string): Promise<UserRow | null> {
  return one<UserRow>('SELECT * FROM users WHERE id = $1 AND deleted_at IS NULL', [id]);
}

export async function photosFor(userIds: string[]): Promise<Map<string, Photo[]>> {
  const map = new Map<string, Photo[]>();
  if (!userIds.length) return map;
  const res = await query<Photo & { user_id: string }>(
    'SELECT id, user_id, url, position FROM photos WHERE user_id = ANY($1::uuid[]) ORDER BY position, created_at',
    [userIds],
  );
  for (const p of res.rows) {
    const list = map.get(p.user_id) ?? [];
    list.push({ id: p.id, url: p.url, position: p.position });
    map.set(p.user_id, list);
  }
  return map;
}

/** The coordinates a viewer is "at": passport location for premium users, otherwise real location. */
export function viewerLocation(u: UserRow): { lat: number; lng: number } | null {
  if (entitlementsFor(u).passport && u.passport_lat != null && u.passport_lng != null) {
    return { lat: u.passport_lat, lng: u.passport_lng };
  }
  if (u.lat != null && u.lng != null) return { lat: u.lat, lng: u.lng };
  return null;
}

/** Profile as seen by other users. Never includes email, exact location or billing data. */
export function publicProfile(u: UserRow, photos: Photo[], viewer?: UserRow | null) {
  const ent = entitlementsFor(u);
  const hideAge = ent.hideAgeDistance && u.hide_age;
  const hideDistance = ent.hideAgeDistance && u.hide_distance;
  let distance: number | null = null;
  const from = viewer ? viewerLocation(viewer) : null;
  if (!hideDistance && from && u.lat != null && u.lng != null) {
    distance = Math.max(1, Math.round(distanceKm(from.lat, from.lng, u.lat, u.lng)));
  }
  return {
    id: u.id,
    name: u.name,
    age: hideAge ? null : ageFrom(u.birthdate),
    gender: u.gender,
    bio: u.bio,
    jobTitle: u.job_title,
    company: u.company,
    school: u.school,
    city: u.city,
    heightCm: u.height_cm,
    lookingFor: u.looking_for,
    interests: u.interests,
    languages: u.languages,
    prompts: u.prompts ?? [],
    isVerified: u.is_verified,
    distanceKm: distance,
    photos: photos.map((p) => ({ id: p.id, url: p.url })),
    recentlyActive: Date.now() - new Date(u.last_active_at).getTime() < 24 * 3600 * 1000,
  };
}

/** Full profile for the owner, including settings and entitlements. */
export async function privateProfile(u: UserRow) {
  const photos = (await photosFor([u.id])).get(u.id) ?? [];
  const plan = effectivePlan(u);
  const ent = entitlementsFor(u);
  const usage = await one<{ likes: number; superlikes: number }>(
    `SELECT count(*) FILTER (WHERE action = 'like') AS likes,
            count(*) FILTER (WHERE action = 'superlike') AS superlikes
     FROM swipes WHERE swiper_id = $1 AND created_at > now() - interval '24 hours'`,
    [u.id],
  );
  const likesUsed = usage?.likes ?? 0;
  const superUsed = usage?.superlikes ?? 0;
  return {
    ...publicProfile(u, photos),
    age: ageFrom(u.birthdate),
    email: u.email,
    birthdate: u.birthdate,
    interestedIn: u.interested_in,
    locale: u.locale,
    hasLocation: u.lat != null,
    passport: u.passport_lat != null ? { lat: u.passport_lat, lng: u.passport_lng } : null,
    settings: {
      maxDistanceKm: u.max_distance_km,
      ageMin: u.age_min,
      ageMax: u.age_max,
      globalMode: u.global_mode,
      hideAge: u.hide_age,
      hideDistance: u.hide_distance,
      incognito: u.incognito,
    },
    plan,
    planExpiresAt: plan === 'free' ? null : u.plan_expires_at,
    planSource: plan === 'free' ? null : u.plan_source,
    entitlements: ent,
    boost: {
      credits: u.boost_credits,
      activeUntil: u.boost_until && new Date(u.boost_until).getTime() > Date.now() ? u.boost_until : null,
    },
    limits: {
      likesRemaining: ent.dailyLikes == null ? null : Math.max(0, ent.dailyLikes - likesUsed),
      superLikesRemaining: Math.max(0, ent.dailySuperLikes - superUsed) + u.superlike_credits,
    },
  };
}

/** True if either user has blocked the other. */
export async function isBlockedBetween(a: string, b: string): Promise<boolean> {
  const row = await one(
    `SELECT 1 FROM blocks WHERE (blocker_id = $1 AND blocked_id = $2) OR (blocker_id = $2 AND blocked_id = $1)`,
    [a, b],
  );
  return !!row;
}
