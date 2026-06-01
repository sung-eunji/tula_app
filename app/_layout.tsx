import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';

import { AppStateProvider, useAppState } from '@/providers/AppState';

function AuthGate() {
  const { user, authLoading } = useAppState();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (authLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!user && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (user && inAuthGroup) {
      router.replace('/(tabs)/mypage');
    }
  }, [user, authLoading, segments]);

  return null;
}

export default function RootLayout() {
  return (
    <AppStateProvider>
      <AuthGate />
      <Stack>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="support/privacy" options={{ title: '개인정보처리방침' }} />
        <Stack.Screen name="support/contact" options={{ title: '문의하기' }} />
        <Stack.Screen name="support/delete-account" options={{ title: '계정삭제요청' }} />
      </Stack>
    </AppStateProvider>
  );
}
