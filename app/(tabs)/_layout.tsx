import { Tabs } from 'expo-router';

import { AppStateProvider } from '@/providers/AppState';

export default function TabsLayout() {
  return (
    <AppStateProvider>
      <Tabs screenOptions={{ headerShown: false }}>
        <Tabs.Screen name="index" options={{ href: null }} />
        <Tabs.Screen name="products" options={{ title: '상품' }} />
        <Tabs.Screen name="members" options={{ title: '회원관리' }} />
        <Tabs.Screen name="schedule" options={{ title: '스케줄' }} />
        <Tabs.Screen name="sequence" options={{ title: '시퀀스' }} />
        <Tabs.Screen name="mypage" options={{ title: '마이페이지' }} />
      </Tabs>
    </AppStateProvider>
  );
}
