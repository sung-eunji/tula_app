import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
    eyebrow: 'Members',
    title: '회원 관리',
    loadError: '회원 데이터를 불러오지 못했습니다.',
    requiredName: '회원 이름은 필수입니다.',
    createError: '회원 추가에 실패했습니다.',
    updateError: '회원 수정에 실패했습니다.',
    selectMemberProduct: '회원과 상품을 먼저 선택해주세요.',
    productNotFound: '선택한 상품 정보를 찾지 못했습니다.',
    invalidStartDate: '시작일 형식이 올바르지 않습니다. YYYY-MM-DD 형식으로 입력해주세요.',
    assignError: '회원권 부여에 실패했습니다.',
    deleteError: '회원권 삭제에 실패했습니다.',
    addMember: '회원 추가',
    editMember: '회원 정보 수정',
    nameRequired: '이름 (필수)',
    emailOptional: '이메일 (선택)',
    phoneOptional: '전화번호 (선택)',
    noteOptional: '메모 (선택)',
    saving: '저장 중...',
    saveMember: '회원 저장',
    saveMemberEdit: '수정 저장',
    cancelEdit: '취소',
    cancel: '취소',
    edit: '수정',
    assignMembership: '회원권 부여',
    step1: '회원 선택',
    step2: '상품 선택',
    startDate: '시작일 (YYYY-MM-DD)',
    selectDate: '날짜 선택',
    weekdays: '일,월,화,수,목,금,토',
    processing: '처리 중...',
    assignToMember: '회원권 부여',
    noMembers: '등록된 회원이 없어요',
    noMembership: '보유 회원권 없음',
    unlimited: '무제한',
    expires: '~',
    none: '없음',
    deleting: '삭제 중...',
    delete: '삭제',
    membersCount: '명의 수련생 · 회원권 현황',
  },
  en: {
    eyebrow: 'Members',
    title: 'Members',
    loadError: 'Failed to load member data.',
    requiredName: 'Member name is required.',
    createError: 'Failed to add member.',
    updateError: 'Failed to update member.',
    selectMemberProduct: 'Please select a member and a product first.',
    productNotFound: 'Could not find selected product.',
    invalidStartDate: 'Invalid start date format. Please use YYYY-MM-DD.',
    assignError: 'Failed to assign membership.',
    deleteError: 'Failed to delete membership.',
    addMember: 'Add member',
    editMember: 'Edit member',
    nameRequired: 'Name (required)',
    emailOptional: 'Email (optional)',
    phoneOptional: 'Phone (optional)',
    noteOptional: 'Note (optional)',
    saving: 'Saving...',
    saveMember: 'Save member',
    saveMemberEdit: 'Save changes',
    cancelEdit: 'Cancel',
    cancel: 'Cancel',
    edit: 'Edit',
    assignMembership: 'Assign membership',
    step1: 'Select member',
    step2: 'Select product',
    startDate: 'Start date (YYYY-MM-DD)',
    selectDate: 'Select date',
    weekdays: 'Sun,Mon,Tue,Wed,Thu,Fri,Sat',
    processing: 'Processing...',
    assignToMember: 'Assign membership',
    noMembers: 'No members yet',
    noMembership: 'No memberships',
    unlimited: 'Unlimited',
    expires: '~',
    none: 'None',
    deleting: 'Deleting...',
    delete: 'Delete',
    membersCount: ' members · membership status',
  },
  fr: {
    eyebrow: 'Members',
    title: 'Membres',
    loadError: 'Impossible de charger les données des membres.',
    requiredName: 'Le nom du membre est obligatoire.',
    createError: "Échec de l'ajout du membre.",
    updateError: 'Échec de la modification du membre.',
    selectMemberProduct: "Veuillez d'abord sélectionner un membre et un produit.",
    productNotFound: 'Produit sélectionné introuvable.',
    invalidStartDate: 'Format de date invalide. Utilisez YYYY-MM-DD.',
    assignError: "Échec de l'attribution de l'abonnement.",
    deleteError: "Échec de la suppression de l'abonnement.",
    addMember: 'Ajouter un membre',
    editMember: 'Modifier le membre',
    nameRequired: 'Nom (obligatoire)',
    emailOptional: 'Email (optionnel)',
    phoneOptional: 'Téléphone (optionnel)',
    noteOptional: 'Note (optionnel)',
    saving: 'Enregistrement...',
    saveMember: 'Enregistrer',
    saveMemberEdit: 'Sauvegarder',
    cancelEdit: 'Annuler',
    cancel: 'Annuler',
    edit: 'Modifier',
    assignMembership: 'Attribuer un abonnement',
    step1: 'Sélectionner un membre',
    step2: 'Sélectionner un produit',
    startDate: 'Date de début (YYYY-MM-DD)',
    selectDate: 'Choisir une date',
    weekdays: 'Dim,Lun,Mar,Mer,Jeu,Ven,Sam',
    processing: 'Traitement...',
    assignToMember: 'Attribuer',
    noMembers: 'Aucun membre',
    noMembership: 'Aucun abonnement',
    unlimited: 'Illimité',
    expires: '~',
    none: 'Aucun',
    deleting: 'Suppression...',
    delete: 'Supprimer',
    membersCount: ' membres · abonnements',
  },
};

