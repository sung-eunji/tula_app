import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="support/privacy" options={{ title: '개인정보처리방침' }} />
      <Stack.Screen name="support/contact" options={{ title: '문의하기' }} />
      <Stack.Screen name="support/delete-account" options={{ title: '계정삭제요청' }} />
    </Stack>
  );
}
