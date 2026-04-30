import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, SafeAreaView, ScrollView, Text, TextInput, View } from 'react-native';

import {
  changePasswordWithCurrentPassword,
  deleteCurrentAccount,
  fetchMembers,
  fetchSequences,
  isNicknameAvailable,
  signOut,
  updateProfile,
} from '@/services/supabase';
import { RELEASE_INFO } from '@/constants/release';
import { PALETTE } from '@/constants/theme';
import type { AppLanguage, User } from '@/types';
import { getPasswordValidationMessage, isValidPassword } from '@/utils/auth';

interface SequenceGoalStat {
  goal: string;
  count: number;
}

interface MemberInflowStat {
  month: string;
  newMembers: number;
}

interface MyPageScreenProps {
  user: User;
  onLogout: () => void;
  onUserUpdate: (nextUser: User) => void;
  language: AppLanguage;
  onLanguageChange: (nextLanguage: AppLanguage) => void;
}

const COPY: Record<AppLanguage, Record<string, string>> = {
  ko: {
    loadError: '마이페이지 데이터를 불러오지 못했습니다.',
    logoutError: '로그아웃 실패',
    title: '마이페이지',
    subtitle: '월별 시퀀스 제작 방향과 회원 유입 동향을 확인할 수 있습니다.',
    language: '언어',
    logout: '로그아웃',
    studioAccount: '스튜디오 계정',
    summary: '요약',
    generated: '생성한 시퀀스',
    inflow: '신규 회원 유입',
    count: '개',
    people: '명',
    seqPurpose: '시퀀스 목적 분포',
    noMonthData: '해당 월 데이터가 없습니다.',
    inflowTrend: '회원 유입 동향 (최근 6개월)',
    noInflowData: '회원 유입 데이터가 없습니다.',
    helpAndLegal: '도움말 및 정책',
    privacyPolicy: '개인정보처리방침',
    contactSupport: '문의하기',
    requestDeletion: '계정 삭제 요청',
    supportDescription: '심사 대응용 문의 및 계정 관리 메뉴입니다.',
    missingPrivacyPolicy: '개인정보처리방침 URL을 먼저 넣어주세요.',
    missingSupportEmail: '지원 이메일을 먼저 넣어주세요.',
    openFailed: '링크를 열지 못했습니다.',
    deleteTitle: '계정 삭제 요청',
    deleteMessage: '계정을 삭제하면 프로필, 회원, 회원권, 수업, 출석, 시퀀스 등 계정과 연결된 정보가 삭제될 수 있습니다.\n\n삭제 후에는 복구가 어려울 수 있습니다.\n\n법적 의무가 있는 일부 정보는 일정 기간 보관될 수 있습니다.',
    cancel: '취소',
    continue: '계속',
    deleteConfirm: '삭제하기',
    deleting: '삭제 중...',
    deleteFailed: '계정 삭제에 실패했습니다.',
    deleteCompleted: '계정이 삭제되었습니다.',
    ok: '확인',
    accountSettings: '계정 설정',
    email: '이메일',
    nickname: '닉네임',
    saveProfile: '닉네임 저장',
    nicknameTaken: '이미 누군가 사용중인 닉네임입니다.',
    nicknameAvailable: '사용가능합니다.',
    nicknameRequired: '닉네임을 입력해주세요.',
    profileSaved: '닉네임이 변경되었습니다.',
    profileSaveError: '닉네임 저장에 실패했습니다.',
    passwordSettings: '비밀번호 변경',
    currentPassword: '현재 비밀번호',
    newPassword: '새 비밀번호',
    confirmNewPassword: '새 비밀번호 확인',
    changePassword: '비밀번호 변경',
    passwordChanged: '비밀번호가 변경되었습니다.',
    passwordMismatch: '두 비밀번호가 일치하지 않습니다.',
    currentPasswordRequired: '현재 비밀번호를 입력해주세요.',
    passwordChangeError: '비밀번호 변경에 실패했습니다.',
    viewPassword: '보기',
    hidePassword: '숨김',
    emailReadonly: '이메일은 변경할 수 없습니다.',
    checking: '확인 중입니다.',
    passwordValid: '사용 가능한 비밀번호입니다.',
    passwordMatched: '비밀번호가 일치합니다.',
  },
  en: {
    loadError: 'Failed to load my page data.',
    logoutError: 'Logout failed',
    title: 'My Page',
    subtitle: 'Track sequence goals and member inflow trends with a clean studio overview.',
    language: 'Language',
    logout: 'Logout',
    studioAccount: 'Studio account',
    summary: 'Summary',
    generated: 'Generated sequences',
    inflow: 'New member inflow',
    count: '',
    people: '',
    seqPurpose: 'Sequence purpose distribution',
    noMonthData: 'No data for this month.',
    inflowTrend: 'Member inflow trend (last 6 months)',
    noInflowData: 'No member inflow data.',
    helpAndLegal: 'Help and legal',
    privacyPolicy: 'Privacy Policy',
    contactSupport: 'Contact Support',
    requestDeletion: 'Request Account Deletion',
    supportDescription: 'Support and account management shortcuts for App Review readiness.',
    missingPrivacyPolicy: 'Add your privacy policy URL first.',
    missingSupportEmail: 'Add your support email first.',
    openFailed: 'Failed to open the link.',
    deleteTitle: 'Request account deletion',
    deleteMessage: 'Deleting your account may remove your profile, members, memberships, classes, attendance records, and saved sequences.\n\nThis action may be difficult to reverse.\n\nSome information may be retained for a limited time if required by law.',
    cancel: 'Cancel',
    continue: 'Continue',
    deleteConfirm: 'Delete account',
    deleting: 'Deleting...',
    deleteFailed: 'Failed to delete account.',
    deleteCompleted: 'Your account has been deleted.',
    ok: 'OK',
    accountSettings: 'Account settings',
    email: 'Email',
    nickname: 'Nickname',
    saveProfile: 'Save nickname',
    nicknameTaken: 'This nickname is already in use.',
    nicknameAvailable: 'This nickname is available.',
    nicknameRequired: 'Enter a nickname.',
    profileSaved: 'Nickname updated.',
    profileSaveError: 'Failed to save nickname.',
    passwordSettings: 'Change password',
    currentPassword: 'Current password',
    newPassword: 'New password',
    confirmNewPassword: 'Confirm new password',
    changePassword: 'Change password',
    passwordChanged: 'Password updated.',
    passwordMismatch: 'The two passwords do not match.',
    currentPasswordRequired: 'Enter your current password.',
    passwordChangeError: 'Failed to change password.',
    viewPassword: 'Show',
    hidePassword: 'Hide',
    emailReadonly: 'Email cannot be changed.',
    checking: 'Checking...',
    passwordValid: 'Your password is valid.',
    passwordMatched: 'Passwords match.',
  },
  fr: {
    loadError: 'Impossible de charger les donnees de la page perso.',
    logoutError: 'Echec de la deconnexion',
    title: 'Mon Espace',
    subtitle: 'Consultez les orientations mensuelles des sequences et les tendances des nouveaux membres.',
    language: 'Langue',
    logout: 'Deconnexion',
    studioAccount: 'Compte studio',
    summary: 'Resume',
    generated: 'Sequences generees',
    inflow: 'Nouveaux membres',
    count: '',
    people: '',
    seqPurpose: 'Repartition des objectifs de sequence',
    noMonthData: 'Aucune donnee pour ce mois.',
    inflowTrend: 'Tendance des nouveaux membres (6 derniers mois)',
    noInflowData: 'Aucune donnee de nouveaux membres.',
    helpAndLegal: 'Aide et mentions legales',
    privacyPolicy: 'Politique de confidentialite',
    contactSupport: 'Contacter le support',
    requestDeletion: 'Demander la suppression du compte',
    supportDescription: 'Raccourcis de support et gestion du compte pour la validation App Review.',
    missingPrivacyPolicy: 'Ajoutez d abord l URL de votre politique de confidentialite.',
    missingSupportEmail: 'Ajoutez d abord votre e-mail de support.',
    openFailed: 'Impossible d ouvrir le lien.',
    deleteTitle: 'Demander la suppression du compte',
    deleteMessage: 'La suppression du compte peut effacer votre profil, vos membres, abonnements, cours, presences et sequences enregistrees.\n\nCette action peut etre difficile a annuler.\n\nCertaines donnees peuvent etre conservees temporairement pour des obligations legales.',
    cancel: 'Annuler',
    continue: 'Continuer',
    deleteConfirm: 'Supprimer le compte',
    deleting: 'Suppression...',
    deleteFailed: 'Echec de la suppression du compte.',
    deleteCompleted: 'Votre compte a ete supprime.',
    ok: 'OK',
    accountSettings: 'Parametres du compte',
    email: 'E-mail',
    nickname: 'Pseudo',
    saveProfile: 'Enregistrer le pseudo',
    nicknameTaken: 'Ce pseudo est deja utilise.',
    nicknameAvailable: 'Ce pseudo est disponible.',
    nicknameRequired: 'Saisissez un pseudo.',
    profileSaved: 'Pseudo mis a jour.',
    profileSaveError: 'Echec de l enregistrement du pseudo.',
    passwordSettings: 'Changer le mot de passe',
    currentPassword: 'Mot de passe actuel',
    newPassword: 'Nouveau mot de passe',
    confirmNewPassword: 'Confirmer le nouveau mot de passe',
    changePassword: 'Changer le mot de passe',
    passwordChanged: 'Mot de passe mis a jour.',
    passwordMismatch: 'Les deux mots de passe ne correspondent pas.',
    currentPasswordRequired: 'Saisissez votre mot de passe actuel.',
    passwordChangeError: 'Echec du changement de mot de passe.',
    viewPassword: 'Afficher',
    hidePassword: 'Masquer',
    emailReadonly: 'L e-mail ne peut pas etre modifie.',
    checking: 'Verification en cours.',
    passwordValid: 'Mot de passe valide.',
    passwordMatched: 'Les mots de passe correspondent.',
  },
};

