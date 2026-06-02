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
import {
  isEmailAvailable,
  isNicknameAvailable,
  signUpWithEmail,
} from '@/services/supabase';
import type { AppLanguage, UserGender } from '@/types';
import { getPasswordValidationMessage, isValidPassword } from '@/utils/auth';

const COPY: Record<AppLanguage, {
  title: string;
  sub: string;
  emailLabel: string;
  emailPlaceholder: string;
  nicknameLabel: string;
  nicknamePlaceholder: string;
  passwordLabel: string;
  passwordPlaceholder: string;
  passwordHint: string;
  genderLabel: string;
  genders: Record<UserGender, string>;
  submit: string;
  back: string;
  emailTaken: string;
  nicknameTaken: string;
}> = {
  ko: {
    title: '스튜디오 만들기',
    sub: 'Tula로 요가 수업을 운영해보세요',
    emailLabel: '이메일',
    emailPlaceholder: 'studio@tula.app',
    nicknameLabel: '스튜디오 이름',
    nicknamePlaceholder: '나모 요가 스튜디오',
    passwordLabel: '비밀번호',
    passwordPlaceholder: '8자 이상, 대소문자+숫자',
    passwordHint: '8자 이상 · 대문자 · 소문자 · 숫자 포함',
    genderLabel: '성별',
    genders: { female: '여성', male: '남성', other: '기타' },
    submit: '가입하기',
    back: '이미 계정이 있어요',
    emailTaken: '이미 사용 중인 이메일입니다.',
    nicknameTaken: '이미 사용 중인 스튜디오 이름입니다.',
  },
  en: {
    title: 'Create your studio',
    sub: 'Manage your yoga classes with Tula',
    emailLabel: 'Email',
    emailPlaceholder: 'studio@tula.app',
    nicknameLabel: 'Studio name',
    nicknamePlaceholder: 'Namo Yoga Studio',
    passwordLabel: 'Password',
    passwordPlaceholder: '8+ chars, upper + lower + number',
    passwordHint: '8+ chars · uppercase · lowercase · number',
    genderLabel: 'Gender',
    genders: { female: 'Female', male: 'Male', other: 'Other' },
    submit: 'Sign up',
    back: 'Already have an account',
    emailTaken: 'This email is already taken.',
    nicknameTaken: 'This studio name is already taken.',
  },
  fr: {
    title: 'Créer votre studio',
    sub: 'Gérez vos cours de yoga avec Tula',
    emailLabel: 'E-mail',
    emailPlaceholder: 'studio@tula.app',
    nicknameLabel: 'Nom du studio',
    nicknamePlaceholder: 'Studio Yoga Namo',
    passwordLabel: 'Mot de passe',
    passwordPlaceholder: '8+ cars, maj + min + chiffre',
    passwordHint: '8+ cars · majuscule · minuscule · chiffre',
    genderLabel: 'Genre',
    genders: { female: 'Femme', male: 'Homme', other: 'Autre' },
    submit: "S'inscrire",
    back: "J'ai déjà un compte",
    emailTaken: 'Cet e-mail est déjà utilisé.',
    nicknameTaken: 'Ce nom de studio est déjà pris.',
  },
};

const GENDERS: UserGender[] = ['female', 'male', 'other'];

export default function SignupScreen() {
  const { language, setUser } = useAppState();
  const c = COPY[language];

  const [email, setEmail] = useState('');
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [gender, setGender] = useState<UserGender>('female');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignup = async () => {
    setError('');

    if (!email.trim() || !nickname.trim() || !password) {
      setError('모든 항목을 입력해주세요.');
      return;
    }

    const pwMsg = getPasswordValidationMessage(password);
    if (!isValidPassword(password)) {
      setError(pwMsg);
      return;
    }

    setLoading(true);
    try {
      const emailOk = await isEmailAvailable(email.trim());
      if (!emailOk) { setError(c.emailTaken); return; }

      const nicknameOk = await isNicknameAvailable(nickname.trim());
      if (!nicknameOk) { setError(c.nicknameTaken); return; }

      const user = await signUpWithEmail({ email, password, nickname, gender });
      setUser(user);
      router.replace('/(tabs)/mypage');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '가입에 실패했습니다.');
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

        <View style={styles.field}>
          <Text style={styles.label}>{c.nicknameLabel}</Text>
          <TextInput
            style={styles.input}
            placeholder={c.nicknamePlaceholder}
            placeholderTextColor={PALETTE.mutedText}
            value={nickname}
            onChangeText={setNickname}
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
          <Text style={styles.hint}>{c.passwordHint}</Text>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>{c.genderLabel}</Text>
          <View style={styles.segRow}>
            {GENDERS.map((g) => (
              <Pressable
                key={g}
                style={[styles.segBtn, gender === g && styles.segBtnActive]}
                onPress={() => setGender(g)}
              >
                <Text style={[styles.segText, gender === g && styles.segTextActive]}>
                  {c.genders[g]}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <Pressable
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSignup}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.buttonText}>{c.submit}</Text>}
        </Pressable>

        <Pressable style={styles.backRow} onPress={() => router.back()}>
          <Text style={styles.backText}>{c.back}</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: PALETTE.page },
  container: {
    flexGrow: 1,
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
  hint: { fontSize: 11.5, color: PALETTE.mutedText, marginTop: 6, marginLeft: 4 },
  segRow: { flexDirection: 'row', gap: 8 },
  segBtn: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: PALETTE.border,
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
  },
  segBtnActive: {
    backgroundColor: PALETTE.primary,
    borderColor: PALETTE.primary,
  },
  segText: { fontSize: 13, fontWeight: '600', color: PALETTE.mutedText },
  segTextActive: { color: '#fff' },
  button: {
    backgroundColor: PALETTE.primary,
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8,
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
});
