-- A heart on a message (by the recipient)
ALTER TABLE messages ADD COLUMN liked_at TIMESTAMPTZ;
