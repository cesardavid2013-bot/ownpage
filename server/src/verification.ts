export const POSES = ['peace_sign', 'thumbs_up', 'touch_nose', 'hand_on_cheek', 'wave'] as const;
export type Pose = (typeof POSES)[number];

/** A pose that changes every day per member, so an old selfie can't be reused. */
export function poseFor(userId: string, date = new Date()): Pose {
  const seed = `${userId}:${date.toISOString().slice(0, 10)}`;
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return POSES[h % POSES.length];
}
