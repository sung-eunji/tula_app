import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';

import { PALETTE } from '@/constants/theme';
import { useAppState } from '@/providers/AppState';
import { sendPasswordResetEmail } from '@/services/supabase';
import type { AppLanguage } from '@/types';

const COPY: Record<AppLanguage, {
  title: string;
  sub: string;
  emailLabel: string;
  emailPlaceholder: string;
  submit: string;
  back: string;
  successTitle: string;
  successSub: string;
  backToLogin: string;
}> = {
  ko: {
    title: '비밀번호 찾기',
    sub: '가입한 이메일을 입력하면 재설정 링크를 보내드려요.',
    emailLabel: '이메일',
    emailPlaceholder: 'studio@tula.app',
    submit: '재설정 메일 보내기',
    back: '로그인으로 돌아가기',
    successTitle: '메일을 보냈어요',
    successSub: '받은 편지함을 확인해 비밀번호를 재설정해주세요.',
    backToLogin: '로그인 화면으로',
  },
  en: {
    title: 'Reset password',
    sub: "Enter your email and we'll send you a reset link.",
    emailLabel: 'Email',
    emailPlaceholder: 'studio@tula.app',
    submit: 'Send reset link',
    back: 'Back to sign in',
    successTitle: 'Check your email',
    successSub: 'We sent a password reset link to your inbox.',
    backToLogin: 'Back to sign in',
  },
  fr: {
    title: 'Mot de passe oublié',
    sub: 'Entrez votre e-mail pour recevoir un lien de réinitialisation.',
    emailLabel: 'E-mail',
    emailPlaceholder: 'studio@tula.app',
    submit: 'Envoyer le lien',
    back: 'Retour à la connexion',
    successTitle: 'E-mail envoyé',
    successSub: 'Vérifiez votre boîte de réception pour réinitialiser votre mot de passe.',
    backToLogin: 'Retour à la connexion',
  },
};

export default function ForgotPasswordScreen() {
  const { language } = useAppState();
  const c = COPY[language];

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    if (!email.trim()) {
      setError('이메일을 입력해주세요.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await sendPasswordResetEmail(email.trim());
      setSent(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '메일 발송에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <View style={styles.flex}>
        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <Text style={styles.successIconText}>✓</Text>
          </View>
          <Text style={styles.successTitle}>{c.successTitle}</Text>
          <Text style={styles.successSub}>{c.successSub}</Text>
          <Pressable style={styles.button} onPress={() => router.replace('/(auth)/login')}>
            <Text style={styles.buttonText}>{c.backToLogin}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.container}>
        <Text style={styles.title}>{c.title}</Text>
        <Text style={styles.sub}>{c.sub}</Text>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <View style={styles.field}>
          <Text style={styles.label}>{c.emailLabel}</Text>
          <TextInput
            style={styles.input}
            placeholder={c.emailPlaceholder}
            placeholderTextColor={PALETTE.mutedText}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
        </View>

        <Pressable
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSend}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.buttonText}>{c.submit}</Text>}
        </Pressable>

        <Pressable style={styles.backRow} onPress={() => router.back()}>
          <Text style={styles.backText}>{c.back}</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: PALETTE.page },
  container: {
    flex: 1,
    paddingHorizontal: 30,
    paddingTop: 72,
    paddingBottom: 48,
  },
  title: { fontSize: 28, fontWeight: '600', color: PALETTE.text, marginBottom: 6 },
  sub: { fontSize: 14, color: PALETTE.mutedText, marginBottom: 28 },
  field: { marginBottom: 14 },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: PALETTE.mutedText,
    marginLeft: 4,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: PALETTE.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: PALETTE.text,
  },
  button: {
    backgroundColor: PALETTE.primary,
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 6,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  backRow: { alignItems: 'center', marginTop: 20 },
  backText: { fontSize: 13, color: PALETTE.mutedText },
  errorText: {
    color: PALETTE.dangerText,
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 12,
    textAlign: 'center',
  },
  // 성공 화면
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  successIcon: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: PALETTE.greenSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  successIconText: { fontSize: 32, color: PALETTE.primary },
  successTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: PALETTE.text,
    marginBottom: 10,
    textAlign: 'center',
  },
  successSub: {
    fontSize: 14,
    color: PALETTE.mutedText,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 32,
  },
});
