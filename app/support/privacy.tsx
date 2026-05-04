import { Asset } from 'expo-asset';
import { Platform, SafeAreaView, Text } from 'react-native';
import { WebView } from 'react-native-webview';

import { RELEASE_INFO } from '@/constants/release';
import { PALETTE } from '@/constants/theme';

export default function PrivacyPolicyScreen() {
  const fallbackUrl = RELEASE_INFO.privacyPolicyUrl?.trim();
  const localPolicyAssetUri = Asset.fromModule(require('@/docs/privacy.html')).uri;
  const policyUri = localPolicyAssetUri || fallbackUrl;

  if (Platform.OS === 'web') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: PALETTE.page }}>
        <iframe
          src={policyUri}
          title="Privacy Policy"
          style={{ border: 'none', width: '100%', height: '100%' }}
        />
      </SafeAreaView>
    );
  }

  if (!policyUri) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: PALETTE.page, padding: 16 }}>
        <Text style={{ color: PALETTE.text }}>Privacy policy URL is not configured.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: PALETTE.page }}>
      <WebView source={{ uri: policyUri }} />
    </SafeAreaView>
  );
}
