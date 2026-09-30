import '@/i18n';
import { useEffect } from 'react';
import { View } from 'react-native';
import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { loadSavedLanguage } from '@/i18n';
import { useAuth } from '@/lib/auth';
import { colors } from '@/lib/theme';
import { MatchCelebration } from '@/components/MatchCelebration';

SplashScreen.preventAutoHideAsync().catch(() => {});

const theme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: colors.bg, card: colors.bg, primary: colors.primary, text: colors.text, border: colors.border },
};

export default function RootLayout() {
  const status = useAuth((s) => s.status);
  const needsOnboarding = useAuth((s) => !!s.user && s.user.photos.length === 0);

  useEffect(() => {
    loadSavedLanguage().finally(() => useAuth.getState().bootstrap());
  }, []);

  useEffect(() => {
    if (status !== 'loading') SplashScreen.hideAsync().catch(() => {});
  }, [status]);

  if (status === 'loading') return <View style={{ flex: 1, backgroundColor: colors.bg }} />;

  const signedIn = status === 'signedIn';
  return (
    <SafeAreaProvider>
      <ThemeProvider value={theme}>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg }, animation: 'fade' }}>
          <Stack.Protected guard={!signedIn}>
            <Stack.Screen name="(auth)" />
          </Stack.Protected>
          <Stack.Protected guard={signedIn && needsOnboarding}>
            <Stack.Screen name="onboarding" />
          </Stack.Protected>
          <Stack.Protected guard={signedIn && !needsOnboarding}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="chat/[id]" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="user/[id]" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
            <Stack.Screen name="premium" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
            <Stack.Screen name="settings" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="edit-profile" options={{ animation: 'slide_from_right' }} />
          </Stack.Protected>
          <Stack.Screen name="language" options={{ animation: 'slide_from_right' }} />
        </Stack>
        {signedIn ? <MatchCelebration /> : null}
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
