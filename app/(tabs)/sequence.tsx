import { SafeAreaView, Text } from 'react-native';

import { PALETTE } from '@/constants/theme';

export default function SequenceRoute() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: PALETTE.page, padding: 16 }}>
      <Text style={{ color: PALETTE.text, fontSize: 18, fontWeight: '700' }}>시퀀스</Text>
      <Text style={{ color: PALETTE.mutedText, marginTop: 8 }}>
        시퀀스 화면은 현재 복구 중입니다.
      </Text>
    </SafeAreaView>
  );
}
