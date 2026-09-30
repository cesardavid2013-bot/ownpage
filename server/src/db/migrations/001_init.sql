CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  birthdate DATE NOT NULL,
  gender TEXT NOT NULL CHECK (gender IN ('man','woman','nonbinary')),
  interested_in TEXT[] NOT NULL DEFAULT '{man,woman,nonbinary}',
  bio TEXT NOT NULL DEFAULT '',
  job_title TEXT NOT NULL DEFAULT '',
  company TEXT NOT NULL DEFAULT '',
  school TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  height_cm INT CHECK (height_cm IS NULL OR height_cm BETWEEN 100 AND 250),
  looking_for TEXT NOT NULL DEFAULT 'unsure'
    CHECK (looking_for IN ('long_term','short_term','friendship','casual','unsure')),
  interests TEXT[] NOT NULL DEFAULT '{}',
  languages TEXT[] NOT NULL DEFAULT '{}',
  locale TEXT NOT NULL DEFAULT 'en',
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  passport_lat DOUBLE PRECISION,
  passport_lng DOUBLE PRECISION,
  max_distance_km INT NOT NULL DEFAULT 50 CHECK (max_distance_km BETWEEN 1 AND 500),
  age_min INT NOT NULL DEFAULT 18 CHECK (age_min >= 18),
  age_max INT NOT NULL DEFAULT 99 CHECK (age_max <= 120),
  global_mode BOOLEAN NOT NULL DEFAULT false,
  hide_age BOOLEAN NOT NULL DEFAULT false,
  hide_distance BOOLEAN NOT NULL DEFAULT false,
  incognito BOOLEAN NOT NULL DEFAULT false,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  is_banned BOOLEAN NOT NULL DEFAULT false,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free','plus','gold','platinum')),
  plan_expires_at TIMESTAMPTZ,
  plan_source TEXT,
  stripe_customer_id TEXT,
  boost_credits INT NOT NULL DEFAULT 0,
  boost_until TIMESTAMPTZ,
  superlike_credits INT NOT NULL DEFAULT 0,
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
CREATE UNIQUE INDEX users_email_unique ON users (lower(email)) WHERE deleted_at IS NULL;
CREATE INDEX users_location_idx ON users (lat, lng);

CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX photos_user_idx ON photos (user_id, position);

CREATE TABLE swipes (
  swiper_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('like','pass','superlike')),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (swiper_id, target_id),
  CHECK (swiper_id <> target_id)
);
CREATE INDEX swipes_target_idx ON swipes (target_id, action);
CREATE INDEX swipes_swiper_time_idx ON swipes (swiper_id, created_at DESC);

CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_b UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_message_at TIMESTAMPTZ,
  unmatched_at TIMESTAMPTZ,
  CHECK (user_a < user_b),
  UNIQUE (user_a, user_b)
);
CREATE INDEX matches_a_idx ON matches (user_a);
CREATE INDEX matches_b_idx ON matches (user_b);

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (length(body) BETWEEN 1 AND 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at TIMESTAMPTZ
);
CREATE INDEX messages_match_idx ON messages (match_id, created_at DESC);

CREATE TABLE blocks (
  blocker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id)
);
CREATE INDEX blocks_blocked_idx ON blocks (blocked_id);

CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reported_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL CHECK (reason IN ('fake','inappropriate','harassment','spam','underage','other')),
  details TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','reviewed','actioned')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('stripe','revenuecat','dev')),
  provider_ref TEXT NOT NULL,
  product TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_ref)
);
