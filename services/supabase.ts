import 'react-native-url-polyfill/auto';

import { createClient } from '@supabase/supabase-js';

import type {
  Attendance,
  ClassSession,
  Member,
  Membership,
  Product,
  Sequence,
  SequencePose,
  SequenceWithPoses,
  User,
  UserGender,
  UserProfile,
} from '@/types';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // eslint-disable-next-line no-console
  console.warn(
    'Supabase env vars are missing. Check .env.local configuration.',
  );
}

export const supabase = createClient(supabaseUrl ?? '', supabaseAnonKey ?? '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

function normalizeGender(value: unknown): UserGender | null {
  if (value === 'female' || value === 'male' || value === 'other') {
    return value;
  }

  return null;
}

function buildProfilePayload(authUser: {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown>;
}) {
  const metadataNickname =
    typeof authUser.user_metadata?.nickname === 'string'
      ? authUser.user_metadata.nickname.trim()
      : '';
  const fallbackNickname =
    metadataNickname || authUser.email?.split('@')[0]?.trim() || 'tula-user';
  const gender = normalizeGender(authUser.user_metadata?.gender);

  return {
    id: authUser.id,
    email: authUser.email?.trim().toLowerCase() ?? null,
    nickname: fallbackNickname,
    full_name: fallbackNickname,
    gender,
  };
}

async function fetchProfileByUserId(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as UserProfile | null) ?? null;
}

async function ensureProfileForUser(authUser: {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown>;
}): Promise<UserProfile | null> {
  const existingProfile = await fetchProfileByUserId(authUser.id);
  if (existingProfile) {
    return existingProfile;
  }

  const { error } = await supabase.from('profiles').upsert(buildProfilePayload(authUser));
  if (error) {
    throw error;
  }

  return fetchProfileByUserId(authUser.id);
}

function toAppUser(authUser: { id: string; email?: string | null; user_metadata?: Record<string, unknown> }, profile: UserProfile | null): User {
  return {
    id: authUser.id,
    email: authUser.email ?? '',
    nickname: profile?.nickname ?? (typeof authUser.user_metadata?.nickname === 'string' ? authUser.user_metadata.nickname : null),
    gender: normalizeGender(profile?.gender) ?? normalizeGender(authUser.user_metadata?.gender),
  };
}

export async function isEmailAvailable(email: string): Promise<boolean> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) {
    return false;
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', normalizedEmail)
    .limit(1);

  if (error) {
    throw error;
  }

  return (data ?? []).length === 0;
}

export async function isNicknameAvailable(
  nickname: string,
  excludeUserId?: string,
): Promise<boolean> {
  const normalizedNickname = nickname.trim();
  if (!normalizedNickname) {
    return false;
  }

  let query = supabase
    .from('profiles')
    .select('id')
    .ilike('nickname', normalizedNickname)
    .limit(1);

  if (excludeUserId) {
    query = query.neq('id', excludeUserId);
  }

  const { data, error } = await query;
  if (error) {
    throw error;
  }

  return (data ?? []).length === 0;
}

export async function signUpWithEmail(input: {
  email: string;
  password: string;
  nickname: string;
  gender: UserGender;
}): Promise<User> {
  const normalizedEmail = input.email.trim().toLowerCase();
  const trimmedNickname = input.nickname.trim();

  const { data, error } = await supabase.auth.signUp({
    email: normalizedEmail,
    password: input.password,
    options: {
      data: {
        nickname: trimmedNickname,
        gender: input.gender,
      },
    },
  });

  if (error) {
    throw error;
  }

  if (!data.user?.id || !data.user.email) {
    throw new Error('회원가입 사용자 정보를 가져오지 못했습니다.');
  }

  const profilePayload = {
    id: data.user.id,
    email: normalizedEmail,
    nickname: trimmedNickname,
    full_name: trimmedNickname,
    gender: input.gender,
  };

  const { error: profileError } = await supabase.from('profiles').upsert(profilePayload);

  if (profileError) {
    const errorMessage = `${profileError.message ?? ''}`.toLowerCase();
    const isAuthTimingIssue =
      errorMessage.includes('row-level security') ||
      errorMessage.includes('permission denied') ||
      errorMessage.includes('jwt') ||
      errorMessage.includes('401');

    if (!data.session && isAuthTimingIssue) {
      return toAppUser(
        {
          ...data.user,
          user_metadata: {
            ...data.user.user_metadata,
            nickname: trimmedNickname,
            gender: input.gender,
          },
        },
        null,
      );
    }

    throw profileError;
  }

  const profile = await fetchProfileByUserId(data.user.id);
  return toAppUser(data.user, profile);
}

