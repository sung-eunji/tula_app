import { Stack } from 'expo-router';

import { AppStateProvider } from '@/providers/AppState';

export default function AuthLayout() {
  return (
    <AppStateProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </AppStateProvider>
  );
}
