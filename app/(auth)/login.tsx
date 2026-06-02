import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';

import { PALETTE } from '@/constants/theme';
import { useAppState } from '@/providers/AppState';
import { signInWithEmail } from '@/services/supabase';
import type { AppLanguage } from '@/types';

const COPY: Record<AppLanguage, {
  eyebrow: string;
  tagline: string;
  emailLabel: string;
  emailPlaceholder: string;
  passwordLabel: string;
  passwordPlaceholder: string;
  submit: string;
  forgot: string;
  signup: string;
  errorEmpty: string;
}> = {
  ko: {
    eyebrow: 'balance your studio',
    tagline: 'Tula',
    emailLabel: '이메일',
    emailPlaceholder: 'studio@tula.app',
    passwordLabel: '비밀번호',
    passwordPlaceholder: '••••••••',
    submit: '로그인',
    forgot: '비밀번호 찾기',
    signup: '스튜디오 만들기',
    errorEmpty: '이메일과 비밀번호를 입력해주세요.',
  },
  en: {
    eyebrow: 'balance your studio',
    tagline: 'Tula',
    emailLabel: 'Email',
    emailPlaceholder: 'studio@tula.app',
    passwordLabel: 'Password',
    passwordPlaceholder: '••••••••',
    submit: 'Sign in',
    forgot: 'Forgot password',
    signup: 'Create studio',
    errorEmpty: 'Please enter your email and password.',
  },
  fr: {
    eyebrow: 'balance your studio',
    tagline: 'Tula',
    emailLabel: 'E-mail',
    emailPlaceholder: 'studio@tula.app',
    passwordLabel: 'Mot de passe',
    passwordPlaceholder: '••••••••',
    submit: 'Se connecter',
    forgot: 'Mot de passe oublié',
    signup: 'Créer un studio',
    errorEmpty: 'Veuillez saisir votre e-mail et mot de passe.',
  },
};

export default function LoginScreen() {
  const { language, setUser } = useAppState();
  const c = COPY[language];

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError(c.errorEmpty);
      return;
    }
    setError('');
    setLoading(true);
    try {
      const user = await signInWithEmail(email.trim(), password);
      setUser(user);
      router.replace('/(tabs)/mypage');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '로그인에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        {/* 로고 영역 */}
        <View style={styles.logoArea}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoLetter}>T</Text>
          </View>
          <Text style={styles.title}>{c.tagline}</Text>
          <Text style={styles.tagline}>{c.eyebrow}</Text>
        </View>

        {/* 폼 */}
        <View style={styles.form}>
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

          <View style={styles.field}>
            <Text style={styles.label}>{c.passwordLabel}</Text>
            <TextInput
              style={styles.input}
              placeholder={c.passwordPlaceholder}
              placeholderTextColor={PALETTE.mutedText}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          <Pressable
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.buttonText}>{c.submit}</Text>}
          </Pressable>

          <View style={styles.footer}>
            <Pressable onPress={() => router.push('/(auth)/forgot-password')}>
              <Text style={styles.linkMuted}>{c.forgot}</Text>
            </Pressable>
            <Pressable onPress={() => router.push('/(auth)/signup')}>
              <Text style={styles.linkPrimary}>{c.signup}</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: PALETTE.page },
  container: {
    flexGrow: 1,
    paddingHorizontal: 30,
    paddingTop: 80,
    paddingBottom: 48,
  },
  logoArea: { alignItems: 'center', flex: 1, justifyContent: 'center', paddingBottom: 32 },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 28,
    backgroundColor: PALETTE.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  logoLetter: { color: '#fff', fontSize: 40, fontWeight: '600' },
  title: {
    fontSize: 42,
    fontWeight: '500',
    color: PALETTE.text,
    letterSpacing: 1,
  },
  tagline: {
    fontSize: 13.5,
    color: PALETTE.mutedText,
    fontStyle: 'italic',
    marginTop: 2,
    marginBottom: 32,
  },
  form: { width: '100%' },
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
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  linkMuted: { fontSize: 13, color: PALETTE.mutedText },
  linkPrimary: { fontSize: 13, color: PALETTE.primary, fontWeight: '600' },
  errorText: {
    color: PALETTE.dangerText,
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 12,
    textAlign: 'center',
  },
});