const LANGUAGE_OPTIONS: { code: AppLanguage; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'ko', label: 'Korean' },
  { code: 'fr', label: 'French' },
];


function monthKey(dateString: string) {
  return new Date(dateString).toISOString().slice(0, 7);
}

export default function MyPageScreen({ user, onLogout, onUserUpdate, language, onLanguageChange }: MyPageScreenProps) {
  const c = COPY[language];
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [sequenceStatsByMonth, setSequenceStatsByMonth] = useState<Record<string, SequenceGoalStat[]>>({});
  const [memberInflowStats, setMemberInflowStats] = useState<MemberInflowStat[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [profileNickname, setProfileNickname] = useState(user.nickname ?? '');
  const [profileSaving, setProfileSaving] = useState(false);
  const [nicknameAvailability, setNicknameAvailability] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sequences, members] = await Promise.all([fetchSequences(), fetchMembers()]);

      const goalsByMonth = new Map<string, Map<string, number>>();
      sequences.forEach((sequence) => {
        const month = monthKey(sequence.created_at);
        const goal = sequence.theme ?? 'Misc';
        const goalMap = goalsByMonth.get(month) ?? new Map<string, number>();
        goalMap.set(goal, (goalMap.get(goal) ?? 0) + 1);
        goalsByMonth.set(month, goalMap);
      });

      const nextGoalStats: Record<string, SequenceGoalStat[]> = {};
      Array.from(goalsByMonth.entries()).forEach(([month, goalMap]) => {
        nextGoalStats[month] = Array.from(goalMap.entries())
          .map(([goal, count]) => ({ goal, count }))
          .sort((a, b) => b.count - a.count);
      });

      const inflowMap = new Map<string, number>();
      members.forEach((member) => {
        const month = monthKey(member.created_at);
        inflowMap.set(month, (inflowMap.get(month) ?? 0) + 1);
      });

      const inflowRows = Array.from(inflowMap.entries())
        .map(([month, newMembers]) => ({ month, newMembers }))
        .sort((a, b) => (a.month > b.month ? 1 : -1));

      setSequenceStatsByMonth(nextGoalStats);
      setMemberInflowStats(inflowRows.slice(-6));

      const months = Object.keys(nextGoalStats).sort();
      setSelectedMonth(months[months.length - 1] ?? '');
    } catch (e) {
      setError(e instanceof Error ? e.message : c.loadError);
    } finally {
      setLoading(false);
    }
  }, [c.loadError]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setProfileNickname(user.nickname ?? '');
  }, [user.nickname]);

  useEffect(() => {
    const trimmedNickname = profileNickname.trim();
    if (!trimmedNickname || trimmedNickname === (user.nickname ?? '').trim()) {
      setNicknameAvailability('idle');
      return;
    }

    const timer = setTimeout(() => {
      setNicknameAvailability('checking');
      void isNicknameAvailable(trimmedNickname, user.id)
        .then((available) => {
          setNicknameAvailability(available ? 'available' : 'taken');
        })
        .catch(() => {
          setNicknameAvailability('idle');
        });
    }, 300);

    return () => clearTimeout(timer);
  }, [profileNickname, user.id, user.nickname]);

  const selectableMonths = useMemo(() => Object.keys(sequenceStatsByMonth).sort(), [sequenceStatsByMonth]);
  const sequenceStats = useMemo(() => sequenceStatsByMonth[selectedMonth] ?? [], [selectedMonth, sequenceStatsByMonth]);
  const maxSequenceCount = useMemo(() => Math.max(...sequenceStats.map((item) => item.count), 1), [sequenceStats]);
  const maxInflowCount = useMemo(() => Math.max(...memberInflowStats.map((item) => item.newMembers), 1), [memberInflowStats]);

  const totalGenerated = sequenceStats.reduce((sum, item) => sum + item.count, 0);
  const currentMonthInflow = memberInflowStats.find((item) => item.month === selectedMonth)?.newMembers ?? 0;
  const nextPasswordValidationMessage = useMemo(() => getPasswordValidationMessage(newPassword), [newPassword]);
  const confirmNextPasswordMessage = useMemo(() => {
    if (!confirmNewPassword) {
      return '';
    }

    if (newPassword !== confirmNewPassword) {
      return c.passwordMismatch;
    }

    return '';
  }, [c.passwordMismatch, confirmNewPassword, newPassword]);

  const handleLogout = async () => {
    try {
      await signOut();
      onLogout();
    } catch (e) {
      setError(e instanceof Error ? e.message : c.logoutError);
    }
  };

  const handleProfileSave = useCallback(async () => {
    const trimmedNickname = profileNickname.trim();
    if (!trimmedNickname) {
      setProfileMessage(c.nicknameRequired);
      return;
    }

    if (trimmedNickname !== (user.nickname ?? '').trim() && nicknameAvailability === 'taken') {
      setProfileMessage(c.nicknameTaken);
      return;
    }

    setProfileSaving(true);
    setProfileMessage(null);
    try {
      const nextUser = await updateProfile({
        userId: user.id,
        email: user.email,
        nickname: trimmedNickname,
        gender: user.gender ?? 'other',
      });
      onUserUpdate(nextUser);
      setProfileMessage(c.profileSaved);
    } catch (e) {
      setProfileMessage(e instanceof Error ? e.message : c.profileSaveError);
    } finally {
      setProfileSaving(false);
    }
  }, [c.nicknameRequired, c.nicknameTaken, c.profileSaveError, c.profileSaved, nicknameAvailability, onUserUpdate, profileNickname, user.email, user.gender, user.id, user.nickname]);

  const handlePasswordChange = useCallback(async () => {
    if (!currentPassword) {
      setPasswordMessage(c.currentPasswordRequired);
      return;
    }

    if (!newPassword || !confirmNewPassword) {
      setPasswordMessage(c.passwordChangeError);
      return;
    }

    if (!isValidPassword(newPassword)) {
      setPasswordMessage(getPasswordValidationMessage(newPassword));
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setPasswordMessage(c.passwordMismatch);
      return;
    }

    setPasswordSaving(true);
    setPasswordMessage(null);
    try {
      await changePasswordWithCurrentPassword({
        email: user.email,
        currentPassword,
        newPassword,
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setPasswordMessage(c.passwordChanged);
    } catch (e) {
      setPasswordMessage(e instanceof Error ? e.message : c.passwordChangeError);
    } finally {
      setPasswordSaving(false);
    }
  }, [c.currentPasswordRequired, c.passwordChangeError, c.passwordChanged, c.passwordMismatch, confirmNewPassword, currentPassword, newPassword, user.email]);

  const openExternal = useCallback(async (url: string, missingMessage: string) => {
    if (!url) {
      setError(missingMessage);
      return;
    }

    try {
      await Linking.openURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : c.openFailed);
    }
  }, [c.openFailed]);

  const handlePrivacyPolicy = useCallback(() => {
    void openExternal(RELEASE_INFO.privacyPolicyUrl, c.missingPrivacyPolicy);
  }, [c.missingPrivacyPolicy, openExternal]);

  const handleContactSupport = useCallback(() => {
    const email = RELEASE_INFO.supportEmail.trim();
    const body = encodeURIComponent(`App version:\nAccount email: ${user.email}\n\nMessage:\n`);
    void openExternal(email ? `mailto:${email}?subject=Tula%20Support&body=${body}` : '', c.missingSupportEmail);
  }, [c.missingSupportEmail, openExternal, user.email]);

  const handleAccountDeletion = useCallback(() => {
    Alert.alert(c.deleteTitle, c.deleteMessage, [
      { text: c.cancel, style: 'cancel' },
      {
        text: c.deleteConfirm,
        style: 'destructive',
        onPress: () => {
          void (async () => {
            setDeletingAccount(true);
            setError(null);
            try {
              await deleteCurrentAccount();
              Alert.alert(c.deleteTitle, c.deleteCompleted, [
                {
                  text: c.ok,
                  onPress: onLogout,
                },
              ]);
            } catch (e) {
              setError(e instanceof Error ? e.message : c.deleteFailed);
            } finally {
              setDeletingAccount(false);
            }
          })();
        },
      },
    ]);
  }, [c.cancel, c.deleteCompleted, c.deleteConfirm, c.deleteFailed, c.deleteMessage, c.deleteTitle, c.ok, onLogout]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: PALETTE.page }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        <View
          style={{
            backgroundColor: PALETTE.card,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: PALETTE.border,
            padding: 16,
            gap: 8,
          }}
        >
          <Text style={{ fontSize: 24, fontWeight: '700', color: PALETTE.text }}>{c.title}</Text>
          <Text style={{ color: PALETTE.mutedText, fontSize: 13 }}>{c.studioAccount}</Text>
          <Text style={{ color: PALETTE.text, fontWeight: '500' }}>{user.email}</Text>
          <Text style={{ color: PALETTE.mutedText, marginTop: 2, lineHeight: 20 }}>{c.subtitle}</Text>

          <View style={{ marginTop: 8, gap: 8 }}>
            <Text style={{ color: PALETTE.text, fontWeight: '600' }}>{c.language}</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {LANGUAGE_OPTIONS.map((option) => {
                const active = option.code === language;
                return (
                  <Pressable
                    key={option.code}
                    onPress={() => onLanguageChange(option.code)}
                    style={{
                      paddingVertical: 8,
                      paddingHorizontal: 12,
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: active ? PALETTE.lemonBorder : PALETTE.border,
                      backgroundColor: active ? PALETTE.lemon : PALETTE.card,
                    }}
                  >
                    <Text style={{ color: PALETTE.text, fontWeight: '600', fontSize: 12 }}>{option.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={{ marginTop: 2, alignItems: 'flex-end' }}>
            <Pressable
              onPress={handleLogout}
              style={{
                backgroundColor: PALETTE.primary,
                borderRadius: 12,
                paddingHorizontal: 14,
                paddingVertical: 9,
              }}
            >
              <Text style={{ color: '#fff', fontWeight: '700' }}>{c.logout}</Text>
            </Pressable>
          </View>
        </View>

        {error ? <Text style={{ color: PALETTE.dangerText, fontWeight: '500' }}>{error}</Text> : null}
        {loading ? <ActivityIndicator color={PALETTE.primary} /> : null}

        <View
          style={{
            backgroundColor: PALETTE.card,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: PALETTE.border,
            padding: 16,
            gap: 12,
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: '700', color: PALETTE.text }}>{c.accountSettings}</Text>

          <View style={{ gap: 6 }}>
            <Text style={{ color: PALETTE.text, fontWeight: '600' }}>{c.email}</Text>
            <View
              style={{
                borderWidth: 1,
                borderColor: PALETTE.border,
                borderRadius: 12,
                paddingHorizontal: 12,
                paddingVertical: 12,
                backgroundColor: '#F8F2ED',
              }}
            >
              <Text style={{ color: PALETTE.text }}>{user.email}</Text>
            </View>
            <Text style={{ color: PALETTE.mutedText, fontSize: 12 }}>{c.emailReadonly}</Text>
          </View>

          <View style={{ gap: 6 }}>
            <Text style={{ color: PALETTE.text, fontWeight: '600' }}>{c.nickname}</Text>
            <TextInput
              value={profileNickname}
              onChangeText={(value) => {
                setProfileNickname(value);
                setProfileMessage(null);
              }}
              placeholder={c.nickname}
              style={{
                borderWidth: 1,
                borderColor: PALETTE.border,
                borderRadius: 12,
                paddingHorizontal: 12,
                paddingVertical: 10,
                color: PALETTE.text,
                backgroundColor: PALETTE.page,
              }}
            />
            {profileNickname.trim() ? (
              <Text style={{ color: nicknameAvailability === 'taken' ? PALETTE.dangerText : '#2F6FED', fontSize: 12 }}>
                {nicknameAvailability === 'taken'
                  ? c.nicknameTaken
                  : nicknameAvailability === 'available'
                    ? c.nicknameAvailable
                    : nicknameAvailability === 'checking'
                      ? c.checking
                      : ''}
              </Text>
            ) : null}
            {profileMessage ? (
              <Text style={{ color: profileMessage === c.profileSaved ? '#2F6FED' : PALETTE.dangerText, fontSize: 12 }}>
                {profileMessage}
              </Text>
            ) : null}
            <Pressable
              onPress={handleProfileSave}
              disabled={profileSaving}
              style={{
                alignSelf: 'flex-start',
                backgroundColor: PALETTE.primary,
                borderRadius: 12,
                paddingHorizontal: 14,
                paddingVertical: 10,
                opacity: profileSaving ? 0.7 : 1,
              }}
            >
              <Text style={{ color: '#fff', fontWeight: '700' }}>
                {profileSaving ? 'Saving...' : c.saveProfile}
              </Text>
            </Pressable>
          </View>

          <View style={{ gap: 8, marginTop: 4 }}>
            <Text style={{ color: PALETTE.text, fontWeight: '700' }}>{c.passwordSettings}</Text>

            <View style={{ position: 'relative' }}>
              <TextInput
                value={currentPassword}
                onChangeText={(value) => {
                  setCurrentPassword(value);
                  setPasswordMessage(null);
                }}
                placeholder={c.currentPassword}
                secureTextEntry={!showCurrentPassword}
                style={{
                  borderWidth: 1,
                  borderColor: PALETTE.border,
                  borderRadius: 12,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  paddingRight: 56,
                  color: PALETTE.text,
                  backgroundColor: PALETTE.page,
                }}
              />
              <Pressable onPress={() => setShowCurrentPassword((prev) => !prev)} style={{ position: 'absolute', right: 12, top: 11 }}>
                <Text style={{ color: PALETTE.mutedText, fontSize: 12 }}>
                  {showCurrentPassword ? c.hidePassword : c.viewPassword}
                </Text>
              </Pressable>
            </View>

            <View style={{ position: 'relative' }}>
              <TextInput
                value={newPassword}
                onChangeText={(value) => {
                  setNewPassword(value);
                  setPasswordMessage(null);
                }}
                placeholder={c.newPassword}
                secureTextEntry={!showNewPassword}
                style={{
                  borderWidth: 1,
                  borderColor: PALETTE.border,
                  borderRadius: 12,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  paddingRight: 56,
                  color: PALETTE.text,
                  backgroundColor: PALETTE.page,
                }}
              />
              <Pressable onPress={() => setShowNewPassword((prev) => !prev)} style={{ position: 'absolute', right: 12, top: 11 }}>
                <Text style={{ color: PALETTE.mutedText, fontSize: 12 }}>
                  {showNewPassword ? c.hidePassword : c.viewPassword}
                </Text>
              </Pressable>
            </View>
            <Text style={{ color: nextPasswordValidationMessage ? PALETTE.dangerText : '#2F6FED', fontSize: 12 }}>
              {nextPasswordValidationMessage || (newPassword ? c.passwordValid : '')}
            </Text>

            <View style={{ position: 'relative' }}>
              <TextInput
                value={confirmNewPassword}
                onChangeText={(value) => {
                  setConfirmNewPassword(value);
                  setPasswordMessage(null);
                }}
                placeholder={c.confirmNewPassword}
                secureTextEntry={!showConfirmNewPassword}
                style={{
                  borderWidth: 1,
                  borderColor: PALETTE.border,
                  borderRadius: 12,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  paddingRight: 56,
                  color: PALETTE.text,
                  backgroundColor: PALETTE.page,
                }}
              />
              <Pressable onPress={() => setShowConfirmNewPassword((prev) => !prev)} style={{ position: 'absolute', right: 12, top: 11 }}>
                <Text style={{ color: PALETTE.mutedText, fontSize: 12 }}>
                  {showConfirmNewPassword ? c.hidePassword : c.viewPassword}
                </Text>
              </Pressable>
            </View>
            {confirmNextPasswordMessage ? (
              <Text style={{ color: PALETTE.dangerText, fontSize: 12 }}>{confirmNextPasswordMessage}</Text>
            ) : confirmNewPassword ? (
              <Text style={{ color: '#2F6FED', fontSize: 12 }}>{c.passwordMatched}</Text>
            ) : null}

            {passwordMessage ? (
              <Text style={{ color: passwordMessage === c.passwordChanged ? '#2F6FED' : PALETTE.dangerText, fontSize: 12 }}>
                {passwordMessage}
              </Text>
            ) : null}

            <Pressable
              onPress={handlePasswordChange}
              disabled={passwordSaving}
              style={{
                alignSelf: 'flex-start',
                backgroundColor: PALETTE.primary,
                borderRadius: 12,
                paddingHorizontal: 14,
                paddingVertical: 10,
                opacity: passwordSaving ? 0.7 : 1,
              }}
            >
              <Text style={{ color: '#fff', fontWeight: '700' }}>
                {passwordSaving ? 'Saving...' : c.changePassword}
              </Text>
            </Pressable>
          </View>
        </View>

        <View
          style={{
            backgroundColor: PALETTE.card,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: PALETTE.border,
            padding: 16,
            gap: 10,
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: '700', color: PALETTE.text }}>{c.helpAndLegal}</Text>
          <Text style={{ color: PALETTE.mutedText, fontSize: 13, lineHeight: 20 }}>{c.supportDescription}</Text>

          <Pressable
            onPress={handlePrivacyPolicy}
            style={{
              borderRadius: 12,
              borderWidth: 1,
              borderColor: PALETTE.border,
              paddingHorizontal: 14,
              paddingVertical: 12,
              backgroundColor: PALETTE.page,
            }}
          >
            <Text style={{ color: PALETTE.text, fontWeight: '600' }}>{c.privacyPolicy}</Text>
          </Pressable>

          <Pressable
            onPress={handleContactSupport}
            style={{
              borderRadius: 12,
              borderWidth: 1,
              borderColor: PALETTE.border,
              paddingHorizontal: 14,
              paddingVertical: 12,
              backgroundColor: PALETTE.page,
            }}
          >
            <Text style={{ color: PALETTE.text, fontWeight: '600' }}>{c.contactSupport}</Text>
          </Pressable>

          <Pressable
            onPress={handleAccountDeletion}
            disabled={deletingAccount}
            style={{
              borderRadius: 12,
              borderWidth: 1,
              borderColor: '#F1B8B3',
              paddingHorizontal: 14,
              paddingVertical: 12,
              backgroundColor: '#FFF4F2',
              opacity: deletingAccount ? 0.7 : 1,
            }}
          >
            <Text style={{ color: PALETTE.dangerText, fontWeight: '700' }}>
              {deletingAccount ? c.deleting : c.requestDeletion}
            </Text>
          </Pressable>
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {selectableMonths.map((month) => {
            const active = month === selectedMonth;
            return (
              <Pressable
                key={month}
                onPress={() => setSelectedMonth(month)}
                style={{
                  paddingVertical: 6,
                  paddingHorizontal: 10,
                  borderWidth: 1,
                  borderColor: active ? PALETTE.primary : PALETTE.border,
                  borderRadius: 16,
                  backgroundColor: active ? PALETTE.primary : PALETTE.card,
                }}
              >
                <Text style={{ color: active ? '#fff' : PALETTE.text, fontWeight: active ? '700' : '500' }}>{month}</Text>
              </Pressable>
            );
          })}
        </View>

        <View
          style={{
            padding: 16,
            borderWidth: 1,
            borderColor: PALETTE.border,
            borderRadius: 14,
            gap: 8,
            backgroundColor: PALETTE.card,
          }}
        >
          <Text style={{ fontWeight: '700', color: PALETTE.text }}>
            {selectedMonth} {c.summary}
          </Text>
          <Text style={{ color: PALETTE.text }}>
            {c.generated}: {totalGenerated}
            {c.count}
          </Text>
          <Text style={{ color: PALETTE.text }}>
            {c.inflow}: {currentMonthInflow}
            {c.people}
          </Text>
        </View>

        <View
          style={{
            gap: 12,
            backgroundColor: PALETTE.card,
            borderColor: PALETTE.border,
            borderWidth: 1,
            borderRadius: 14,
            padding: 16,
          }}
        >
          <Text style={{ fontWeight: '700', color: PALETTE.text }}>
            {c.seqPurpose} ({selectedMonth})
          </Text>
          {sequenceStats.length === 0 ? <Text style={{ color: PALETTE.mutedText }}>{c.noMonthData}</Text> : null}
          {sequenceStats.map((item) => (
            <View key={item.goal} style={{ gap: 4 }}>
              <Text style={{ color: PALETTE.text }}>
                {item.goal} ({item.count})
              </Text>
              <View style={{ height: 10, backgroundColor: PALETTE.track, borderRadius: 999 }}>
                <View
                  style={{
                    width: `${(item.count / maxSequenceCount) * 100}%`,
                    height: 10,
                    backgroundColor: PALETTE.primary,
                    borderRadius: 999,
                  }}
                />
              </View>
            </View>
          ))}
        </View>

        <View
          style={{
            gap: 12,
            marginBottom: 16,
            backgroundColor: PALETTE.card,
            borderColor: PALETTE.border,
            borderWidth: 1,
            borderRadius: 14,
            padding: 16,
          }}
        >
          <Text style={{ fontWeight: '700', color: PALETTE.text }}>{c.inflowTrend}</Text>
          {memberInflowStats.length === 0 ? <Text style={{ color: PALETTE.mutedText }}>{c.noInflowData}</Text> : null}
          {memberInflowStats.map((item) => (
            <View key={item.month} style={{ gap: 4 }}>
              <Text style={{ color: PALETTE.text }}>
                {item.month} ({item.newMembers}
                {c.people})
              </Text>
              <View style={{ height: 10, backgroundColor: PALETTE.track, borderRadius: 999 }}>
                <View
                  style={{
                    width: `${(item.newMembers / maxInflowCount) * 100}%`,
                    height: 10,
                    backgroundColor: item.month === selectedMonth ? PALETTE.primary : PALETTE.mutedBar,
                    borderRadius: 999,
                  }}
                />
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
