import * as Location from 'expo-location';
import { api } from './api';

/** Asks for permission and sends an approximate location (~100 m) to the server. */
export async function shareLocation(): Promise<boolean> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return false;
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
    const round = (n: number) => Math.round(n * 1000) / 1000;
    await api('/me/location', { method: 'PUT', body: { lat: round(pos.coords.latitude), lng: round(pos.coords.longitude) } });
    return true;
  } catch {
    return false;
  }
}

/** Refreshes location silently if permission was already granted. */
export async function refreshLocationIfAllowed() {
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status === 'granted') await shareLocation();
  } catch {}
}
