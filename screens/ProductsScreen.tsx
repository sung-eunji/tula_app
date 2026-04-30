import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { PALETTE } from '@/constants/theme';

import { createProduct, fetchProducts } from '@/services/supabase';
import type { AppLanguage, Product, User } from '@/types';

interface ProductsScreenProps {
  user: User;
  language: AppLanguage;
}

const COPY: Record<AppLanguage, Record<string, string>> = {
  ko: {
    loadError: '상품 목록을 불러오지 못했습니다.',
    required: '상품명과 가격은 필수입니다.',
    invalidPrice: '가격 형식이 올바르지 않습니다. 예: 300000 또는 300000.50',
    invalidTotalSessions: '총 횟수는 0 이상의 숫자여야 합니다.',
    invalidValidity: '유효기간 일수는 0 이상의 숫자여야 합니다.',
    rlsError: 'RLS 정책 때문에 저장이 거부되었습니다. products 테이블 policy를 확인해주세요.',
    createError: '상품 추가에 실패했습니다.',
    title: '상품 관리',
    subtitle: '선생님이 직접 상품을 등록하고 옵션(횟수/유효기간)을 선택할 수 있습니다.',
    addProduct: '상품 추가',
    nameRequired: '상품명 (필수)',
    descOptional: '설명 (선택)',
    priceRequired: '가격 (필수)',
    currencyCode: '통화 코드 (기본 EUR)',
    totalSessions: '총 횟수 (선택)',
    validityDays: '유효기간 일수 (선택)',
    saving: '저장 중...',
    saveProduct: '상품 저장',
    registered: '등록된 상품',
    none: '등록된 상품이 없습니다.',
    sessions: '횟수',
    unlimited: '무제한',
    validity: '유효기간',
    noLimit: '제한 없음',
  },
  en: {
    loadError: 'Failed to load products.',
    required: 'Product name and price are required.',
    invalidPrice: 'Invalid price format. Example: 300000 or 300000.50',
    invalidTotalSessions: 'Total sessions must be a number greater than or equal to 0.',
    invalidValidity: 'Validity days must be a number greater than or equal to 0.',
    rlsError: 'Save was blocked by RLS policy. Please check products table policy.',
    createError: 'Failed to add product.',
    title: 'Product Management',
    subtitle: 'Teachers can register products and set options (sessions/validity).',
    addProduct: 'Add Product',
    nameRequired: 'Product name (required)',
    descOptional: 'Description (optional)',
    priceRequired: 'Price (required)',
    currencyCode: 'Currency code (default EUR)',
    totalSessions: 'Total sessions (optional)',
    validityDays: 'Validity days (optional)',
    saving: 'Saving...',
    saveProduct: 'Save Product',
    registered: 'Registered Products',
    none: 'No products registered.',
    sessions: 'Sessions',
    unlimited: 'Unlimited',
    validity: 'Validity',
    noLimit: 'No limit',
  },
  fr: {
    loadError: 'Impossible de charger les produits.',
    required: 'Le nom du produit et le prix sont obligatoires.',
    invalidPrice: 'Format de prix invalide. Exemple: 300000 ou 300000.50',
    invalidTotalSessions: 'Le nombre total de seances doit etre superieur ou egal a 0.',
    invalidValidity: 'Les jours de validite doivent etre superieurs ou egaux a 0.',
    rlsError: 'Enregistrement bloque par la politique RLS. Verifiez la policy de la table products.',
    createError: "Echec de l'ajout du produit.",
    title: 'Gestion des produits',
    subtitle: 'Les professeurs peuvent enregistrer des produits et definir des options (seances/validite).',
    addProduct: 'Ajouter un produit',
    nameRequired: 'Nom du produit (obligatoire)',
    descOptional: 'Description (optionnel)',
    priceRequired: 'Prix (obligatoire)',
    currencyCode: 'Code devise (EUR par defaut)',
    totalSessions: 'Nombre total de seances (optionnel)',
    validityDays: 'Jours de validite (optionnel)',
    saving: 'Enregistrement...',
    saveProduct: 'Enregistrer le produit',
    registered: 'Produits enregistres',
    none: 'Aucun produit enregistre.',
    sessions: 'Seances',
    unlimited: 'Illimite',
    validity: 'Validite',
    noLimit: 'Sans limite',
  },
};

function formatPrice(value: number, currency: string) {
  return `${value.toLocaleString('ko-KR')} ${currency}`;
}

