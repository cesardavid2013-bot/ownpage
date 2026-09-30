import { Platform } from 'react-native';

export const APP_NAME = 'Lumi';

// In development the Android emulator reaches the host machine via 10.0.2.2.
const devDefault = Platform.OS === 'android' ? 'http://10.0.2.2:4000' : 'http://localhost:4000';

export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? devDefault).replace(/\/$/, '');

export const REVENUECAT_KEYS = {
  ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? '',
  android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? '',
};

export const SUPPORT_EMAIL = 'support@lumi.app';