const AVATAR_COLORS = [PALETTE.primary, '#E08B52', '#6B8F71', '#8B6B8F', '#5B7FA6'];

function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitial(name: string) {
  return name.trim().charAt(0).toUpperCase();
}

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  if (error && typeof error === 'object' && 'message' in error) {
    const msg = (error as { message?: unknown }).message;
    if (typeof msg === 'string' && msg) return msg;
  }
  return fallback;
}

function isValidDateString(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return !Number.isNaN(new Date(value).getTime());
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
  const [memberModalVisible, setMemberModalVisible] = useState(false);
  const [assignModalVisible, setAssignModalVisible] = useState(false);

  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(getToday());
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [deletingMembershipId, setDeletingMembershipId] = useState<string | null>(null);
  const [deleteMembershipErrorById, setDeleteMembershipErrorById] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [memberRows, membershipRows, productRows] = await Promise.all([fetchMembers(), fetchMemberships(), fetchProducts()]);
      setMembers(memberRows.filter((item) => item.user_id === user.id));
      setMemberships(membershipRows.filter((item) => item.user_id === user.id));
      setProducts(productRows.filter((item) => item.user_id === user.id && item.is_active));
    } catch (e) {
      setError(getErrorMessage(e, c.loadError));
    } finally {
      setLoading(false);
    }
  }, [c.loadError, user.id]);

  useEffect(() => { void load(); }, [load]);

  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const resetMemberForm = () => {
    setEditingMemberId(null); setFullName(''); setEmail(''); setPhone(''); setNotes('');
  };

  const handleSaveMember = async () => {
    const trimmedFullName = fullName.trim();
    if (!trimmedFullName) { setError(c.requiredName); return; }
    setSaving(true); setError(null);
    try {
      if (editingMemberId) {
        await updateMember({ memberId: editingMemberId, userId: user.id, fullName: trimmedFullName, email: email || undefined, phone: phone || undefined, notes: notes || undefined });
      } else {
        await createMember({ userId: user.id, fullName: trimmedFullName, email: email || undefined, phone: phone || undefined, notes: notes || undefined });
      }
      resetMemberForm(); setMemberModalVisible(false); await load();
    } catch (e) {
      setError(getErrorMessage(e, editingMemberId ? c.updateError : c.createError));
    } finally {
      setSaving(false);
    }
  };

  const handleAssignMembership = async () => {
    if (!selectedMemberId || !selectedProductId) { setError(c.selectMemberProduct); return; }
    const selectedProduct = productById.get(selectedProductId);
    if (!selectedProduct) { setError(c.productNotFound); return; }
    if (!isValidDateString(startDate)) { setError(c.invalidStartDate); return; }
    setSaving(true); setError(null);
    try {
      await createMembership({ userId: user.id, memberId: selectedMemberId, product: selectedProduct, startDate });
      setAssignModalVisible(false); await load();
    } catch (e) {
      setError(getErrorMessage(e, c.assignError));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMembership = async (membership: Membership) => {
    setDeletingMembershipId(membership.id); setError(null);
    try {
      await deleteMembership({ membershipId: membership.id, userId: user.id });
      setDeleteMembershipErrorById((prev) => ({ ...prev, [membership.id]: '' }));
      await load();
    } catch (e) {
      setDeleteMembershipErrorById((prev) => ({ ...prev, [membership.id]: getErrorMessage(e, c.deleteError) }));
    } finally {
      setDeletingMembershipId(null);
    }
  };

  const startEditMember = (member: Member) => {
    setEditingMemberId(member.id); setFullName(member.full_name);
    setEmail(member.email ?? ''); setPhone(member.phone ?? ''); setNotes(member.notes ?? '');
    setMemberModalVisible(true);
  };

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView ref={scrollViewRef} contentContainerStyle={s.scroll}>
        {/* 헤더 */}
        <View style={s.header}>
          <Text style={s.eyebrow}>{c.eyebrow}</Text>
          <Text style={s.title}>{c.title}</Text>
          <Text style={s.subtitle}>{members.length}{c.membersCount}</Text>
        </View>

        {loading && <ActivityIndicator color={PALETTE.primary} style={{ marginTop: 24 }} />}
        {error && <Text style={s.errorText}>{error}</Text>}

        {/* 회원 카드 목록 */}
        {!loading && members.length === 0 && (
          <View style={s.emptyCard}><Text style={s.emptyText}>{c.noMembers}</Text></View>
        )}

        <View style={s.cardList}>
          {members.map((member) => {
            const myMemberships = memberships.filter((m) => m.member_id === member.id && m.status !== 'cancelled');
            const activeMembership = myMemberships[0];
            const product = activeMembership ? productById.get(activeMembership.product_id) : null;
            const remaining = activeMembership?.remaining_sessions;
            const total = product?.total_sessions;
            const pct = total && remaining !== null && remaining !== undefined ? Math.round((remaining / total) * 100) : null;
            const isLow = remaining !== null && remaining !== undefined && remaining <= 2;

            return (
              <View key={member.id} style={s.card}>
                <View style={s.cardRow}>
                  {/* 아바타 */}
                  <View style={[s.avatar, { backgroundColor: getAvatarColor(member.full_name) }]}>
                    <Text style={s.avatarText}>{getInitial(member.full_name)}</Text>
                  </View>
                  {/* 정보 */}
                  <View style={{ flex: 1 }}>
                    <View style={s.cardBetween}>
                      <Text style={s.cardName}>{member.full_name}</Text>
                      {activeMembership ? (
                        <View style={[s.pill, isLow ? s.pillPeach : s.pillGreen]}>
                          <Text style={[s.pillText, isLow ? s.pillTextPeach : s.pillTextGreen]}>
                            {remaining !== null && remaining !== undefined ? `${remaining}회 남음` : c.unlimited}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={s.cardMeta}>
                      {product ? `${product.name} · ${c.expires}${activeMembership?.end_date ?? c.none}` : c.noMembership}
                    </Text>
                    {/* 진행 바 */}
                    {pct !== null && (
                      <View style={s.progressBar}>
                        <View style={[s.progressFill, { width: `${pct}%` }]} />
                      </View>
                    )}
                  </View>
                  {/* 수정 버튼 */}
                  <Pressable style={s.editBtn} onPress={() => startEditMember(member)}>
                    <Text style={s.editBtnText}>{c.edit}</Text>
                  </Pressable>
                </View>
                {/* 회원권 삭제 */}
                {myMemberships.map((m) => {
                  const isDeleting = deletingMembershipId === m.id;
                  const delErr = deleteMembershipErrorById[m.id];
                  return (
                    <View key={m.id}>
                      {delErr ? <Text style={s.errorText}>{delErr}</Text> : null}
                      <Pressable
                        style={[s.deleteBtn, isDeleting && { opacity: 0.5 }]}
                        disabled={isDeleting}
                        onPress={() => void handleDeleteMembership(m)}
                      >
                        <Text style={s.deleteBtnText}>{isDeleting ? c.deleting : c.delete}</Text>
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* FAB — 회원 추가 */}
      <Pressable style={s.fab} onPress={() => { resetMemberForm(); setMemberModalVisible(true); }}>
        <Text style={s.fabText}>+</Text>
      </Pressable>

      {/* 회원권 부여 버튼 (우하단 위) */}
      <Pressable style={s.assignBtn} onPress={() => setAssignModalVisible(true)}>
        <Text style={s.assignBtnText}>🎫</Text>
      </Pressable>

      {/* 회원 추가/수정 모달 */}
      <Modal visible={memberModalVisible} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <Text style={s.modalTitle}>{editingMemberId ? c.editMember : c.addMember}</Text>
            {error ? <Text style={s.errorText}>{error}</Text> : null}
            {[
              { ph: c.nameRequired, val: fullName, set: setFullName, cap: 'words' as const },
              { ph: c.emailOptional, val: email, set: setEmail, cap: 'none' as const },
              { ph: c.phoneOptional, val: phone, set: setPhone, cap: 'none' as const },
              { ph: c.noteOptional, val: notes, set: setNotes, cap: 'sentences' as const },
            ].map((f, i) => (
              <TextInput key={i} placeholder={f.ph} placeholderTextColor={PALETTE.mutedText}
                value={f.val} onChangeText={f.set} autoCapitalize={f.cap} style={s.input} />
            ))}
            <Pressable style={[s.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSaveMember} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.saveBtnText}>{editingMemberId ? c.saveMemberEdit : c.saveMember}</Text>}
            </Pressable>
            <Pressable style={s.cancelBtn} onPress={() => { setMemberModalVisible(false); resetMemberForm(); setError(null); }}>
              <Text style={s.cancelBtnText}>{c.cancel}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* 회원권 부여 모달 */}
      <Modal visible={assignModalVisible} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <ScrollView style={{ width: '100%' }} contentContainerStyle={s.modalSheet}>
            <Text style={s.modalTitle}>{c.assignMembership}</Text>
            {error ? <Text style={s.errorText}>{error}</Text> : null}

            <Text style={s.sectionLabel}>{c.step1}</Text>
            <View style={s.chipRow}>
              {members.map((m) => {
                const active = selectedMemberId === m.id;
                return (
                  <Pressable key={m.id} style={[s.chip, active && s.chipActive]} onPress={() => setSelectedMemberId(m.id)}>
                    <Text style={[s.chipText, active && s.chipTextActive]}>{m.full_name}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={s.sectionLabel}>{c.step2}</Text>
            <View style={s.chipRow}>
              {products.map((p) => {
                const active = selectedProductId === p.id;
                return (
                  <Pressable key={p.id} style={[s.chip, active && s.chipActive]} onPress={() => setSelectedProductId(p.id)}>
                    <Text style={[s.chipText, active && s.chipTextActive]}>{p.name}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={s.sectionLabel}>{c.startDate}</Text>
            <Pressable style={s.datePicker} onPress={() => setShowStartDatePicker(true)}>
              <Text style={{ color: startDate ? PALETTE.text : PALETTE.mutedText }}>{startDate || c.selectDate}</Text>
            </Pressable>

            <Pressable style={[s.saveBtn, saving && { opacity: 0.6 }]} onPress={handleAssignMembership} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.saveBtnText}>{c.assignToMember}</Text>}
            </Pressable>
            <Pressable style={s.cancelBtn} onPress={() => { setAssignModalVisible(false); setError(null); }}>
              <Text style={s.cancelBtnText}>{c.cancel}</Text>
            </Pressable>
          </ScrollView>
        </View>
      </Modal>

      <CalendarDatePickerModal
        visible={showStartDatePicker} title={c.selectDate} cancelLabel={c.cancel}
        value={startDate} weekdays={c.weekdays.split(',')}
        onClose={() => setShowStartDatePicker(false)}
        onSelect={(date) => { setStartDate(date); setShowStartDatePicker(false); }}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: PALETTE.page },
  scroll: { paddingHorizontal: 22, paddingTop: 20, paddingBottom: 140 },
  header: { marginBottom: 24 },
  eyebrow: { fontSize: 13, color: PALETTE.accent, fontStyle: 'italic', marginBottom: 2 },
  title: { fontSize: 30, fontWeight: '600', color: PALETTE.text, letterSpacing: -0.3 },
  subtitle: { fontSize: 13.5, color: PALETTE.mutedText, marginTop: 4 },
  errorText: { color: PALETTE.dangerText, fontSize: 13, marginBottom: 8 },

  cardList: { gap: 12 },
  card: {
    backgroundColor: PALETTE.card, borderWidth: 1, borderColor: PALETTE.border,
    borderRadius: 22, padding: 18,
    shadowColor: PALETTE.ink, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2,
    gap: 10,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  avatar: { width: 46, height: 46, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  cardName: { fontSize: 15, fontWeight: '600', color: PALETTE.text, flex: 1 },
  cardMeta: { fontSize: 12.5, color: PALETTE.mutedText, marginTop: 3 },
  progressBar: { height: 7, borderRadius: 999, backgroundColor: '#F0E8DE', marginTop: 8, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 999, backgroundColor: PALETTE.accent },
  editBtn: { backgroundColor: PALETTE.card, borderWidth: 1, borderColor: PALETTE.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  editBtnText: { fontSize: 12, fontWeight: '600', color: PALETTE.text },
  deleteBtn: { alignSelf: 'flex-end', backgroundColor: PALETTE.greenSoft, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  deleteBtnText: { fontSize: 12, fontWeight: '600', color: PALETTE.dangerText },

  pill: { paddingHorizontal: 11, paddingVertical: 5, borderRadius: 999 },
  pillText: { fontSize: 11.5, fontWeight: '600' },
  pillGreen: { backgroundColor: PALETTE.greenSoft },
  pillTextGreen: { color: PALETTE.primaryDark },
  pillPeach: { backgroundColor: PALETTE.accentSoft },
  pillTextPeach: { color: '#E08B52' },

  emptyCard: { backgroundColor: PALETTE.card, borderWidth: 1, borderColor: PALETTE.border, borderRadius: 22, padding: 40, alignItems: 'center' },
  emptyText: { color: PALETTE.mutedText, fontSize: 14 },

  fab: {
    position: 'absolute', right: 20, bottom: 100, width: 58, height: 58,
    borderRadius: 20, backgroundColor: PALETTE.primary, alignItems: 'center', justifyContent: 'center',
    shadowColor: PALETTE.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.45, shadowRadius: 14, elevation: 6,
  },
  fabText: { color: '#fff', fontSize: 28, lineHeight: 32 },
  assignBtn: {
    position: 'absolute', right: 88, bottom: 100, width: 58, height: 58,
    borderRadius: 20, backgroundColor: PALETTE.card, borderWidth: 1, borderColor: PALETTE.border,
    alignItems: 'center', justifyContent: 'center', elevation: 3,
  },
  assignBtnText: { fontSize: 22 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(43,37,33,0.4)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: PALETTE.page, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 28, paddingBottom: 48, gap: 10 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: PALETTE.text, marginBottom: 4 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: PALETTE.border, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 13, fontSize: 15, color: PALETTE.text },
  saveBtn: { backgroundColor: PALETTE.primary, borderRadius: 16, paddingVertical: 15, alignItems: 'center', marginTop: 4 },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  cancelBtn: { alignItems: 'center', paddingVertical: 10 },
  cancelBtnText: { color: PALETTE.mutedText, fontSize: 14 },
  sectionLabel: { fontSize: 12, fontWeight: '600', color: PALETTE.mutedText, marginTop: 4 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderColor: PALETTE.border, backgroundColor: PALETTE.card, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
  chipActive: { backgroundColor: PALETTE.primary, borderColor: PALETTE.primary },
  chipText: { fontSize: 13, fontWeight: '600', color: PALETTE.text },
  chipTextActive: { color: '#fff' },
  datePicker: { backgroundColor: '#fff', borderWidth: 1, borderColor: PALETTE.border, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 13 },
});
