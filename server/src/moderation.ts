/** Reasons a member can give when reporting someone. Keep in sync with migration 006 and the app. */
export const REPORT_REASONS = [
  'fake', 'impersonation', 'scam', 'harassment', 'threats', 'unwanted_sexual', 'inappropriate', 'spam', 'underage', 'other',
] as const;