export async function signInWithEmail(
  email: string,
  password: string,
): Promise<User> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw error;
  }

  if (!data.user || !data.user.email) {
    throw new Error('No user returned from Supabase.');
  }

  const profile = await ensureProfileForUser(data.user);
  return toAppUser(data.user, profile);
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw error;
  }
}

export async function getCurrentUser(): Promise<User | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    throw error;
  }

  const current = data.session?.user;
  if (!current?.email) return null;

  const profile = await ensureProfileForUser(current);
  return toAppUser(current, profile);
}

export async function getUserBySessionUser(sessionUser: {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown>;
}): Promise<User> {
  const profile = await ensureProfileForUser(sessionUser);
  return toAppUser(sessionUser, profile);
}

export async function updateProfile(input: {
  userId: string;
  email: string;
  nickname: string;
  gender: UserGender;
}): Promise<User> {
  const { error } = await supabase.from('profiles').upsert({
    id: input.userId,
    email: input.email.trim().toLowerCase(),
    nickname: input.nickname.trim(),
    full_name: input.nickname.trim(),
    gender: input.gender,
  });

  if (error) {
    throw error;
  }

  const { error: metadataError } = await supabase.auth.updateUser({
    data: {
      nickname: input.nickname.trim(),
      gender: input.gender,
    },
  });

  if (metadataError) {
    throw metadataError;
  }

  const profile = await fetchProfileByUserId(input.userId);
  return {
    id: input.userId,
    email: input.email.trim().toLowerCase(),
    nickname: profile?.nickname ?? input.nickname.trim(),
    gender: normalizeGender(profile?.gender) ?? input.gender,
  };
}

export async function sendPasswordResetEmail(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase());

  if (error) {
    throw error;
  }
}

export async function changePasswordWithCurrentPassword(input: {
  email: string;
  currentPassword: string;
  newPassword: string;
}): Promise<void> {
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: input.email.trim().toLowerCase(),
    password: input.currentPassword,
  });

  if (signInError) {
    throw new Error('현재 비밀번호가 일치하지 않습니다.');
  }

  const { error: updateError } = await supabase.auth.updateUser({
    password: input.newPassword,
  });

  if (updateError) {
    throw updateError;
  }
}

export async function deleteCurrentAccount(): Promise<void> {
  const { data, error } = await supabase.functions.invoke('delete-account', {
    body: {},
  });

  if (error) {
    throw new Error(error.message || '계정 삭제 요청에 실패했습니다.');
  }

  if (data && typeof data === 'object' && 'error' in data && typeof data.error === 'string') {
    throw new Error(data.error);
  }

  await supabase.auth.signOut();
}

export async function fetchMembers(): Promise<Member[]> {
  const { data, error } = await supabase
    .from('members')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as Member[];
}

export async function createMember(input: {
  userId: string;
  fullName: string;
  email?: string;
  phone?: string;
  notes?: string;
}): Promise<Member> {
  const { data, error } = await supabase
    .from('members')
    .insert({
      user_id: input.userId,
      full_name: input.fullName,
      email: input.email || null,
      phone: input.phone || null,
      notes: input.notes || null,
    })
    .select('*')
    .single();

  if (error) throw error;
  return data as Member;
}

export async function updateMember(input: {
  memberId: string;
  userId: string;
  fullName: string;
  email?: string;
  phone?: string;
  notes?: string;
}): Promise<Member> {
  const { data, error } = await supabase
    .from('members')
    .update({
      full_name: input.fullName,
      email: input.email || null,
      phone: input.phone || null,
      notes: input.notes || null,
    })
    .eq('id', input.memberId)
    .eq('user_id', input.userId)
    .select('*')
    .single();

  if (error) throw error;
  return data as Member;
}

