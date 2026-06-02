import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { PALETTE } from '@/constants/theme';
import { createSequenceWithPoses, fetchSequences } from '@/services/supabase';
import type { AppLanguage, SequenceWithPoses, User } from '@/types';

interface SequenceScreenProps {
  user: User;
  language: AppLanguage;
}

const COPY: Record<AppLanguage, Record<string, string>> = {
  ko: {
    eyebrow: 'Sequences',
    title: '시퀀스',
    subtitle: '요가 수업에 쓸 포즈 시퀀스를 만들고 관리해요',
    addSequence: '시퀀스 추가',
    titleRequired: '시퀀스 제목 (필수)',
    themeOptional: '테마 / 목적 (선택 · 예: 허리 강화)',
    posesHint: '포즈 목록 (쉼표로 구분 · 예: 다운독, 플랭크)',
    saveSequence: '시퀀스 저장',
    saving: '저장 중...',
    cancel: '취소',
    none: '등록된 시퀀스가 없어요',
    loadError: '시퀀스 목록을 불러오지 못했습니다.',
    required: '제목을 입력해주세요.',
    createError: '시퀀스 추가에 실패했습니다.',
    poses: '개 포즈',
    noTheme: '테마 없음',
    created: '생성일',
  },
  en: {
    eyebrow: 'Sequences',
    title: 'Sequences',
    subtitle: 'Build and manage pose sequences for your classes',
    addSequence: 'Add sequence',
    titleRequired: 'Sequence title (required)',
    themeOptional: 'Theme / goal (optional · e.g. Back strength)',
    posesHint: 'Poses, comma-separated (e.g. Downdog, Plank)',
    saveSequence: 'Save sequence',
    saving: 'Saving...',
    cancel: 'Cancel',
    none: 'No sequences yet',
    loadError: 'Failed to load sequences.',
    required: 'Title is required.',
    createError: 'Failed to add sequence.',
    poses: ' poses',
    noTheme: 'No theme',
    created: 'Created',
  },
  fr: {
    eyebrow: 'Sequences',
    title: 'Séquences',
    subtitle: 'Créez et gérez vos séquences de poses pour les cours',
    addSequence: 'Ajouter',
    titleRequired: 'Titre de la séquence (obligatoire)',
    themeOptional: 'Thème / objectif (optionnel · ex : Renforcement dos)',
    posesHint: 'Poses séparées par des virgules (ex : Chien tête en bas, Planche)',
    saveSequence: 'Enregistrer',
    saving: 'Enregistrement...',
    cancel: 'Annuler',
    none: 'Aucune séquence',
    loadError: 'Impossible de charger les séquences.',
    required: 'Le titre est obligatoire.',
    createError: "Échec de l'ajout.",
    poses: ' poses',
    noTheme: 'Sans thème',
    created: 'Créé le',
  },
};

function formatDate(iso: string, language: AppLanguage) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(
      language === 'ko' ? 'ko-KR' : language === 'fr' ? 'fr-FR' : 'en-US',
      { year: 'numeric', month: 'short', day: 'numeric' },
    );
  } catch {
    return iso.slice(0, 10);
  }
}

const THEME_COLORS: [string, string][] = [
  [PALETTE.greenSoft, PALETTE.primaryDark],
  [PALETTE.accentSoft, '#E08B52'],
  ['#EEE8FF', '#6B52D4'],
  ['#FFF3DB', '#BF8A30'],
];
function themeStyle(idx: number) {
  const [bg, color] = THEME_COLORS[idx % THEME_COLORS.length];
  return { bg, color };
}

