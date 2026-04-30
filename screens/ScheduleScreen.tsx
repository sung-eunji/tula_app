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
  cleanupDuplicateAttendances,
  createClass,
  fetchAttendances,
  fetchClasses,
  fetchMembers,
  fetchMemberships,
  markAttendance,
  updateClass,
} from '@/services/supabase';
import type {
  AppLanguage,
  Attendance,
  ClassSession,
  Member,
  Membership,
  User,
} from '@/types';

interface ScheduleScreenProps {
  user: User;
  language: AppLanguage;
}

function getTodayDate() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getCurrentTime() {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

function getDateFromClassDatetime(value: string): string {
  if (value.includes('T')) return value.split('T')[0] ?? getTodayDate();
  return value.slice(0, 10);
}

function getTimeFromClassDatetime(value: string): string {
  if (value.includes('T')) {
    return (value.split('T')[1] ?? '').slice(0, 5) || '00:00';
  }
  return '00:00';
}

function isValidDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isValidTime(value: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function parseYmd(value: string): Date {
  const [y, m, d] = value.split('-').map((item) => Number(item));
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

function formatYmd(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDaysToYmd(value: string, days: number): string {
  const date = parseYmd(value);
  date.setDate(date.getDate() + days);
  return formatYmd(date);
}

function getWeekdayFromDate(value: string): number {
  if (!isValidDate(value)) {
    return new Date().getDay();
  }

  return parseYmd(value).getDay();
}

function buildWeeklyDates(
  startDate: string,
  endDate: string,
  weekdays: number[],
): string[] {
  const weekdaySet = new Set(weekdays);
  const dates: string[] = [];
  const cursor = parseYmd(startDate);
  const lastDate = parseYmd(endDate);

  while (cursor <= lastDate) {
    if (weekdaySet.has(cursor.getDay())) {
      dates.push(formatYmd(cursor));
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return dates;
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

const DURATION_OPTIONS = [30, 45, 60, 75, 90, 120];
const COPY: Record<AppLanguage, Record<string, string>> = {
  ko: {
    loadError: '스케줄 데이터를 불러오지 못했습니다.',
    requiredFields: '수업명, 날짜, 시간은 필수입니다.',
    invalidDate: '날짜 형식이 올바르지 않습니다. (YYYY-MM-DD)',
    invalidTime: '시간 형식이 올바르지 않습니다. (HH:MM)',
    invalidRepeatUntil: '반복 종료일은 시작일보다 빠를 수 없습니다.',
    repeatWeekdayRequired: '반복할 요일을 하나 이상 선택해주세요.',
    noRepeatDates: '선택한 반복 조건에 해당하는 수업 날짜가 없습니다.',
    updateError: '수업 수정에 실패했습니다.',
    createError: '수업 생성에 실패했습니다.',
    selectClassMember: '수업과 회원을 하나 이상 선택해주세요.',
    attendanceError: '출석 처리에 실패했습니다.',
    attendanceRls: 'RLS 정책 때문에 출석 저장이 거부되었습니다. Supabase attendances 정책을 확인해주세요.',
    title: '스케줄표',
    subtitle: '수업 생성 후 출석을 기록하면 회원권 남은 횟수가 자동 차감됩니다.',
    editClass: '수업 수정',
    addClass: '수업 추가',
    className: '수업명',
    selectDate: '날짜 선택',
    cancel: '취소',
    timeExample: '시간 (예: 10:00)',
    durationSelect: '수업 시간(분) 선택',
    repeatLabel: '반복 설정',
    repeatNone: '반복 안 함',
    repeatWeekly: '매주 반복',
    repeatWeekdays: '반복 요일',
    repeatUntil: '반복 종료일',
    minutesSuffix: '분',
    locationOptional: '장소 (선택)',
    capacityOptional: '정원 (선택)',
    saving: '저장 중...',
    saveEdit: '수업 수정 저장',
    saveClass: '수업 저장',
    cancelEdit: '수정 취소',
    attendanceCheck: '출석 체크',
    step1Class: '1) 수업 선택',
    step2Member: '2) 회원 선택 (복수 선택 가능)',
    selectedMembership: '선택 회원권',
    none: '없음',
    processing: '처리 중...',
    processAttendance: '출석 처리',
    registeredClasses: '등록된 수업',
    list: '리스트',
    calendar: '달력',
    viewAttendance: '출석 명단',
    attendanceListTitle: '출석 명단',
    noAttendanceYet: '아직 출석한 회원이 없습니다.',
    close: '닫기',
    noClasses: '등록된 수업이 없습니다.',
    edit: '수정',
    time: '시간',
    place: '장소',
    capacity: '정원',
    attendance: '출석',
    prevMonth: '이전달',
    nextMonth: '다음달',
    countSuffix: '개',
    classesOfDate: '수업',
    noClassesDate: '해당 날짜 수업이 없습니다.',
    weekdays: '일,월,화,수,목,금,토',
  },
  en: {
    loadError: 'Failed to load schedule data.',
    requiredFields: 'Class name, date, and time are required.',
    invalidDate: 'Invalid date format. (YYYY-MM-DD)',
    invalidTime: 'Invalid time format. (HH:MM)',
    invalidRepeatUntil: 'Repeat end date cannot be earlier than the start date.',
    repeatWeekdayRequired: 'Please choose at least one weekday for repetition.',
    noRepeatDates: 'No class dates match the selected repeat settings.',
    updateError: 'Failed to update class.',
    createError: 'Failed to create class.',
    selectClassMember: 'Please select a class and at least one member.',
    attendanceError: 'Failed to mark attendance.',
    attendanceRls: 'Attendance save was blocked by RLS policy. Please check Supabase attendances policy.',
    title: 'Schedule',
    subtitle: 'When attendance is marked after class creation, remaining sessions are deducted automatically.',
    editClass: 'Edit Class',
    addClass: 'Add Class',
    className: 'Class name',
    selectDate: 'Select date',
    cancel: 'Cancel',
    timeExample: 'Time (e.g. 10:00)',
    durationSelect: 'Select class duration (minutes)',
    repeatLabel: 'Repeat',
    repeatNone: 'Do not repeat',
    repeatWeekly: 'Repeat weekly',
    repeatWeekdays: 'Weekdays',
    repeatUntil: 'Repeat until',
    minutesSuffix: 'min',
    locationOptional: 'Location (optional)',
    capacityOptional: 'Capacity (optional)',
    saving: 'Saving...',
    saveEdit: 'Save class changes',
    saveClass: 'Save class',
    cancelEdit: 'Cancel edit',
    attendanceCheck: 'Attendance',
    step1Class: '1) Select class',
    step2Member: '2) Select members',
    selectedMembership: 'Selected memberships',
    none: 'None',
    processing: 'Processing...',
    processAttendance: 'Mark attendance',
    registeredClasses: 'Registered Classes',
    list: 'List',
    calendar: 'Calendar',
    viewAttendance: 'Attendance list',
    attendanceListTitle: 'Attendance list',
    noAttendanceYet: 'No one has checked in yet.',
    close: 'Close',
    noClasses: 'No classes registered.',
    edit: 'Edit',
    time: 'Time',
    place: 'Location',
    capacity: 'Capacity',
    attendance: 'Attendance',
    prevMonth: 'Prev month',
    nextMonth: 'Next month',
    countSuffix: '',
    classesOfDate: 'classes',
    noClassesDate: 'No classes on this date.',
    weekdays: 'Sun,Mon,Tue,Wed,Thu,Fri,Sat',
  },
  fr: {
    loadError: 'Impossible de charger les horaires.',
    requiredFields: 'Le nom du cours, la date et l heure sont obligatoires.',
    invalidDate: 'Format de date invalide. (YYYY-MM-DD)',
    invalidTime: 'Format de l heure invalide. (HH:MM)',
    invalidRepeatUntil: 'La date de fin ne peut pas preceder la date de debut.',
    repeatWeekdayRequired: 'Choisissez au moins un jour de repetition.',
    noRepeatDates: 'Aucune date ne correspond a la repetition choisie.',
    updateError: 'Echec de la modification du cours.',
    createError: 'Echec de la creation du cours.',
    selectClassMember: 'Veuillez selectionner un cours et au moins un membre.',
    attendanceError: 'Echec du pointage de presence.',
    attendanceRls: 'Enregistrement bloque par la politique RLS. Verifiez la policy attendances de Supabase.',
    title: 'Planning',
    subtitle: 'Apres creation du cours et pointage de presence, les seances restantes sont deduites automatiquement.',
    editClass: 'Modifier le cours',
    addClass: 'Ajouter un cours',
    className: 'Nom du cours',
    selectDate: 'Choisir une date',
    cancel: 'Annuler',
    timeExample: 'Heure (ex: 10:00)',
    durationSelect: 'Choisir la duree (minutes)',
    repeatLabel: 'Repetition',
    repeatNone: 'Pas de repetition',
    repeatWeekly: 'Chaque semaine',
    repeatWeekdays: 'Jours',
    repeatUntil: 'Jusqu au',
    minutesSuffix: 'min',
    locationOptional: 'Lieu (optionnel)',
    capacityOptional: 'Capacite (optionnel)',
    saving: 'Enregistrement...',
    saveEdit: 'Enregistrer les modifications',
    saveClass: 'Enregistrer le cours',
    cancelEdit: 'Annuler la modification',
    attendanceCheck: 'Presence',
    step1Class: '1) Selectionner un cours',
    step2Member: '2) Selectionner plusieurs membres',
    selectedMembership: 'Abonnements selectionnes',
    none: 'Aucun',
    processing: 'Traitement...',
    processAttendance: 'Valider la presence',
    registeredClasses: 'Cours enregistres',
    list: 'Liste',
    calendar: 'Calendrier',
    viewAttendance: 'Liste de presence',
    attendanceListTitle: 'Liste de presence',
    noAttendanceYet: 'Aucun membre present pour le moment.',
    close: 'Fermer',
    noClasses: 'Aucun cours enregistre.',
    edit: 'Modifier',
    time: 'Duree',
    place: 'Lieu',
    capacity: 'Capacite',
    attendance: 'Presence',
    prevMonth: 'Mois precedent',
    nextMonth: 'Mois suivant',
    countSuffix: '',
    classesOfDate: 'cours',
    noClassesDate: 'Aucun cours a cette date.',
    weekdays: 'Dim,Lun,Mar,Mer,Jeu,Ven,Sam',
  },
};

export default function ScheduleScreen({ user, language }: ScheduleScreenProps) {
  const c = COPY[language];
  const WEEKDAY_LABELS = c.weekdays.split(',');
  const scrollViewRef = useRef<ScrollView>(null);
  const [classes, setClasses] = useState<ClassSession[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [classDate, setClassDate] = useState(getTodayDate());
  const [classTime, setClassTime] = useState(getCurrentTime());
  const [classDurationMinutes, setClassDurationMinutes] = useState<number>(60);
  const [activeDateField, setActiveDateField] = useState<'classDate' | 'repeatUntilDate' | null>(null);
  const [location, setLocation] = useState('');
  const [capacity, setCapacity] = useState('');
  const [repeatMode, setRepeatMode] = useState<'none' | 'weekly'>('none');
  const [repeatWeekdays, setRepeatWeekdays] = useState<number[]>([]);
  const [repeatUntilDate, setRepeatUntilDate] = useState(getTodayDate());

  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [attendanceModalClassId, setAttendanceModalClassId] = useState<string | null>(null);
  const [classViewMode, setClassViewMode] = useState<'list' | 'calendar'>('list');
  const [calendarMonthCursor, setCalendarMonthCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(getTodayDate());

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [classRows, memberRows, membershipRows] = await Promise.all([
        fetchClasses(),
        fetchMembers(),
        fetchMemberships(),
      ]);
      await cleanupDuplicateAttendances({ userId: user.id });
      const attendanceRows = await fetchAttendances();
      setClasses(classRows.filter((item) => item.user_id === user.id));
      setMembers(memberRows.filter((item) => item.user_id === user.id));
      setMemberships(membershipRows.filter((item) => item.user_id === user.id));
      setAttendances(attendanceRows.filter((item) => item.user_id === user.id));
    } catch (e) {
      setError(getErrorMessage(e, c.loadError));
    } finally {
      setLoading(false);
    }
  }, [c.loadError, user.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const attendanceCountByClass = useMemo(() => {
    const map = new Map<string, Set<string>>();
    attendances.forEach((row) => {
      const memberIds = map.get(row.class_id) ?? new Set<string>();
      memberIds.add(row.member_id);
      map.set(row.class_id, memberIds);
    });
    return new Map(
      Array.from(map.entries()).map(([classId, memberIds]) => [classId, memberIds.size]),
    );
  }, [attendances]);

  const attendanceListByClass = useMemo(() => {
    const map = new Map<string, Attendance[]>();
    attendances.forEach((row) => {
      const current = map.get(row.class_id) ?? [];
      if (current.some((item) => item.member_id === row.member_id)) {
        return;
      }
      current.push(row);
      map.set(row.class_id, current);
    });
    return map;
  }, [attendances]);

  const activeMembershipByMemberId = useMemo(() => {
    const map = new Map<string, Membership>();
    memberships.forEach((membership) => {
      if (membership.status === 'active' && !map.has(membership.member_id)) {
        map.set(membership.member_id, membership);
      }
    });
    return map;
  }, [memberships]);

  const selectedMembers = useMemo(
    () => members.filter((member) => selectedMemberIds.includes(member.id)),
    [members, selectedMemberIds],
  );

  const memberById = useMemo(
    () => new Map(members.map((member) => [member.id, member])),
    [members],
  );

  const resetClassForm = () => {
    const today = getTodayDate();
    setTitle('');
    setClassDate(today);
    setClassTime(getCurrentTime());
    setClassDurationMinutes(60);
    setLocation('');
    setCapacity('');
    setRepeatMode('none');
    setRepeatWeekdays([]);
    setRepeatUntilDate(today);
    setActiveDateField(null);
    setEditingClassId(null);
  };

  const handleSaveClass = async () => {
    if (!title || !classDate || !classTime) {
      setError(c.requiredFields);
      return;
    }
    if (!isValidDate(classDate)) {
      setError(c.invalidDate);
      return;
    }
    if (!isValidTime(classTime)) {
      setError(c.invalidTime);
      return;
    }

    if (repeatMode === 'weekly' && !editingClassId) {
      if (repeatWeekdays.length === 0) {
        setError(c.repeatWeekdayRequired);
        return;
      }
      if (!isValidDate(repeatUntilDate) || repeatUntilDate < classDate) {
        setError(c.invalidRepeatUntil);
        return;
      }
    }

    setSaving(true);
    setError(null);
    try {
      if (editingClassId) {
        const normalizedDatetime = `${classDate}T${classTime}:00`;
        await updateClass({
          classId: editingClassId,
          userId: user.id,
          title,
          classDatetime: normalizedDatetime,
          durationMinutes: classDurationMinutes,
          location: location || undefined,
          capacity: capacity ? Number(capacity) : undefined,
        });
      } else {
        const datesToCreate =
          repeatMode === 'weekly'
            ? buildWeeklyDates(classDate, repeatUntilDate, repeatWeekdays)
            : [classDate];

        if (datesToCreate.length === 0) {
          setError(c.noRepeatDates);
          setSaving(false);
          return;
        }

        for (const date of datesToCreate) {
          await createClass({
            userId: user.id,
            title,
            classDatetime: `${date}T${classTime}:00`,
            durationMinutes: classDurationMinutes,
            location: location || undefined,
            capacity: capacity ? Number(capacity) : undefined,
          });
        }
      }
      resetClassForm();
      await load();
    } catch (e) {
      setError(getErrorMessage(e, editingClassId ? c.updateError : c.createError));
    } finally {
      setSaving(false);
    }
  };

  const openDatePicker = (field: 'classDate' | 'repeatUntilDate') => {
    setActiveDateField(field);
  };

  const toggleRepeatWeekday = (weekday: number) => {
    setRepeatWeekdays((prev) =>
      prev.includes(weekday)
        ? prev.filter((item) => item !== weekday)
        : [...prev, weekday].sort((a, b) => a - b),
    );
  };

  const startEditClass = (session: ClassSession) => {
    const dateText = getDateFromClassDatetime(session.class_datetime);
    setEditingClassId(session.id);
    setTitle(session.title);
    setClassDate(dateText);
    setClassTime(getTimeFromClassDatetime(session.class_datetime));
    setClassDurationMinutes(session.duration_minutes ?? 60);
    setLocation(session.location ?? '');
    setCapacity(session.capacity != null ? String(session.capacity) : '');
    setRepeatMode('none');
    setRepeatWeekdays([]);
    setRepeatUntilDate(dateText);
    setActiveDateField(null);
    requestAnimationFrame(() => {
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    });
  };

  const classesByDate = useMemo(() => {
    const map = new Map<string, ClassSession[]>();
    classes.forEach((session) => {
      const key = getDateFromClassDatetime(session.class_datetime);
      const current = map.get(key) ?? [];
      current.push(session);
      map.set(key, current);
    });
    return map;
  }, [classes]);

  const calendarDays = useMemo(() => {
    const year = calendarMonthCursor.getFullYear();
    const month = calendarMonthCursor.getMonth();
    const firstWeekday = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: {
      key: string;
      dateKey: string;
      label: string;
      inMonth: boolean;
      count: number;
    }[] = [];

    for (let i = 0; i < firstWeekday; i += 1) {
      cells.push({
        key: `empty-${i}`,
        dateKey: '',
        label: '',
        inMonth: false,
        count: 0,
      });
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      cells.push({
        key: dateKey,
        dateKey,
        label: String(day),
        inMonth: true,
        count: classesByDate.get(dateKey)?.length ?? 0,
      });
    }
    return cells;
  }, [calendarMonthCursor, classesByDate]);

  const selectedDateClasses = classesByDate.get(selectedCalendarDate) ?? [];
  const attendanceModalRows = attendanceModalClassId
    ? attendanceListByClass.get(attendanceModalClassId) ?? []
    : [];
  const attendanceModalSession =
    classes.find((session) => session.id === attendanceModalClassId) ?? null;

  const monthLabel = `${calendarMonthCursor.getFullYear()}-${String(calendarMonthCursor.getMonth() + 1).padStart(2, '0')}`;

  const handleCheckAttendance = async () => {
    if (!selectedClassId || selectedMemberIds.length === 0) {
      setError(c.selectClassMember);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      for (const memberId of selectedMemberIds) {
        await markAttendance({
          userId: user.id,
          classId: selectedClassId,
          memberId,
          membershipId: activeMembershipByMemberId.get(memberId)?.id,
          usedSession: true,
        });
      }
      await load();
      setSelectedMemberIds([]);
    } catch (e) {
      const message = getErrorMessage(e, c.attendanceError);
      if (
        message.includes('row-level security') ||
        message.includes('violates row-level security policy')
      ) {
        setError(c.attendanceRls);
      } else {
        setError(message);
      }
    } finally {
      setSaving(false);
    }
  };

  const toggleSelectedMember = (memberId: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId],
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: PALETTE.page }}>
      <ScrollView ref={scrollViewRef} contentContainerStyle={{ padding: 16, gap: 16 }}>
        <View>
          <Text style={{ fontSize: 18, fontWeight: '600', color: PALETTE.text }}>{c.title}</Text>
          <Text style={{ color: PALETTE.mutedText, marginTop: 4 }}>
            {c.subtitle}
          </Text>
        </View>

        <View style={{ gap: 8 }}>
          <Text style={{ fontWeight: '600', color: PALETTE.text }}>{editingClassId ? c.editClass : c.addClass}</Text>
          <TextInput
            placeholder={c.className}
            value={title}
            onChangeText={setTitle}
            style={{
              borderWidth: 1,
              borderColor: PALETTE.border,
              borderRadius: 12,
              padding: 8,
            }}
          />
          <Pressable
            onPress={() => openDatePicker('classDate')}
            style={{
              borderWidth: 1,
              borderColor: PALETTE.border,
              borderRadius: 12,
              padding: 10,
            }}
          >
            <Text style={{ color: classDate ? PALETTE.text : PALETTE.mutedText }}>
              {classDate || c.selectDate}
            </Text>
          </Pressable>
          <TextInput
            placeholder={c.timeExample}
            value={classTime}
            onChangeText={setClassTime}
            style={{
              borderWidth: 1,
              borderColor: PALETTE.border,
              borderRadius: 12,
              padding: 8,
            }}
          />
          <View style={{ gap: 6 }}>
            <Text style={{ color: PALETTE.mutedText }}>{c.durationSelect}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {DURATION_OPTIONS.map((minutes) => {
                const active = classDurationMinutes === minutes;
                return (
                  <Text
                    key={minutes}
                    onPress={() => setClassDurationMinutes(minutes)}
                    style={{
                      borderWidth: 1,
                      borderColor: active ? PALETTE.primary : PALETTE.border,
                      backgroundColor: active ? PALETTE.primary : PALETTE.card,
                      color: active ? '#fff' : PALETTE.text,
                      borderRadius: 16,
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                    }}
                  >
                    {minutes}
                    {c.minutesSuffix}
                  </Text>
                );
              })}
            </View>
          </View>
          {!editingClassId ? (
            <View style={{ gap: 6 }}>
              <Text style={{ color: PALETTE.mutedText }}>{c.repeatLabel}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {(['none', 'weekly'] as const).map((mode) => {
                  const active = repeatMode === mode;
                  return (
                    <Text
                      key={mode}
                      onPress={() => {
                        setRepeatMode(mode);
                        if (mode === 'weekly' && repeatWeekdays.length === 0) {
                          setRepeatWeekdays([getWeekdayFromDate(classDate)]);
                          setRepeatUntilDate(addDaysToYmd(classDate, 56));
                        }
                      }}
                      style={{
                        borderWidth: 1,
                        borderColor: active ? PALETTE.primary : PALETTE.border,
                        backgroundColor: active ? PALETTE.primary : PALETTE.card,
                        color: active ? '#fff' : PALETTE.text,
                        borderRadius: 16,
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                      }}
                    >
                      {mode === 'none' ? c.repeatNone : c.repeatWeekly}
                    </Text>
                  );
                })}
              </View>

              {repeatMode === 'weekly' ? (
                <View style={{ gap: 8 }}>
                  <Text style={{ color: PALETTE.mutedText }}>{c.repeatWeekdays}</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {WEEKDAY_LABELS.map((label, index) => {
                      const active = repeatWeekdays.includes(index);
                      return (
                        <Text
                          key={`${label}-${index}`}
                          onPress={() => toggleRepeatWeekday(index)}
                          style={{
                            borderWidth: 1,
                            borderColor: active ? PALETTE.primary : PALETTE.border,
                            backgroundColor: active ? PALETTE.primary : PALETTE.card,
                            color: active ? '#fff' : PALETTE.text,
                            borderRadius: 16,
                            paddingHorizontal: 10,
                            paddingVertical: 6,
                          }}
                        >
                          {label}
                        </Text>
                      );
                    })}
                  </View>

                  <Pressable
                    onPress={() => openDatePicker('repeatUntilDate')}
                    style={{
                      borderWidth: 1,
                      borderColor: PALETTE.border,
                      borderRadius: 12,
                      padding: 10,
                    }}
                  >
                    <Text style={{ color: repeatUntilDate ? PALETTE.text : PALETTE.mutedText }}>
                      {c.repeatUntil} {repeatUntilDate}
                    </Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          ) : null}
          <TextInput
            placeholder={c.locationOptional}
            value={location}
            onChangeText={setLocation}
            style={{
              borderWidth: 1,
              borderColor: PALETTE.border,
              borderRadius: 12,
              padding: 8,
            }}
          />
          <TextInput
            placeholder={c.capacityOptional}
            keyboardType="number-pad"
            value={capacity}
            onChangeText={setCapacity}
            style={{
              borderWidth: 1,
              borderColor: PALETTE.border,
              borderRadius: 12,
              padding: 8,
            }}
          />
          <Pressable
            onPress={handleSaveClass}
            disabled={saving}
            style={{
              backgroundColor: PALETTE.primary,
              borderRadius: 12,
              paddingVertical: 12,
              alignItems: 'center',
              opacity: saving ? 0.6 : 1,
            }}
          >
            <Text style={{ color: '#fff' }}>{saving ? c.saving : editingClassId ? c.saveEdit : c.saveClass}</Text>
          </Pressable>
          {editingClassId ? (
            <Pressable
              onPress={resetClassForm}
              disabled={saving}
              style={{
                backgroundColor: PALETTE.primary,
                borderRadius: 12,
                paddingVertical: 12,
                alignItems: 'center',
                opacity: saving ? 0.6 : 1,
                marginTop: 8,
              }}
            >
              <Text style={{ color: '#fff' }}>{c.cancelEdit}</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={{ gap: 8 }}>
          <Text style={{ fontWeight: '600', color: PALETTE.text }}>{c.attendanceCheck}</Text>
          <Text style={{ color: PALETTE.mutedText }}>{c.step1Class}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {classes.map((item) => {
              const active = selectedClassId === item.id;
              return (
                <Text
                  key={item.id}
                  onPress={() => setSelectedClassId(item.id)}
                  style={{
                    borderWidth: 1,
                    borderColor: active ? PALETTE.primary : PALETTE.border,
                    backgroundColor: active ? PALETTE.primary : PALETTE.card,
                    color: active ? '#fff' : PALETTE.text,
                    borderRadius: 16,
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                  }}
                >
                  {item.title}
                </Text>
              );
            })}
          </View>

          <Text style={{ color: PALETTE.mutedText }}>{c.step2Member}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {members.map((item) => {
              const active = selectedMemberIds.includes(item.id);
              return (
                <Text
                  key={item.id}
                  onPress={() => toggleSelectedMember(item.id)}
                  style={{
                    borderWidth: 1,
                    borderColor: active ? PALETTE.primary : PALETTE.border,
                    backgroundColor: active ? PALETTE.primary : PALETTE.card,
                    color: active ? '#fff' : PALETTE.text,
                    borderRadius: 16,
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                  }}
                >
                  {item.full_name}
                </Text>
              );
            })}
          </View>
          <View style={{ gap: 4 }}>
            <Text style={{ color: PALETTE.mutedText }}>{c.selectedMembership}</Text>
            {selectedMembers.length === 0 ? (
              <Text style={{ color: PALETTE.mutedText }}>{c.none}</Text>
            ) : (
              selectedMembers.map((member) => (
                <Text key={member.id} style={{ color: PALETTE.mutedText }}>
                  {member.full_name}: {activeMembershipByMemberId.get(member.id)?.id ?? c.none}
                </Text>
              ))
            )}
          </View>
          <Pressable
            onPress={handleCheckAttendance}
            disabled={saving}
            style={{
              backgroundColor: PALETTE.primary,
              borderRadius: 12,
              paddingVertical: 12,
              alignItems: 'center',
              opacity: saving ? 0.6 : 1,
            }}
          >
            <Text style={{ color: '#fff' }}>{saving ? c.processing : c.processAttendance}</Text>
          </Pressable>
        </View>

        {error ? <Text style={{ color: PALETTE.dangerText }}>{error}</Text> : null}
        {loading ? <ActivityIndicator color={PALETTE.primary} /> : null}

        <View style={{ gap: 8 }}>
          <Text style={{ fontWeight: '600', color: PALETTE.text }}>{c.registeredClasses}</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {(['list', 'calendar'] as const).map((mode) => {
              const active = classViewMode === mode;
              return (
                <Text
                  key={mode}
                  onPress={() => setClassViewMode(mode)}
                  style={{
                    borderWidth: 1,
                    borderColor: active ? PALETTE.primary : PALETTE.border,
                    backgroundColor: active ? PALETTE.primary : PALETTE.card,
                    color: active ? '#fff' : PALETTE.text,
                    borderRadius: 16,
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                  }}
                >
                  {mode === 'list' ? c.list : c.calendar}
                </Text>
              );
            })}
          </View>
          {!loading && classes.length === 0 ? (
            <Text style={{ color: PALETTE.mutedText }}>{c.noClasses}</Text>
          ) : null}

          {classViewMode === 'list'
            ? classes.map((session) => (
                <View
                  key={session.id}
                  style={styles.classCard}
                >
                  <View style={styles.classCardHeader}>
                    <Text style={styles.classCardTitle}>{session.title}</Text>
                    <View style={styles.classCardActions}>
                      <Pressable onPress={() => setAttendanceModalClassId(session.id)} hitSlop={8}>
                        <Text style={{ color: PALETTE.primary, paddingVertical: 4 }}>{c.viewAttendance}</Text>
                      </Pressable>
                      <Pressable onPress={() => startEditClass(session)} hitSlop={8}>
                        <Text style={{ color: PALETTE.primary, paddingVertical: 4 }}>{c.edit}</Text>
                      </Pressable>
                    </View>
                  </View>
                  <Text style={styles.classCardDatetime}>{session.class_datetime}</Text>
                  <Text style={styles.classCardMeta}>
                    {c.time} {session.duration_minutes ?? '-'}{c.minutesSuffix} · {c.place} {session.location ?? '-'} · {c.capacity} {session.capacity ?? '-'} ·
                    {c.attendance} {attendanceCountByClass.get(session.id) ?? 0}
                  </Text>
                </View>
              ))
            : (
                <View style={{ gap: 10 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text
                      onPress={() =>
                        setCalendarMonthCursor(
                          new Date(
                            calendarMonthCursor.getFullYear(),
                            calendarMonthCursor.getMonth() - 1,
                            1,
                          ),
                        )
                      }
                      style={{ color: PALETTE.primary, paddingVertical: 4 }}
                    >
                      {c.prevMonth}
                    </Text>
                    <Text style={{ fontWeight: '600', color: PALETTE.text }}>{monthLabel}</Text>
                    <Text
                      onPress={() =>
                        setCalendarMonthCursor(
                          new Date(
                            calendarMonthCursor.getFullYear(),
                            calendarMonthCursor.getMonth() + 1,
                            1,
                          ),
                        )
                      }
                      style={{ color: PALETTE.primary, paddingVertical: 4 }}
                    >
                      {c.nextMonth}
                    </Text>
                  </View>

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    {WEEKDAY_LABELS.map((label) => (
                      <Text key={label} style={{ width: '14.2%', textAlign: 'center', color: PALETTE.mutedText }}>
                        {label}
                      </Text>
                    ))}
                  </View>

                  <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                    {calendarDays.map((cell) => {
                      const active = cell.dateKey === selectedCalendarDate;
                      return (
                        <Pressable
                          key={cell.key}
                          onPress={() => {
                            if (cell.inMonth) setSelectedCalendarDate(cell.dateKey);
                          }}
                          style={{
                            width: '14.2%',
                            minHeight: 54,
                            paddingVertical: 6,
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: 8,
                            backgroundColor: active ? PALETTE.primary : 'transparent',
                            opacity: cell.inMonth ? 1 : 0,
                          }}
                        >
                          <Text style={{ color: active ? '#fff' : PALETTE.text }}>{cell.label}</Text>
                          {cell.count > 0 ? (
                            <Text style={{ fontSize: 11, color: active ? '#fff' : PALETTE.mutedText }}>
                              {cell.count}
                              {c.countSuffix}
                            </Text>
                          ) : null}
                        </Pressable>
                      );
                    })}
                  </View>

                  <View style={{ gap: 6 }}>
                    <Text style={{ fontWeight: '600', color: PALETTE.text }}>{selectedCalendarDate} {c.classesOfDate}</Text>
                    {selectedDateClasses.length === 0 ? (
                      <Text style={{ color: PALETTE.mutedText }}>{c.noClassesDate}</Text>
                    ) : (
                      selectedDateClasses.map((session) => (
                        <View key={session.id} style={styles.classCard}>
                          <View style={styles.classCardHeader}>
                            <Text style={styles.classCardTitle}>{session.title}</Text>
                            <View style={styles.classCardActions}>
                              <Pressable onPress={() => setAttendanceModalClassId(session.id)} hitSlop={8}>
                                <Text style={{ color: PALETTE.primary, paddingVertical: 4 }}>{c.viewAttendance}</Text>
                              </Pressable>
                              <Pressable onPress={() => startEditClass(session)} hitSlop={8}>
                                <Text style={{ color: PALETTE.primary, paddingVertical: 4 }}>{c.edit}</Text>
                              </Pressable>
                            </View>
                          </View>
                          <Text style={styles.classCardDatetime}>{getTimeFromClassDatetime(session.class_datetime)}</Text>
                          <Text style={styles.classCardMeta}>
                            {c.time} {session.duration_minutes ?? '-'}{c.minutesSuffix} · {c.place} {session.location ?? '-'} · {c.capacity} {session.capacity ?? '-'}
                          </Text>
                        </View>
                      ))
                    )}
                  </View>
                </View>
              )}
        </View>

        <CalendarDatePickerModal
          visible={activeDateField !== null}
          title={c.selectDate}
          cancelLabel={c.cancel}
          value={activeDateField === 'repeatUntilDate' ? repeatUntilDate : classDate}
          weekdays={WEEKDAY_LABELS}
          onClose={() => setActiveDateField(null)}
          onSelect={(date) => {
            if (activeDateField === 'repeatUntilDate') {
              setRepeatUntilDate(date);
            } else {
              setClassDate(date);
              if (repeatMode === 'weekly' && repeatWeekdays.length === 0) {
                setRepeatWeekdays([getWeekdayFromDate(date)]);
              }
              if (repeatMode === 'weekly' && repeatUntilDate < date) {
                setRepeatUntilDate(addDaysToYmd(date, 56));
              }
            }
            setActiveDateField(null);
          }}
        />
        <Modal
          visible={attendanceModalClassId !== null}
          transparent
          animationType="fade"
          onRequestClose={() => setAttendanceModalClassId(null)}
        >
          <Pressable
            onPress={() => setAttendanceModalClassId(null)}
            style={{
              flex: 1,
              justifyContent: 'center',
              backgroundColor: 'rgba(0,0,0,0.35)',
              paddingHorizontal: 20,
            }}
          >
            <Pressable
              onPress={(event) => {
                event.stopPropagation();
              }}
              style={{
                backgroundColor: PALETTE.card,
                borderRadius: 16,
                padding: 16,
                gap: 12,
                maxHeight: '70%',
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flex: 1, marginRight: 12 }}>
                  <Text style={{ fontWeight: '600', color: PALETTE.text }}>{c.attendanceListTitle}</Text>
                  {attendanceModalSession ? (
                    <Text style={{ color: PALETTE.mutedText, marginTop: 4 }}>
                      {attendanceModalSession.title} · {attendanceModalSession.class_datetime}
                    </Text>
                  ) : null}
                </View>
                <Text
                  onPress={() => setAttendanceModalClassId(null)}
                  style={{ color: PALETTE.mutedText, paddingVertical: 4 }}
                >
                  {c.close}
                </Text>
              </View>

              <ScrollView contentContainerStyle={{ gap: 8 }}>
                {attendanceModalRows.length === 0 ? (
                  <Text style={{ color: PALETTE.mutedText }}>{c.noAttendanceYet}</Text>
                ) : (
                  attendanceModalRows.map((row) => (
                    <View
                      key={row.id}
                      style={{
                        borderWidth: 1,
                        borderColor: PALETTE.border,
                        borderRadius: 10,
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                        gap: 2,
                      }}
                    >
                      <Text style={{ color: PALETTE.text, fontWeight: '600' }}>
                        {memberById.get(row.member_id)?.full_name ?? row.member_id}
                      </Text>
                      <Text style={{ color: PALETTE.mutedText, fontSize: 12 }}>
                        {row.created_at}
                      </Text>
                    </View>
                  ))
                )}
              </ScrollView>
            </Pressable>
          </Pressable>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  classCard: {
    borderWidth: 1,
    borderColor: PALETTE.border,
    borderRadius: 14,
    backgroundColor: PALETTE.card,
    padding: 12,
    gap: 6,
  },
  classCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  classCardTitle: {
    flex: 1,
    fontWeight: '600',
    color: PALETTE.text,
  },
  classCardActions: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  classCardDatetime: {
    color: PALETTE.mutedText,
  },
  classCardMeta: {
    color: PALETTE.mutedText,
    lineHeight: 20,
  },
});
