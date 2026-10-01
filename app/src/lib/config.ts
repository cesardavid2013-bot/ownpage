import { Platform } from 'react-native';

export const APP_NAME = 'Lumi';

// In development the Android emulator reaches the host machine via 10.0.2.2.
const devDefault = Platform.OS === 'android' ? 'http://10.0.2.2:4000' : 'http://localhost:4000';

// "same-origin" means the web build is served by the API itself (see server WEB_DIR).
const configured = process.env.EXPO_PUBLIC_API_URL;
export const API_URL = configured === 'same-origin' ? '' : (configured || devDefault).replace(/\/$/, '');

export const REVENUECAT_KEYS = {
  ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? '',
  android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? '',
};

export const SUPPORT_EMAIL = 'support@lumi.app';
