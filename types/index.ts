export type AppLanguage = 'ko' | 'en' | 'fr';

export type UserGender = 'female' | 'male' | 'other';

export interface User {
  id: string;
  email: string;
  nickname?: string | null;
  gender?: UserGender | null;
}

export interface UserProfile {
  id: string;
  email: string | null;
  nickname: string | null;
  full_name: string | null;
  gender: UserGender | null;
}

export interface Member {
  id: string;
  user_id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  created_at: string;
}

export interface Product {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  total_sessions: number | null;
  validity_days: number | null;
  is_active: boolean;
  created_at: string;
}

export interface Membership {
  id: string;
  user_id: string;
  member_id: string;
  product_id: string;
  start_date: string;
  end_date: string | null;
  remaining_sessions: number | null;
  status: string;
  created_at: string;
}

export interface ClassSession {
  id: string;
  user_id: string;
  title: string;
  class_datetime: string;
  duration_minutes: number;
  location: string | null;
  capacity: number | null;
  created_at: string;
}

export interface Attendance {
  id: string;
  user_id: string;
  class_id: string;
  member_id: string;
  membership_id: string | null;
  used_session: boolean;
  created_at: string;
}

export interface Sequence {
  id: string;
  user_id: string;
  title: string;
  theme: string | null;
  created_at: string;
}

export interface SequencePose {
  id: string;
  sequence_id: string;
  pose_name: string;
  pose_order: number;
  duration_seconds: number | null;
}

export interface SequenceWithPoses extends Sequence {
  poses: SequencePose[];
}