export default function ProductsScreen({ user, language }: ProductsScreenProps) {
  const c = COPY[language];
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    void load();
  }, [load]);

  const handleCreate = async () => {
    if (!name || !price) {
      setError(c.required);
      return;
    }

    const normalizedPrice = Number(price.replace(/,/g, '').trim());
    if (!Number.isFinite(normalizedPrice) || normalizedPrice <= 0) {
      setError(c.invalidPrice);
      return;
    }

    const parsedTotalSessions = totalSessions ? Number(totalSessions.trim()) : undefined;
    if (parsedTotalSessions !== undefined && (!Number.isFinite(parsedTotalSessions) || parsedTotalSessions < 0)) {
      setError(c.invalidTotalSessions);
      return;
    }

    const parsedValidityDays = validityDays ? Number(validityDays.trim()) : undefined;
    if (parsedValidityDays !== undefined && (!Number.isFinite(parsedValidityDays) || parsedValidityDays < 0)) {
      setError(c.invalidValidity);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await createProduct({
        userId: user.id,
        name,
        description: description || undefined,
        price: normalizedPrice,
        currency: currency || 'EUR',
        totalSessions: parsedTotalSessions,
        validityDays: parsedValidityDays,
      });
      setName('');
      setDescription('');
      setPrice('');
      setTotalSessions('');
      setValidityDays('');
      await load();
    } catch (e) {
      if (e && typeof e === 'object' && 'message' in e) {
        const message = String((e as { message?: string }).message ?? '');
        if (message.includes('row-level security') || message.includes('violates row-level security policy')) {
          setError(c.rlsError);
        } else {
          setError(message || c.createError);
        }
      } else {
        setError(c.createError);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: PALETTE.page }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        <View>
          <Text style={{ fontSize: 18, fontWeight: '600', color: PALETTE.text }}>{c.title}</Text>
          <Text style={{ color: PALETTE.mutedText, marginTop: 4 }}>
            {c.subtitle}
          </Text>
        </View>

        <View style={{ gap: 8 }}>
          <Text style={{ fontWeight: '600', color: PALETTE.text }}>{c.addProduct}</Text>
          <TextInput
            placeholder={c.nameRequired}
            value={name}
            onChangeText={setName}
            style={{ borderWidth: 1, borderColor: PALETTE.border, borderRadius: 12, padding: 8 }}
          />
          <TextInput
            placeholder={c.descOptional}
            value={description}
            onChangeText={setDescription}
            style={{ borderWidth: 1, borderColor: PALETTE.border, borderRadius: 12, padding: 8 }}
          />
          <TextInput
            placeholder={c.priceRequired}
            keyboardType="decimal-pad"
            value={price}
            onChangeText={setPrice}
            style={{ borderWidth: 1, borderColor: PALETTE.border, borderRadius: 12, padding: 8 }}
          />
          <TextInput
            placeholder={c.currencyCode}
            value={currency}
            onChangeText={setCurrency}
            autoCapitalize="characters"
            style={{ borderWidth: 1, borderColor: PALETTE.border, borderRadius: 12, padding: 8 }}
          />
          <TextInput
            placeholder={c.totalSessions}
            keyboardType="number-pad"
            value={totalSessions}
            onChangeText={setTotalSessions}
            style={{ borderWidth: 1, borderColor: PALETTE.border, borderRadius: 12, padding: 8 }}
          />
          <TextInput
            placeholder={c.validityDays}
            keyboardType="number-pad"
            value={validityDays}
            onChangeText={setValidityDays}
            style={{ borderWidth: 1, borderColor: PALETTE.border, borderRadius: 12, padding: 8 }}
          />
          <Pressable
            onPress={handleCreate}
            disabled={saving}
            style={({ pressed }) => ({
              backgroundColor: PALETTE.primary,
              borderRadius: 12,
              paddingVertical: 12,
              alignItems: 'center',
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <Text style={{ color: '#fff' }}>{saving ? c.saving : c.saveProduct}</Text>
          </Pressable>
        </View>

        {error ? <Text style={{ color: PALETTE.dangerText }}>{error}</Text> : null}

        <View style={{ gap: 8 }}>
          <Text style={{ fontWeight: '600', color: PALETTE.text }}>{c.registered}</Text>
          {loading ? <ActivityIndicator color={PALETTE.primary} /> : null}
          {!loading && products.length === 0 ? <Text style={{ color: PALETTE.mutedText }}>{c.none}</Text> : null}

          <View style={styles.productsGrid}>
            {products.map((product) => (
              <View key={product.id} style={styles.productCard}>
                <Text style={styles.productName}>{product.name}</Text>
                {product.description ? (
                  <Text style={styles.productDescription} numberOfLines={2}>
                    {product.description}
                  </Text>
                ) : null}
                <Text style={styles.productPrice}>{formatPrice(product.price, product.currency)}</Text>
                <Text style={styles.productMeta}>
                  {c.sessions}: {product.total_sessions ?? c.unlimited}
                </Text>
                <Text style={styles.productMeta}>
                  {c.validity}: {product.validity_days ?? c.noLimit}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
  },
  productCard: {
    width: '24%',
    minHeight: 132,
    padding: 12,
    borderWidth: 1,
    borderColor: PALETTE.border,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    gap: 4,
  },
  productName: {
    fontWeight: '700',
    color: PALETTE.text,
  },
  productDescription: {
    color: PALETTE.mutedText,
    fontSize: 12,
  },
  productPrice: {
    marginTop: 4,
    fontWeight: '600',
    color: PALETTE.text,
  },
  productMeta: {
    color: PALETTE.mutedText,
    fontSize: 12,
  },
});

