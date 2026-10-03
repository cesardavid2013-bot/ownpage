import { Platform } from 'react-native';

export const APP_NAME = 'Lumi';

/**
 * In a browser the app is normally served by the API itself, so it talks to the page's own origin.
 * Only Expo's dev server (ports 8081 / 19006) needs to be pointed at the API on :4000. Deciding this at
 * run time (not at build time) keeps a stale build cache from baking in the wrong address.
 */
function webDefault() {
  if (typeof window === 'undefined') return 'http://localhost:4000';
  const { port, hostname } = window.location;
  return port === '8081' || port === '19006' ? `http://${hostname}:4000` : '';
}

// In development the Android emulator reaches the host machine via 10.0.2.2.
const devDefault = Platform.OS === 'android' ? 'http://10.0.2.2:4000' : Platform.OS === 'web' ? webDefault() : 'http://localhost:4000';

// "same-origin" means the web build is served by the API itself (see server WEB_DIR).
const configured = process.env.EXPO_PUBLIC_API_URL;
export const API_URL = configured === 'same-origin' ? '' : (configured || devDefault).replace(/\/$/, '');

export const REVENUECAT_KEYS = {
  ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? '',
  android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? '',
};

export const SUPPORT_EMAIL = 'support@lumi.app';
