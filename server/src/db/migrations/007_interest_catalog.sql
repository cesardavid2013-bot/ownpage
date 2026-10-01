-- Interests now come from a fixed, translatable catalog (server/src/interests.ts). Drop anything else.
UPDATE users SET interests = ARRAY(
  SELECT i FROM unnest(interests) AS i
  WHERE i = ANY(ARRAY['travel','hiking','surf','running','cycling','yoga','fitness','dancing','art','museums','theatre',
    'concerts','music','photography','writing','cooking','baking','coffee','wine','restaurants','movies','books','gaming','board_games'])
  LIMIT 6
);
