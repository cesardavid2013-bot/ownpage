export type Gender = 'man' | 'woman' | 'nonbinary';
export type LookingFor = 'long_term' | 'short_term' | 'friendship' | 'casual' | 'unsure';
export type Plan = 'free' | 'plus' | 'gold' | 'platinum';
export type Product = 'plus' | 'gold' | 'platinum' | 'boost_pack' | 'superlike_pack';

export interface Photo {
  id: string;
  url: string;
}

export interface Profile {
  id: string;
  name: string;
  age: number | null;
  gender: Gender;
  bio: string;
  jobTitle: string;
  company: string;
  school: string;
  city: string;
  heightCm: number | null;
  lookingFor: LookingFor;
  interests: string[];
  languages: string[];
  isVerified: boolean;
  distanceKm: number | null;
  photos: Photo[];
  recentlyActive: boolean;
  superLikedYou?: boolean;
  note?: string | null;
}

export interface Entitlements {
  dailyLikes: number | null;
  dailySuperLikes: number;
  rewind: boolean;
  passport: boolean;
  seeWhoLikesYou: boolean;
  seeLikesSent: boolean;
  hideAgeDistance: boolean;
  incognito: boolean;
  priorityLikes: boolean;
  noteWithSuperLike: boolean;
  boostsPerPeriod: number;
}

export interface Me extends Profile {
  age: number;
  email: string;
  birthdate: string;
  interestedIn: Gender[];
  locale: string;
  hasLocation: boolean;
  passport: { lat: number; lng: number } | null;
  settings: {
    maxDistanceKm: number;
    ageMin: number;
    ageMax: number;
    globalMode: boolean;
    hideAge: boolean;
    hideDistance: boolean;
    incognito: boolean;
  };
  plan: Plan;
  planExpiresAt: string | null;
  planSource: string | null;
  entitlements: Entitlements;
  boost: { credits: number; activeUntil: string | null };
  limits: { likesRemaining: number | null; superLikesRemaining: number };
}

export interface Message {
  id: string;
  matchId: string;
  senderId: string;
  body: string;
  createdAt: string;
  readAt: string | null;
}

export interface Match {
  id: string;
  createdAt: string;
  user: Profile;
  lastMessage: { body: string; senderId: string; createdAt: string } | null;
  unread: number;
}
