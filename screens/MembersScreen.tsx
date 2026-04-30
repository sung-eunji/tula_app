import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import CalendarDatePickerModal from '@/components/CalendarDatePickerModal';
import { PALETTE } from '@/constants/theme';
import {
  createMember,
  createMembership,
  deleteMembership,
  fetchMembers,
  fetchMemberships,
  fetchProducts,
  updateMember,
} from '@/services/supabase';
import type { AppLanguage, Member, Membership, Product, User } from '@/types';

interface MembersScreenProps {
  user: User;
  language: AppLanguage;
}

const COPY: Record<AppLanguage, Record<string, string>> = {
  ko: {
    loadError: '회원 데이터를 불러오지 못했습니다.',
    requiredName: '회원 이름은 필수입니다.',
    createError: '회원 추가에 실패했습니다.',
    updateError: '회원 수정에 실패했습니다.',
    selectMemberProduct: '회원과 상품을 먼저 선택해주세요.',
    productNotFound: '선택한 상품 정보를 찾지 못했습니다.',
    invalidStartDate: '시작일 형식이 올바르지 않습니다. YYYY-MM-DD 형식으로 입력해주세요.',
    assignError: '회원권 부여에 실패했습니다.',
    deleteError: '회원권 삭제에 실패했습니다.',
    title: '회원 관리',
    subtitle: '회원 등록, 상품권 부여, 남은 횟수/만료일 확인이 가능합니다.',
    addMember: '회원 추가',
    editMember: '회원 정보 수정',
    nameRequired: '이름 (필수)',
    emailOptional: '이메일 (선택)',
    phoneOptional: '전화번호 (선택)',
    noteOptional: '메모 (선택)',
    saving: '저장 중...',
    saveMember: '회원 저장',
    saveMemberEdit: '회원 수정 저장',
    cancelEdit: '수정 취소',
    assignMembership: '회원권 부여',
    step1: '1) 회원 선택',
    step2: '2) 상품 선택',
    startDate: '시작일 (YYYY-MM-DD)',
    selectDate: '날짜 선택',
    cancel: '취소',
    edit: '수정',
    weekdays: '일,월,화,수,목,금,토',
    processing: '처리 중...',
    assignToMember: '선택 회원에게 상품권 부여',
    memberStatus: '회원 현황',
    noMembers: '등록된 회원이 없습니다.',
    noMembership: '보유 회원권 없음',
    product: '상품',
    remainingSessions: '남은횟수',
    unlimited: '무제한',
    expires: '만료',
    none: '없음',
    deleting: '삭제 중...',
    delete: '삭제',
  },
  en: {
    loadError: 'Failed to load member data.',
    requiredName: 'Member name is required.',
    createError: 'Failed to add member.',
    updateError: 'Failed to update member.',
    selectMemberProduct: 'Please select a member and a product first.',
    productNotFound: 'Could not find selected product.',
    invalidStartDate: 'Invalid start date format. Please use YYYY-MM-DD.',
    assignError: 'Failed to assign membership.',
    deleteError: 'Failed to delete membership.',
    title: 'Member Management',
    subtitle: 'Register members, assign passes, and track remaining sessions/expiry.',
    addMember: 'Add Member',
    editMember: 'Edit Member',
    nameRequired: 'Name (required)',
    emailOptional: 'Email (optional)',
    phoneOptional: 'Phone (optional)',
    noteOptional: 'Note (optional)',
    saving: 'Saving...',
    saveMember: 'Save Member',
    saveMemberEdit: 'Save member changes',
    cancelEdit: 'Cancel edit',
    assignMembership: 'Assign Membership',
    step1: '1) Select member',
    step2: '2) Select product',
    startDate: 'Start date (YYYY-MM-DD)',
    selectDate: 'Select date',
    cancel: 'Cancel',
    edit: 'Edit',
    weekdays: 'Sun,Mon,Tue,Wed,Thu,Fri,Sat',
    processing: 'Processing...',
    assignToMember: 'Assign selected product to member',
    memberStatus: 'Member Status',
    noMembers: 'No members registered.',
    noMembership: 'No memberships',
    product: 'Product',
    remainingSessions: 'Remaining',
    unlimited: 'Unlimited',
    expires: 'Expires',
    none: 'None',
    deleting: 'Deleting...',
    delete: 'Delete',
  },
  fr: {
    loadError: 'Impossible de charger les donnees des membres.',
    requiredName: 'Le nom du membre est obligatoire.',
    createError: "Echec de l'ajout du membre.",
    updateError: 'Echec de la modification du membre.',
    selectMemberProduct: "Veuillez d'abord selectionner un membre et un produit.",
    productNotFound: 'Produit selectionne introuvable.',
    invalidStartDate: 'Format de date invalide. Utilisez YYYY-MM-DD.',
    assignError: "Echec de l'attribution de l'abonnement.",
    deleteError: "Echec de la suppression de l'abonnement.",
    title: 'Gestion des membres',
    subtitle: "Inscrivez des membres, attribuez des forfaits et suivez les seances restantes/expiration.",
    addMember: 'Ajouter un membre',
    editMember: 'Modifier le membre',
    nameRequired: 'Nom (obligatoire)',
    emailOptional: 'Email (optionnel)',
    phoneOptional: 'Telephone (optionnel)',
    noteOptional: 'Note (optionnel)',
    saving: 'Enregistrement...',
    saveMember: 'Enregistrer le membre',
    saveMemberEdit: 'Enregistrer les modifications',
    cancelEdit: 'Annuler la modification',
    assignMembership: 'Attribuer un abonnement',
    step1: '1) Selectionner un membre',
    step2: '2) Selectionner un produit',
    startDate: 'Date de debut (YYYY-MM-DD)',
    selectDate: 'Choisir une date',
    cancel: 'Annuler',
    edit: 'Modifier',
    weekdays: 'Dim,Lun,Mar,Mer,Jeu,Ven,Sam',
    processing: 'Traitement...',
    assignToMember: 'Attribuer le produit selectionne au membre',
    memberStatus: 'Etat des membres',
    noMembers: 'Aucun membre enregistre.',
    noMembership: 'Aucun abonnement',
    product: 'Produit',
    remainingSessions: 'Restantes',
    unlimited: 'Illimite',
    expires: 'Expire',
    none: 'Aucun',
    deleting: 'Suppression...',
    delete: 'Supprimer',
  },
};

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message) {
      return message;
    }
  }
  return fallback;
}

