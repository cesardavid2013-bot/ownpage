-- Advanced discovery filters (Plus and above)
ALTER TABLE users
  ADD COLUMN filter_verified BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN filter_has_prompts BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN filter_looking_for TEXT[] NOT NULL DEFAULT '{}';
