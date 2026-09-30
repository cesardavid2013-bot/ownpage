/** Prompt ids; the question text lives in the apps' translations. */
export const PROMPT_IDS = [
  'ideal_sunday', 'green_flag', 'two_truths', 'best_trip', 'simple_pleasures',
  'first_date', 'dating_me', 'this_year', 'looking_for_someone', 'secretly_good_at',
] as const;
export type PromptId = (typeof PROMPT_IDS)[number];
export const MAX_PROMPTS = 3;
