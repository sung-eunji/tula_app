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
import { createProduct, fetchProducts } from '@/services/supabase';
import type { AppLanguage, Product, User } from '@/types';

interface ProductsScreenProps {
  user: User;
  language: AppLanguage;
}

const COPY: Record<AppLanguage, Record<string, string>> = {
  ko: {
    eyebrow: 'Catalog',
    title: '이용권 상품',
    subtitle: '스튜디오에서 판매하는 회원권을 관리해요',
    addProduct: '상품 추가',
    nameRequired: '상품명 (필수)',
    descOptional: '설명 (선택)',
    priceRequired: '가격 (필수)',
    currencyCode: '통화 (기본 EUR)',
    totalSessions: '총 횟수 (선택)',
    validityDays: '유효기간 일수 (선택)',
    saving: '저장 중...',
    saveProduct: '상품 저장',
    cancel: '취소',
    none: '등록된 상품이 없어요',
    unlimited: '무제한',
    noLimit: '제한 없음',
    loadError: '상품 목록을 불러오지 못했습니다.',
    required: '상품명과 가격은 필수입니다.',
    invalidPrice: '가격 형식이 올바르지 않습니다.',
    invalidTotalSessions: '총 횟수는 0 이상의 숫자여야 합니다.',
    invalidValidity: '유효기간 일수는 0 이상의 숫자여야 합니다.',
    rlsError: 'RLS 정책 오류. products 테이블 policy를 확인해주세요.',
    createError: '상품 추가에 실패했습니다.',
    daysValid: '일 유효',
  },
  en: {
    eyebrow: 'Catalog',
    title: 'Products',
    subtitle: 'Manage membership passes for your studio',
    addProduct: 'Add product',
    nameRequired: 'Product name (required)',
    descOptional: 'Description (optional)',
    priceRequired: 'Price (required)',
    currencyCode: 'Currency (default EUR)',
    totalSessions: 'Total sessions (optional)',
    validityDays: 'Validity days (optional)',
    saving: 'Saving...',
    saveProduct: 'Save product',
    cancel: 'Cancel',
    none: 'No products yet',
    unlimited: 'Unlimited',
    noLimit: 'No limit',
    loadError: 'Failed to load products.',
    required: 'Name and price are required.',
    invalidPrice: 'Invalid price format.',
    invalidTotalSessions: 'Sessions must be ≥ 0.',
    invalidValidity: 'Validity days must be ≥ 0.',
    rlsError: 'Blocked by RLS policy.',
    createError: 'Failed to add product.',
    daysValid: 'd valid',
  },
  fr: {
    eyebrow: 'Catalog',
    title: 'Produits',
    subtitle: 'Gérez les abonnements de votre studio',
    addProduct: 'Ajouter',
    nameRequired: 'Nom du produit (obligatoire)',
    descOptional: 'Description (optionnel)',
    priceRequired: 'Prix (obligatoire)',
    currencyCode: 'Devise (EUR par défaut)',
    totalSessions: 'Séances totales (optionnel)',
    validityDays: 'Jours de validité (optionnel)',
    saving: 'Enregistrement...',
    saveProduct: 'Enregistrer',
    cancel: 'Annuler',
    none: 'Aucun produit',
    unlimited: 'Illimité',
    noLimit: 'Sans limite',
    loadError: 'Impossible de charger les produits.',
    required: 'Nom et prix obligatoires.',
    invalidPrice: 'Format de prix invalide.',
    invalidTotalSessions: 'Séances doit être ≥ 0.',
    invalidValidity: 'Jours de validité doit être ≥ 0.',
    rlsError: 'Bloqué par la politique RLS.',
    createError: "Échec de l'ajout.",
    daysValid: 'j valide',
  },
};

function formatPrice(value: number, currency: string) {
  const symbols: Record<string, string> = { EUR: '€', KRW: '₩', GBP: '£', USD: '$' };
  const sym = symbols[currency] ?? currency + ' ';
  if (currency === 'KRW') return `${sym}${value.toLocaleString('ko-KR')}`;
  return `${sym}${value}`;
}

