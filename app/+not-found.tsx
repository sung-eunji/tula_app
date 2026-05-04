import { Link } from 'expo-router';
import { SafeAreaView, Text } from 'react-native';

import { PALETTE } from '@/constants/theme';

export default function NotFoundScreen() {
  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: PALETTE.page,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        gap: 12,
      }}
    >
      <Text style={{ color: PALETTE.text, fontSize: 20, fontWeight: '700' }}>페이지를 찾을 수 없습니다.</Text>
      <Link href="/(tabs)/mypage" style={{ color: PALETTE.primary }}>
        마이페이지로 이동
      </Link>
    </SafeAreaView>
  );
}
