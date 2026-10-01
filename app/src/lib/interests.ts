/** The interests members can pick (same list as server/src/interests.ts). Labels live in i18n under `interest.*`. */
export const INTEREST_GROUPS = {
  move: ['travel', 'hiking', 'surf', 'running', 'cycling', 'yoga', 'fitness', 'dancing'],
  culture: ['art', 'museums', 'theatre', 'concerts', 'music', 'photography', 'writing'],
  table: ['cooking', 'baking', 'coffee', 'wine', 'restaurants'],
  in: ['movies', 'books', 'gaming', 'board_games'],
} as const;
export type InterestId = (typeof INTEREST_GROUPS)[keyof typeof INTEREST_GROUPS][number];
export const INTEREST_IDS = Object.values(INTEREST_GROUPS).flat() as InterestId[];
export const MAX_INTERESTS = 6;