export default function SequenceScreen({ user, language }: SequenceScreenProps) {
  const c = COPY[language];
  const [sequences, setSequences] = useState<SequenceWithPoses[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const [title, setTitle] = useState('');
  const [theme, setTheme] = useState('');
  const [posesText, setPosesText] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchSequences();
      setSequences(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : c.loadError);
    } finally {
      setLoading(false);
    }
  }, [c.loadError]);

  useEffect(() => { void load(); }, [load]);

  const handleCreate = async () => {
    if (!title.trim()) { setError(c.required); return; }

    const poseList = posesText
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => ({ sanskritName: p, holdTimeMinutes: 1 }));

    setSaving(true);
    setError(null);
    try {
      await createSequenceWithPoses({
        userId: user.id,
        title: title.trim(),
        theme: theme.trim() || undefined,
        origin: 'manual',
        poses: poseList,
      });
      setTitle('');
      setTheme('');
      setPosesText('');
      setModalVisible(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : c.createError);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={ss.safe}>
      <ScrollView contentContainerStyle={ss.scroll}>
        {/* 헤더 */}
        <View style={ss.header}>
          <Text style={ss.eyebrow}>{c.eyebrow}</Text>
          <Text style={ss.title}>{c.title}</Text>
          <Text style={ss.subtitle}>{c.subtitle}</Text>
        </View>

        {loading && <ActivityIndicator color={PALETTE.primary} style={{ marginTop: 24 }} />}
        {error && <Text style={ss.errorText}>{error}</Text>}

        {!loading && sequences.length === 0 && (
          <View style={ss.emptyCard}>
            <Text style={ss.emptyText}>{c.none}</Text>
          </View>
        )}

        <View style={ss.cardList}>
          {sequences.map((seq, idx) => {
            const ts = themeStyle(idx);
            return (
              <View key={seq.id} style={ss.card}>
                <View style={ss.cardTop}>
                  <Text style={ss.cardTitle}>{seq.title}</Text>
                  <Text style={ss.cardDate}>{formatDate(seq.created_at, language)}</Text>
                </View>
                <View style={ss.pillRow}>
                  {seq.theme ? (
                    <View style={[ss.pill, { backgroundColor: ts.bg }]}>
                      <Text style={[ss.pillText, { color: ts.color }]}>{seq.theme}</Text>
                    </View>
                  ) : (
                    <View style={[ss.pill, ss.pillGrey]}>
                      <Text style={[ss.pillText, ss.pillTextGrey]}>{c.noTheme}</Text>
                    </View>
                  )}
                  <View style={[ss.pill, ss.pillGreen]}>
                    <Text style={[ss.pillText, ss.pillTextGreen]}>
                      {seq.poses.length}{c.poses}
                    </Text>
                  </View>
                </View>
                {seq.poses.length > 0 && (
                  <Text style={ss.posePreview} numberOfLines={2}>
                    {seq.poses.map((p) => p.pose_name).join(' · ')}
                  </Text>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* FAB */}
      <Pressable style={ss.fab} onPress={() => setModalVisible(true)}>
        <Text style={ss.fabText}>+</Text>
      </Pressable>

      {/* 시퀀스 추가 모달 */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={ss.modalOverlay}>
          <View style={ss.modalSheet}>
            <Text style={ss.modalTitle}>{c.addSequence}</Text>
            {error ? <Text style={ss.errorText}>{error}</Text> : null}

            <TextInput
              placeholder={c.titleRequired}
              placeholderTextColor={PALETTE.mutedText}
              value={title}
              onChangeText={setTitle}
              style={ss.input}
            />
            <TextInput
              placeholder={c.themeOptional}
              placeholderTextColor={PALETTE.mutedText}
              value={theme}
              onChangeText={setTheme}
              style={ss.input}
            />
            <TextInput
              placeholder={c.posesHint}
              placeholderTextColor={PALETTE.mutedText}
              value={posesText}
              onChangeText={setPosesText}
              multiline
              style={[ss.input, ss.inputMulti]}
            />

            <Pressable
              style={[ss.saveBtn, saving && { opacity: 0.6 }]}
              onPress={handleCreate}
              disabled={saving}
            >
              {saving
                ? <ActivityIndicator color="#fff" />
                : <Text style={ss.saveBtnText}>{c.saveSequence}</Text>}
            </Pressable>
            <Pressable
              style={ss.cancelBtn}
              onPress={() => { setModalVisible(false); setError(null); }}
            >
              <Text style={ss.cancelBtnText}>{c.cancel}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const ss = StyleSheet.create({
  safe: { flex: 1, backgroundColor: PALETTE.page },
  scroll: { paddingHorizontal: 22, paddingTop: 20, paddingBottom: 120 },

  header: { marginBottom: 24 },
  eyebrow: { fontSize: 13, color: PALETTE.accent, fontStyle: 'italic', marginBottom: 2 },
  title: { fontSize: 30, fontWeight: '600', color: PALETTE.text, letterSpacing: -0.3 },
  subtitle: { fontSize: 13.5, color: PALETTE.mutedText, marginTop: 4 },

  cardList: { gap: 12 },
  card: {
    backgroundColor: PALETTE.card,
    borderWidth: 1,
    borderColor: PALETTE.border,
    borderRadius: 22,
    padding: 18,
    shadowColor: PALETTE.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
    gap: 12,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardTitle: { fontSize: 15.5, fontWeight: '600', color: PALETTE.text, flex: 1, marginRight: 8 },
  cardDate: { fontSize: 11.5, color: PALETTE.mutedText },

  pillRow: { flexDirection: 'row', gap: 7, flexWrap: 'wrap' },
  pill: { paddingHorizontal: 11, paddingVertical: 5, borderRadius: 999 },
  pillText: { fontSize: 11.5, fontWeight: '600' },
  pillGreen: { backgroundColor: PALETTE.greenSoft },
  pillTextGreen: { color: PALETTE.primaryDark },
  pillGrey: { backgroundColor: '#F1EBE3' },
  pillTextGrey: { color: PALETTE.mutedText },

  posePreview: { fontSize: 12, color: PALETTE.mutedText, lineHeight: 18 },

  emptyCard: {
    backgroundColor: PALETTE.card,
    borderWidth: 1,
    borderColor: PALETTE.border,
    borderRadius: 22,
    padding: 40,
    alignItems: 'center',
  },
  emptyText: { color: PALETTE.mutedText, fontSize: 14 },

  errorText: { color: PALETTE.dangerText, fontSize: 13, marginBottom: 8 },

  fab: {
    position: 'absolute',
    right: 20,
    bottom: 100,
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: PALETTE.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: PALETTE.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 6,
  },
  fabText: { color: '#fff', fontSize: 28, lineHeight: 32 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(43,37,33,0.4)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: PALETTE.page,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 28,
    paddingBottom: 48,
    gap: 10,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: PALETTE.text, marginBottom: 4 },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: PALETTE.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 15,
    color: PALETTE.text,
  },
  inputMulti: { minHeight: 80, textAlignVertical: 'top' },
  saveBtn: {
    backgroundColor: PALETTE.primary,
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 4,
  },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  cancelBtn: { alignItems: 'center', paddingVertical: 10 },
  cancelBtnText: { color: PALETTE.mutedText, fontSize: 14 },
});
