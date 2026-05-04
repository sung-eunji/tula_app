import { Linking, Pressable, SafeAreaView, Text, View } from 'react-native';

import { RELEASE_INFO } from '@/constants/release';
import { PALETTE } from '@/constants/theme';

export default function ContactSupportScreen() {
  const email = RELEASE_INFO.supportEmail.trim();

  const openMail = async () => {
    if (!email) return;
    const body = encodeURIComponent('Message:\n');
    await Linking.openURL(`mailto:${email}?subject=Tula%20Support&body=${body}`);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: PALETTE.page, padding: 16 }}>
      <View style={{ gap: 12 }}>
        <Text style={{ fontSize: 24, fontWeight: '700', color: PALETTE.text }}>문의하기</Text>
        <Text style={{ color: PALETTE.text }}>지원 이메일: {email || '-'}</Text>
        <Pressable
          onPress={() => {
            void openMail();
          }}
          style={{
            backgroundColor: PALETTE.primary,
            borderRadius: 12,
            paddingVertical: 12,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: '#fff', fontWeight: '700' }}>이메일 보내기</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