export async function fetchProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as Product[];
}

export async function createProduct(input: {
  userId: string;
  name: string;
  description?: string;
  price: number;
  currency?: string;
  totalSessions?: number;
  validityDays?: number;
}): Promise<Product> {
  const { data, error } = await supabase
    .from('products')
    .insert({
      user_id: input.userId,
      name: input.name,
      description: input.description || null,
      price: input.price,
      currency: input.currency ?? 'EUR',
      total_sessions: input.totalSessions ?? null,
      validity_days: input.validityDays ?? null,
      is_active: true,
    })
    .select('*')
    .single();

  if (error) throw error;
  return data as Product;
}

export async function fetchMemberships(): Promise<Membership[]> {
  const { data, error } = await supabase
    .from('memberships')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as Membership[];
}

function addDaysToDateString(startDate: string, days: number): string {
  const d = new Date(startDate);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export async function createMembership(input: {
  userId: string;
  memberId: string;
  product: Product;
  startDate: string;
}): Promise<Membership> {
  const totalSessions = input.product.total_sessions ?? null;
  const remainingSessions = totalSessions;
  const endDate = input.product.validity_days
    ? addDaysToDateString(input.startDate, input.product.validity_days)
    : null;

  const { data, error } = await supabase
    .from('memberships')
    .insert({
      user_id: input.userId,
      member_id: input.memberId,
      product_id: input.product.id,
      start_date: input.startDate,
      end_date: endDate,
      remaining_sessions: remainingSessions,
      status: 'active',
    })
    .select('*')
    .single();

  if (error) throw error;
  return data as Membership;
}

export async function deleteMembership(input: {
  membershipId: string;
  userId: string;
}): Promise<void> {
  const deleteDirect = async () => {
    const { data, error } = await supabase
      .from('memberships')
      .delete()
      .eq('id', input.membershipId)
      .eq('user_id', input.userId)
      .select('id');
    if (error) throw error;
    return data ?? [];
  };
  const cancelInsteadOfDelete = async () => {
    const { data, error } = await supabase
      .from('memberships')
      .update({ status: 'cancelled' })
      .eq('id', input.membershipId)
      .eq('user_id', input.userId)
      .select('id');
    if (error) throw error;
    return data ?? [];
  };

  try {
    const removedRows = await deleteDirect();
    if (removedRows.length > 0) {
      return;
    }
  } catch (error) {
    const message =
      `${(error as { message?: string })?.message ?? ''}`.toLowerCase();
    const isFkViolation =
      message.includes('foreign key') ||
      message.includes('violates foreign key constraint');
    if (!isFkViolation) {
      const cancelledRows = await cancelInsteadOfDelete();
      if (cancelledRows.length > 0) {
        return;
      }
      throw error;
    }
  }

  const { error: detachError } = await supabase
    .from('attendances')
    .update({ membership_id: null })
    .eq('membership_id', input.membershipId)
    .eq('user_id', input.userId);

  if (detachError) {
    const cancelledRows = await cancelInsteadOfDelete();
    if (cancelledRows.length > 0) {
      return;
    }
    throw new Error(
      '출석 데이터와 연결된 회원권 삭제/취소 권한이 없습니다. memberships DELETE/UPDATE 및 attendances UPDATE RLS 정책을 확인해주세요.',
    );
  }

  const removedRows = await deleteDirect();
  if (removedRows.length === 0) {
    const cancelledRows = await cancelInsteadOfDelete();
    if (cancelledRows.length > 0) {
      return;
    }
    throw new Error(
      '회원권 삭제/취소 권한이 없거나 대상 회원권을 찾지 못했습니다.',
    );
  }
}

export async function fetchClasses(): Promise<ClassSession[]> {
  const { data, error } = await supabase
    .from('classes')
    .select('*')
    .order('class_datetime', { ascending: true });

  if (error) throw error;
  return (data ?? []) as ClassSession[];
}

export async function createClass(input: {
  userId: string;
  title: string;
  classDatetime: string;
  durationMinutes?: number;
  location?: string;
  capacity?: number;
}): Promise<ClassSession> {
  const basePayload = {
    user_id: input.userId,
    title: input.title,
    class_datetime: input.classDatetime,
    location: input.location || null,
    capacity: input.capacity ?? null,
  };

  const insertWithDuration = {
    ...basePayload,
    duration_minutes: input.durationMinutes ?? null,
  };

  let { data, error } = await supabase
    .from('classes')
    .insert(insertWithDuration)
    .select('*')
    .single();

  if (error) {
    const errorText =
      `${error.message ?? ''} ${error.details ?? ''}`.toLowerCase();
    const canFallback = errorText.includes('duration_minutes');
    if (canFallback) {
      const retry = await supabase
        .from('classes')
        .insert(basePayload)
        .select('*')
        .single();
      data = retry.data;
      error = retry.error;
    }
  }

  if (error) {
    throw new Error(error.message || '수업 생성에 실패했습니다.');
  }
  return data as ClassSession;
}

export async function updateClass(input: {
  classId: string;
  userId: string;
  title: string;
  classDatetime: string;
  durationMinutes?: number;
  location?: string;
  capacity?: number;
}): Promise<ClassSession> {
  const basePayload = {
    title: input.title,
    class_datetime: input.classDatetime,
    location: input.location || null,
    capacity: input.capacity ?? null,
  };

  const payloadWithDuration = {
    ...basePayload,
    duration_minutes: input.durationMinutes ?? null,
  };

  let { data, error } = await supabase
    .from('classes')
    .update(payloadWithDuration)
    .eq('id', input.classId)
    .eq('user_id', input.userId)
    .select('*')
    .single();

  if (error) {
    const errorText =
      `${error.message ?? ''} ${error.details ?? ''}`.toLowerCase();
    const canFallback = errorText.includes('duration_minutes');
    if (canFallback) {
      const retry = await supabase
        .from('classes')
        .update(basePayload)
        .eq('id', input.classId)
        .eq('user_id', input.userId)
        .select('*')
        .single();
      data = retry.data;
      error = retry.error;
    }
  }

  if (error) {
    throw new Error(error.message || '수업 수정에 실패했습니다.');
  }
  return data as ClassSession;
}

export async function fetchAttendances(): Promise<Attendance[]> {
  const { data, error } = await supabase
    .from('attendances')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as Attendance[];
}

export async function cleanupDuplicateAttendances(input: {
  userId: string;
}): Promise<number> {
  const { data, error } = await supabase
    .from('attendances')
    .select('*')
    .eq('user_id', input.userId)
    .order('created_at', { ascending: true });

  if (error) throw error;

  const rows = (data ?? []) as Attendance[];
  const seen = new Set<string>();
  const duplicateRows: Attendance[] = [];

  rows.forEach((row) => {
    const key = `${row.class_id}:${row.member_id}`;
    if (seen.has(key)) {
      duplicateRows.push(row);
      return;
    }
    seen.add(key);
  });

  if (duplicateRows.length === 0) {
    return 0;
  }

  const duplicateIds = duplicateRows.map((row) => row.id);

  const { error: deleteError } = await supabase
    .from('attendances')
    .delete()
    .in('id', duplicateIds)
    .eq('user_id', input.userId);

  if (deleteError) throw deleteError;

  const restoreCountByMembershipId = new Map<string, number>();
  duplicateRows.forEach((row) => {
    if (row.used_session && row.membership_id) {
      restoreCountByMembershipId.set(
        row.membership_id,
        (restoreCountByMembershipId.get(row.membership_id) ?? 0) + 1,
      );
    }
  });

  for (const [membershipId, restoreCount] of restoreCountByMembershipId) {
    const { data: membership, error: membershipError } = await supabase
      .from('memberships')
      .select('remaining_sessions')
      .eq('id', membershipId)
      .eq('user_id', input.userId)
      .single();

    if (membershipError) throw membershipError;

    if (
      membership?.remaining_sessions !== null &&
      membership?.remaining_sessions !== undefined
    ) {
      const { error: updateError } = await supabase
        .from('memberships')
        .update({ remaining_sessions: membership.remaining_sessions + restoreCount })
        .eq('id', membershipId)
        .eq('user_id', input.userId);

      if (updateError) throw updateError;
    }
  }

  return duplicateIds.length;
}

export async function markAttendance(input: {
  userId: string;
  classId: string;
  memberId: string;
  membershipId?: string;
  usedSession?: boolean;
}): Promise<void> {
  const usedSession = input.usedSession ?? true;

  const { data: existingAttendance, error: existingAttendanceError } = await supabase
    .from('attendances')
    .select('id')
    .eq('user_id', input.userId)
    .eq('class_id', input.classId)
    .eq('member_id', input.memberId)
    .limit(1)
    .maybeSingle();

  if (existingAttendanceError) throw existingAttendanceError;
  if (existingAttendance?.id) return;

  const { error: attendanceError } = await supabase.from('attendances').insert({
    user_id: input.userId,
    class_id: input.classId,
    member_id: input.memberId,
    membership_id: input.membershipId ?? null,
    used_session: usedSession,
  });

  if (attendanceError) throw attendanceError;

  if (usedSession && input.membershipId) {
    const { data: membership, error: membershipError } = await supabase
      .from('memberships')
      .select('remaining_sessions')
      .eq('id', input.membershipId)
      .single();

    if (membershipError) throw membershipError;

    if (
      membership?.remaining_sessions !== null &&
      membership?.remaining_sessions !== undefined
    ) {
      const next = Math.max((membership.remaining_sessions ?? 0) - 1, 0);
      const { error: updateError } = await supabase
        .from('memberships')
        .update({ remaining_sessions: next })
        .eq('id', input.membershipId);
      if (updateError) throw updateError;
    }
  }
}

export async function fetchSequences(): Promise<SequenceWithPoses[]> {
  const { data: sequenceRows, error: sequenceError } = await supabase
    .from('sequences')
    .select('*')
    .order('created_at', { ascending: false });
  if (sequenceError) throw sequenceError;

  const sequences = (sequenceRows ?? []) as Sequence[];
  if (sequences.length === 0) return [];

  const sequenceIds = sequences.map((item) => item.id);
  const { data: poseRows, error: poseError } = await supabase
    .from('sequence_poses')
    .select('*')
    .in('sequence_id', sequenceIds)
    .order('order_index', { ascending: true });
  if (poseError) throw poseError;

  const poses = (poseRows ?? []) as SequencePose[];
  const grouped = new Map<string, SequencePose[]>();
  poses.forEach((pose) => {
    const current = grouped.get(pose.sequence_id) ?? [];
    current.push(pose);
    grouped.set(pose.sequence_id, current);
  });

  return sequences.map((sequence) => ({
    ...sequence,
    poses: grouped.get(sequence.id) ?? [],
  }));
}

export async function createSequenceWithPoses(input: {
  userId: string;
  title: string;
  theme?: string;
  level?: string;
  totalDuration?: number;
  origin: 'manual' | 'auto';
  notes?: string;
  poses: Array<{
    sanskritName: string;
    holdTimeMinutes: number;
    cue?: string;
  }>;
}): Promise<void> {
  const { data: sequenceRow, error: sequenceError } = await supabase
    .from('sequences')
    .insert({
      user_id: input.userId,
      title: input.title,
      theme: input.theme || null,
      level: input.level || null,
      total_duration: input.totalDuration ?? null,
      origin: input.origin,
      notes: input.notes || null,
    })
    .select('id')
    .single();

  if (sequenceError) throw sequenceError;

  const sequenceId = sequenceRow.id;
  const posePayload = input.poses.map((pose, idx) => ({
    user_id: input.userId,
    sequence_id: sequenceId,
    order_index: idx + 1,
    english_name: pose.sanskritName,
    hold_time_seconds: Math.max(Math.round(pose.holdTimeMinutes * 60), 60),
    cue: pose.cue || null,
  }));

  const { error: poseError } = await supabase
    .from('sequence_poses')
    .insert(posePayload);
  if (poseError) throw poseError;
}
