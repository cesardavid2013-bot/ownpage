-- Live-selfie verification: the member copies a random pose; a moderator compares it with their photos.
CREATE TABLE verification_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pose TEXT NOT NULL,
  photo_file TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ
);
CREATE INDEX verification_status_idx ON verification_requests (status, created_at);
CREATE UNIQUE INDEX verification_one_pending ON verification_requests (user_id) WHERE status = 'pending';
CREATE INDEX reports_status_idx ON reports (status, created_at);
