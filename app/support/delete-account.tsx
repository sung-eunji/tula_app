import { Alert, Pressable, SafeAreaView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { deleteCurrentAccount } from '@/services/supabase';
import { PALETTE } from '@/constants/theme';

export default function DeleteAccountScreen() {
  const router = useRouter();

  const onDelete = () => {
    Alert.alert('계정 삭제 요청', '정말 계정을 삭제할까요? 이 작업은 되돌릴 수 없습니다.', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제하기',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            await deleteCurrentAccount();
            Alert.alert('완료', '계정 삭제가 처리되었습니다.', [
              {
                text: '확인',
                onPress: () => router.replace('/(tabs)/mypage'),
              },
            ]);
          })();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: PALETTE.page, padding: 16 }}>
      <View style={{ gap: 12 }}>
        <Text style={{ fontSize: 24, fontWeight: '700', color: PALETTE.text }}>계정삭제요청</Text>
        <Text style={{ color: PALETTE.text, lineHeight: 22 }}>
          요청 시 프로필, 회원, 회원권, 수업, 출석, 시퀀스 등 계정 데이터가 삭제될 수 있습니다.
        </Text>
        <Pressable
          onPress={onDelete}
          style={{
            backgroundColor: PALETTE.dangerText,
            borderRadius: 12,
            paddingVertical: 12,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: '#fff', fontWeight: '700' }}>계정 삭제 요청하기</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