export default function ProductsScreen({ user, language }: ProductsScreenProps) {
  const c = COPY[language];
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [totalSessions, setTotalSessions] = useState('');
  const [validityDays, setValidityDays] = useState('');
  const [currency, setCurrency] = useState('EUR');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchProducts();
      setProducts(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : c.loadError);
    } finally {
      setLoading(false);
    }
  }, [c.loadError]);

  useEffect(() => { void load(); }, [load]);

  const handleCreate = async () => {
    if (!name || !price) { setError(c.required); return; }
    const normalizedPrice = Number(price.replace(/,/g, '').trim());
    if (!Number.isFinite(normalizedPrice) || normalizedPrice <= 0) { setError(c.invalidPrice); return; }
    const parsedSessions = totalSessions ? Number(totalSessions.trim()) : undefined;
    if (parsedSessions !== undefined && (!Number.isFinite(parsedSessions) || parsedSessions < 0)) { setError(c.invalidTotalSessions); return; }
    const parsedValidity = validityDays ? Number(validityDays.trim()) : undefined;
    if (parsedValidity !== undefined && (!Number.isFinite(parsedValidity) || parsedValidity < 0)) { setError(c.invalidValidity); return; }

    setSaving(true); setError(null);
    try {
      await createProduct({ userId: user.id, name, description: description || undefined, price: normalizedPrice, currency: currency || 'EUR', totalSessions: parsedSessions, validityDays: parsedValidity });
      setName(''); setDescription(''); setPrice(''); setTotalSessions(''); setValidityDays('');
      setModalVisible(false);
      await load();
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      setError(msg.includes('row-level security') ? c.rlsError : msg || c.createError);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* 헤더 */}
        <View style={styles.header}>
          <Text style={styles.eyebrow}>{c.eyebrow}</Text>
          <Text style={styles.title}>{c.title}</Text>
          <Text style={styles.subtitle}>{c.subtitle}</Text>
        </View>

        {/* 로딩 */}
        {loading && <ActivityIndicator color={PALETTE.primary} style={{ marginTop: 24 }} />}
        {error && <Text style={styles.errorText}>{error}</Text>}

        {/* 상품 카드 목록 */}
        {!loading && products.length === 0 && (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>{c.none}</Text>
          </View>
        )}

        <View style={styles.cardList}>
          {products.map((p) => (
            <View key={p.id} style={styles.card}>
              <View style={styles.cardRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardName}>{p.name}</Text>
                  {p.description ? <Text style={styles.cardDesc}>{p.description}</Text> : null}
                </View>
                <Text style={styles.cardPrice}>{formatPrice(p.price, p.currency)}</Text>
              </View>
              <View style={styles.pillRow}>
                <View style={[styles.pill, styles.pillGreen]}>
                  <Text style={[styles.pillText, styles.pillTextGreen]}>
                    {p.total_sessions ? `${p.total_sessions}회` : c.unlimited}
                  </Text>
                </View>
                {p.validity_days ? (
                  <View style={[styles.pill, styles.pillPeach]}>
                    <Text style={[styles.pillText, styles.pillTextPeach]}>{p.validity_days}{c.daysValid}</Text>
                  </View>
                ) : null}
                <View style={[styles.pill, styles.pillGrey]}>
                  <Text style={[styles.pillText, styles.pillTextGrey]}>{p.currency}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* FAB */}
      <Pressable style={styles.fab} onPress={() => setModalVisible(true)}>
        <Text style={styles.fabText}>+</Text>
      </Pressable>

      {/* 상품 추가 모달 */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>{c.addProduct}</Text>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            {[
              { placeholder: c.nameRequired, value: name, onChange: setName, keyboard: 'default' as const },
              { placeholder: c.descOptional, value: description, onChange: setDescription, keyboard: 'default' as const },
              { placeholder: c.priceRequired, value: price, onChange: setPrice, keyboard: 'decimal-pad' as const },
              { placeholder: c.currencyCode, value: currency, onChange: setCurrency, keyboard: 'default' as const },
              { placeholder: c.totalSessions, value: totalSessions, onChange: setTotalSessions, keyboard: 'number-pad' as const },
              { placeholder: c.validityDays, value: validityDays, onChange: setValidityDays, keyboard: 'number-pad' as const },
            ].map((f, i) => (
              <TextInput
                key={i}
                placeholder={f.placeholder}
                placeholderTextColor={PALETTE.mutedText}
                value={f.value}
                onChangeText={f.onChange}
                keyboardType={f.keyboard}
                autoCapitalize={f.keyboard === 'default' && f.placeholder.includes('통화') ? 'characters' : 'none'}
                style={styles.input}
              />
            ))}
            <Pressable style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleCreate} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>{c.saveProduct}</Text>}
            </Pressable>
            <Pressable style={styles.cancelBtn} onPress={() => { setModalVisible(false); setError(null); }}>
              <Text style={styles.cancelBtnText}>{c.cancel}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: PALETTE.page },
  scroll: { paddingHorizontal: 22, paddingTop: 20, paddingBottom: 120 },

  // 헤더
  header: { marginBottom: 24 },
  eyebrow: { fontSize: 13, color: PALETTE.accent, fontStyle: 'italic', marginBottom: 2 },
  title: { fontSize: 30, fontWeight: '600', color: PALETTE.text, letterSpacing: -0.3 },
  subtitle: { fontSize: 13.5, color: PALETTE.mutedText, marginTop: 4 },

  // 카드
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
  },
  cardRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  cardName: { fontSize: 15.5, fontWeight: '600', color: PALETTE.text },
  cardDesc: { fontSize: 12.5, color: PALETTE.mutedText, marginTop: 2 },
  cardPrice: { fontSize: 21, fontWeight: '600', color: PALETTE.primaryDark, fontFamily: 'serif' },

  // 배지
  pillRow: { flexDirection: 'row', gap: 7, flexWrap: 'wrap' },
  pill: { paddingHorizontal: 11, paddingVertical: 5, borderRadius: 999 },
  pillText: { fontSize: 11.5, fontWeight: '600' },
  pillGreen: { backgroundColor: PALETTE.greenSoft },
  pillTextGreen: { color: PALETTE.primaryDark },
  pillPeach: { backgroundColor: PALETTE.accentSoft },
  pillTextPeach: { color: '#E08B52' },
  pillGrey: { backgroundColor: '#F1EBE3' },
  pillTextGrey: { color: PALETTE.mutedText },

  // FAB
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

  // 빈 상태
  emptyCard: {
    backgroundColor: PALETTE.card,
    borderWidth: 1,
    borderColor: PALETTE.border,
    borderRadius: 22,
    padding: 40,
    alignItems: 'center',
  },
  emptyText: { color: PALETTE.mutedText, fontSize: 14 },

  // 에러
  errorText: { color: PALETTE.dangerText, fontSize: 13, marginBottom: 8 },

  // 모달
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