function isValidDateString(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
}

export default function MembersScreen({ user, language }: MembersScreenProps) {
  const c = COPY[language];
  const scrollViewRef = useRef<ScrollView>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);

  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(getToday());
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [deletingMembershipId, setDeletingMembershipId] = useState<string | null>(null);
  const [deleteMembershipErrorById, setDeleteMembershipErrorById] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [memberRows, membershipRows, productRows] = await Promise.all([
        fetchMembers(),
        fetchMemberships(),
        fetchProducts(),
      ]);
      setMembers(memberRows.filter((item) => item.user_id === user.id));
      setMemberships(membershipRows.filter((item) => item.user_id === user.id));
      setProducts(productRows.filter((item) => item.user_id === user.id && item.is_active));
    } catch (e) {
      setError(getErrorMessage(e, c.loadError));
    } finally {
      setLoading(false);
    }
  }, [c.loadError, user.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const resetMemberForm = () => {
    setEditingMemberId(null);
    setFullName('');
    setEmail('');
    setPhone('');
    setNotes('');
  };

  const handleSaveMember = async () => {
    const trimmedFullName = fullName.trim();
    if (!trimmedFullName) {
      setError(c.requiredName);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (editingMemberId) {
        await updateMember({
          memberId: editingMemberId,
          userId: user.id,
          fullName: trimmedFullName,
          email: email || undefined,
          phone: phone || undefined,
          notes: notes || undefined,
        });
      } else {
        await createMember({
          userId: user.id,
          fullName: trimmedFullName,
          email: email || undefined,
          phone: phone || undefined,
          notes: notes || undefined,
        });
      }
      resetMemberForm();
      await load();
    } catch (e) {
      setError(getErrorMessage(e, editingMemberId ? c.updateError : c.createError));
    } finally {
      setSaving(false);
    }
  };

  const handleAssignMembership = async () => {
    if (!selectedMemberId || !selectedProductId) {
      setError(c.selectMemberProduct);
      return;
    }
    const selectedProduct = productById.get(selectedProductId);
    if (!selectedProduct) {
      setError(c.productNotFound);
      return;
    }
    if (!isValidDateString(startDate)) {
      setError(c.invalidStartDate);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await createMembership({
        userId: user.id,
        memberId: selectedMemberId,
        product: selectedProduct,
        startDate,
      });
      await load();
    } catch (e) {
      setError(getErrorMessage(e, c.assignError));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMembership = async (membership: Membership) => {
    setDeleteMembershipErrorById((prev) => {
      if (!prev[membership.id]) return prev;
      return { ...prev, [membership.id]: '' };
    });
    setDeletingMembershipId(membership.id);
    setError(null);
    try {
      await deleteMembership({
        membershipId: membership.id,
        userId: user.id,
      });
      setDeleteMembershipErrorById((prev) => {
        if (!prev[membership.id]) return prev;
        return { ...prev, [membership.id]: '' };
      });
      await load();
    } catch (e) {
      setDeleteMembershipErrorById((prev) => ({
        ...prev,
        [membership.id]: getErrorMessage(e, c.deleteError),
      }));
    } finally {
      setDeletingMembershipId(null);
    }
  };

  const startEditMember = (member: Member) => {
    setEditingMemberId(member.id);
    setFullName(member.full_name);
    setEmail(member.email ?? '');
    setPhone(member.phone ?? '');
    setNotes(member.notes ?? '');
    requestAnimationFrame(() => {
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: PALETTE.page }}>
      <ScrollView ref={scrollViewRef} contentContainerStyle={{ padding: 16, gap: 18 }}>
        <View>
          <Text style={{ fontSize: 18, fontWeight: '600', color: PALETTE.text }}>{c.title}</Text>
          <Text style={{ color: PALETTE.mutedText, marginTop: 4 }}>
            {c.subtitle}
          </Text>
        </View>

        <View style={{ gap: 8 }}>
          <Text style={{ fontWeight: '600', color: PALETTE.text }}>
            {editingMemberId ? c.editMember : c.addMember}
          </Text>
          <TextInput
            placeholder={c.nameRequired}
            value={fullName}
            onChangeText={setFullName}
            style={{ borderWidth: 1, borderColor: PALETTE.border, borderRadius: 12, padding: 8 }}
          />
          <TextInput
            placeholder={c.emailOptional}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            style={{ borderWidth: 1, borderColor: PALETTE.border, borderRadius: 12, padding: 8 }}
          />
          <TextInput
            placeholder={c.phoneOptional}
            value={phone}
            onChangeText={setPhone}
            style={{ borderWidth: 1, borderColor: PALETTE.border, borderRadius: 12, padding: 8 }}
          />
          <TextInput
            placeholder={c.noteOptional}
            value={notes}
            onChangeText={setNotes}
            style={{ borderWidth: 1, borderColor: PALETTE.border, borderRadius: 12, padding: 8 }}
          />
          <Pressable
            onPress={handleSaveMember}
            disabled={saving}
            style={{
              backgroundColor: PALETTE.primary,
              borderRadius: 12,
              paddingVertical: 12,
              alignItems: 'center',
              opacity: saving ? 0.6 : 1,
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '600' }}>
              {saving ? c.saving : editingMemberId ? c.saveMemberEdit : c.saveMember}
            </Text>
          </Pressable>
          {editingMemberId ? (
            <Pressable
              onPress={resetMemberForm}
              disabled={saving}
              style={{
                borderWidth: 1,
                borderColor: PALETTE.border,
                borderRadius: 12,
                paddingVertical: 12,
                alignItems: 'center',
                opacity: saving ? 0.6 : 1,
              }}
            >
              <Text style={{ color: PALETTE.text, fontWeight: '600' }}>{c.cancelEdit}</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={{ gap: 8 }}>
          <Text style={{ fontWeight: '600', color: PALETTE.text }}>{c.assignMembership}</Text>
          <Text style={{ color: PALETTE.mutedText }}>{c.step1}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {members.map((member) => {
              const active = selectedMemberId === member.id;
              return (
                <Text
                  key={member.id}
                  onPress={() => setSelectedMemberId(member.id)}
                  style={{
                    borderWidth: 1,
                    borderColor: active ? PALETTE.primary : PALETTE.border,
                    backgroundColor: active ? PALETTE.primary : PALETTE.card,
                    color: active ? '#fff' : PALETTE.text,
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 16,
                  }}
                >
                  {member.full_name}
                </Text>
              );
            })}
          </View>

          <Text style={{ color: PALETTE.mutedText }}>{c.step2}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {products.map((product) => {
              const active = selectedProductId === product.id;
              return (
                <Text
                  key={product.id}
                  onPress={() => setSelectedProductId(product.id)}
                  style={{
                    borderWidth: 1,
                    borderColor: active ? PALETTE.primary : PALETTE.border,
                    backgroundColor: active ? PALETTE.primary : PALETTE.card,
                    color: active ? '#fff' : PALETTE.text,
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 16,
                  }}
                >
                  {product.name}
                </Text>
              );
            })}
          </View>
          <Pressable
            onPress={() => setShowStartDatePicker(true)}
            style={{ borderWidth: 1, borderColor: PALETTE.border, borderRadius: 12, padding: 8 }}
          >
            <Text style={{ color: startDate ? PALETTE.text : PALETTE.mutedText }}>
              {startDate || c.selectDate}
            </Text>
          </Pressable>
          <Pressable
            onPress={handleAssignMembership}
            disabled={saving}
            style={{
              backgroundColor: PALETTE.primary,
              borderRadius: 12,
              paddingVertical: 12,
              alignItems: 'center',
              opacity: saving ? 0.6 : 1,
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '600' }}>{saving ? c.processing : c.assignToMember}</Text>
          </Pressable>
        </View>

        {error ? <Text style={{ color: PALETTE.dangerText }}>{error}</Text> : null}
        {loading ? <ActivityIndicator color={PALETTE.primary} /> : null}

        <View style={{ gap: 8 }}>
          <Text style={{ fontWeight: '600', color: PALETTE.text }}>{c.memberStatus}</Text>
          {!loading && members.length === 0 ? <Text style={{ color: PALETTE.mutedText }}>{c.noMembers}</Text> : null}

          {members.map((member) => {
            const myMemberships = memberships.filter(
              (m) => m.member_id === member.id && m.status !== 'cancelled',
            );
            return (
              <View key={member.id} style={styles.memberCard}>
                <View style={styles.memberCardHeader}>
                  <Text style={styles.memberCardTitle}>{member.full_name}</Text>
                  <Pressable onPress={() => startEditMember(member)} hitSlop={8}>
                    <Text style={{ color: PALETTE.primary, paddingVertical: 4 }}>{c.edit}</Text>
                  </Pressable>
                </View>
                <Text style={styles.memberCardMeta}>
                  {member.email || '-'} / {member.phone || '-'}
                </Text>
                {member.notes ? (
                  <Text style={styles.memberCardMeta}>{member.notes}</Text>
                ) : null}
                {myMemberships.length === 0 ? (
                  <Text style={styles.memberCardMeta}>{c.noMembership}</Text>
                ) : (
                  myMemberships.map((m) => {
                    const product = productById.get(m.product_id);
                    const isDeleting = deletingMembershipId === m.id;
                    const deleteError = deleteMembershipErrorById[m.id];
                    return (
                      <View key={m.id} style={styles.membershipCard}>
                        <View style={styles.membershipCardHeader}>
                          <Text style={styles.membershipCardText}>
                            {product?.name ?? c.product} · {c.remainingSessions} {m.remaining_sessions ?? c.unlimited} · {c.expires}{' '}
                            {m.end_date ?? c.none}
                          </Text>
                          <Pressable
                            onPress={() => {
                              void handleDeleteMembership(m);
                            }}
                            hitSlop={8}
                            disabled={isDeleting}
                            style={{
                              backgroundColor: isDeleting ? PALETTE.mutedBar : PALETTE.primary,
                              borderRadius: 6,
                              paddingHorizontal: 10,
                              paddingVertical: 6,
                            }}
                          >
                            <Text style={{ color: '#fff', fontWeight: '600', fontSize: 12 }}>
                              {isDeleting ? c.deleting : c.delete}
                            </Text>
                          </Pressable>
                        </View>
                        {deleteError ? (
                          <Text style={{ color: PALETTE.dangerText, fontSize: 12 }}>{deleteError}</Text>
                        ) : null}
                      </View>
                    );
                  })
                )}
              </View>
            );
          })}
        </View>

        <CalendarDatePickerModal
          visible={showStartDatePicker}
          title={c.selectDate}
          cancelLabel={c.cancel}
          value={startDate}
          weekdays={c.weekdays.split(',')}
          onClose={() => setShowStartDatePicker(false)}
          onSelect={(date) => {
            setStartDate(date);
            setShowStartDatePicker(false);
          }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  memberCard: {
    borderWidth: 1,
    borderColor: PALETTE.border,
    borderRadius: 14,
    backgroundColor: PALETTE.card,
    padding: 12,
    gap: 6,
  },
  memberCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  memberCardTitle: {
    flex: 1,
    marginRight: 12,
    fontWeight: '600',
    color: PALETTE.text,
  },
  memberCardMeta: {
    color: PALETTE.mutedText,
    lineHeight: 20,
  },
  membershipCard: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: PALETTE.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 6,
    backgroundColor: '#FFFFFF',
  },
  membershipCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  membershipCardText: {
    flex: 1,
    marginRight: 8,
    color: PALETTE.text,
    lineHeight: 20,
  },
});

