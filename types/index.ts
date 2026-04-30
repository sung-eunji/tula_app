export type AppLanguage = 'ko' | 'en' | 'fr';

export type UserGender = 'female' | 'male' | 'other';

export interface User {
  id: string;
  email: string;
  nickname?: string | null;
  gender?: UserGender | null;
  [key: string]: unknown;
}

export interface UserProfile {
  id: string;
  email: string | null;
  nickname: string | null;
  full_name: string | null;
  gender: UserGender | null;
  [key: string]: unknown;
}

export interface Member {
  id: string;
  user_id?: string;
  name?: string;
  email?: string | null;
  phone?: string | null;
  note?: string | null;
  created_at?: string;
  [key: string]: unknown;
}

export interface Product {
  id: string;
  user_id?: string;
  name?: string;
  description?: string | null;
  price?: number;
  currency_code?: string | null;
  total_sessions?: number | null;
  validity_days?: number | null;
  created_at?: string;
  [key: string]: unknown;
}

export interface Membership {
  id: string;
  user_id?: string;
  member_id?: string;
  product_id?: string;
  start_date?: string;
  end_date?: string | null;
  remaining_sessions?: number | null;
  created_at?: string;
  [key: string]: unknown;
}

export interface ClassSession {
  id: string;
  user_id?: string;
  name?: string;
  class_date?: string;
  start_time?: string;
  duration_minutes?: number;
  capacity?: number | null;
  repeat_rule?: string | null;
  created_at?: string;
  [key: string]: unknown;
}

export interface Attendance {
  id: string;
  class_id?: string;
  member_id?: string;
  status?: string;
  checked_at?: string;
  created_at?: string;
  [key: string]: unknown;
}

export interface Sequence {
  id: string;
  user_id?: string;
  title?: string;
  theme?: string | null;
  created_at: string;
  [key: string]: unknown;
}

export interface SequencePose {
  id: string;
  sequence_id: string;
  pose_name?: string;
  pose_order?: number;
  duration_seconds?: number | null;
  [key: string]: unknown;
}

export interface SequenceWithPoses extends Sequence {
  poses: SequencePose[];
}
