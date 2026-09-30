-- Profile prompts: up to 3 answered questions, e.g. [{"id":"ideal_sunday","answer":"..."}]
ALTER TABLE users ADD COLUMN prompts JSONB NOT NULL DEFAULT '[]'::jsonb;
