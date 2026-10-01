-- Idempotent sends: a retried POST with the same client id returns the original message.
ALTER TABLE messages ADD COLUMN client_id TEXT;
CREATE UNIQUE INDEX messages_client_id_unique ON messages (sender_id, client_id) WHERE client_id IS NOT NULL;
-- Unread counts scan only unread rows.
CREATE INDEX messages_unread_idx ON messages (match_id, sender_id) WHERE read_at IS NULL;

-- Privacy: pause discovery (existing matches and chat keep working) and hide activity status.
ALTER TABLE users ADD COLUMN discoverable BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE users ADD COLUMN show_activity BOOLEAN NOT NULL DEFAULT true;

-- Photos are re-encoded server-side (metadata stripped) with a small thumbnail for lists.
ALTER TABLE photos ADD COLUMN thumb_url TEXT;

-- Clearer report reasons.
ALTER TABLE reports DROP CONSTRAINT reports_reason_check;
ALTER TABLE reports ADD CONSTRAINT reports_reason_check CHECK (reason IN
  ('fake','impersonation','scam','harassment','threats','unwanted_sexual','inappropriate','spam','underage','other'));
CREATE INDEX reports_reported_idx ON reports (reported_id);

-- Every moderator decision is recorded.
CREATE TABLE moderation_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  target_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  report_id UUID REFERENCES reports(id) ON DELETE SET NULL,
  verification_id UUID REFERENCES verification_requests(id) ON DELETE SET NULL,
  note TEXT,
  ip TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX moderation_actions_time_idx ON moderation_actions (created_at DESC);

-- Discovery: skip deleted/banned/paused rows cheaply.
CREATE INDEX users_discoverable_idx ON users (last_active_at DESC) WHERE deleted_at IS NULL AND NOT is_banned AND discoverable;
