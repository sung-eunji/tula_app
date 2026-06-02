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

  const [classModalVisible, setClassModalVisible] = useState(false);
  const [attendanceModalVisible, setAttendanceModalVisible] = useState(false);

  const openClassModal = (session?: ClassSession) => {
    if (session) startEditClass(session);
    else resetClassForm();
    setClassModalVisible(true);
  };

  return (
    <SafeAreaView style={ss.safe}>
      <ScrollView ref={scrollViewRef} contentContainerStyle={ss.scroll}>
        {/* 헤더 */}
        <View style={ss.header}>
          <Text style={ss.eyebrow}>Schedule</Text>
          <Text style={ss.title}>{c.title}</Text>
        </View>

        {loading && <ActivityIndicator color={PALETTE.primary} style={{ marginTop: 16 }} />}
        {error && <Text style={ss.errorText}>{error}</Text>}

        {/* 뷰 모드 토글 */}
        <View style={ss.seg}>
          {(['list', 'calendar'] as const).map((mode) => (
            <Pressable key={mode} style={[ss.segBtn, classViewMode === mode && ss.segBtnOn]} onPress={() => setClassViewMode(mode)}>
              <Text style={[ss.segBtnText, classViewMode === mode && ss.segBtnTextOn]}>{mode === 'list' ? c.list : c.calendar}</Text>
            </Pressable>
          ))}
        </View>

        {/* 리스트 뷰 */}
        {classViewMode === 'list' && (
          <View style={ss.cardList}>
            {!loading && classes.length === 0 && (
              <View style={ss.emptyCard}><Text style={ss.emptyText}>{c.noClasses}</Text></View>
            )}
            {classes.map((session) => (
              <View key={session.id} style={ss.classCard}>
                <View style={ss.classCardRow}>
                  {/* 시간 */}
                  <View style={ss.timeCol}>
                    <Text style={ss.timeText}>{getTimeFromClassDatetime(session.class_datetime)}</Text>
                    <Text style={ss.durationText}>{session.duration_minutes ?? '-'}{c.minutesSuffix}</Text>
                  </View>
                  <View style={ss.divider} />
                  {/* 내용 */}
                  <View style={{ flex: 1 }}>
                    <Text style={ss.classTitle}>{session.title}</Text>
                    <Text style={ss.classMeta}>{session.location ?? '-'}</Text>
                    <View style={ss.pillRow}>
                      <View style={[ss.pill, ss.pillGreen]}>
                        <Text style={[ss.pillText, ss.pillTextGreen]}>
                          {c.attendance} {attendanceCountByClass.get(session.id) ?? 0}{session.capacity ? `/${session.capacity}` : ''}
                        </Text>
                      </View>
                      {session.capacity ? (
                        <View style={[ss.pill, ss.pillGrey]}>
                          <Text style={[ss.pillText, ss.pillTextGrey]}>{c.capacity} {session.capacity}</Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                  {/* 액션 */}
                  <View style={{ gap: 6 }}>
                    <Pressable style={ss.actionBtn} onPress={() => setAttendanceModalClassId(session.id)}>
                      <Text style={ss.actionBtnText}>{c.viewAttendance}</Text>
                    </Pressable>
                    <Pressable style={ss.actionBtn} onPress={() => openClassModal(session)}>
                      <Text style={ss.actionBtnText}>{c.edit}</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* 달력 뷰 */}
        {classViewMode === 'calendar' && (
          <View style={ss.calCard}>
            {/* 월 헤더 */}
            <View style={ss.calHeader}>
              <Text style={ss.calMonthText}>{calendarMonthCursor.getFullYear()}년 {calendarMonthCursor.getMonth() + 1}월</Text>
              <Text style={ss.calMonthTextEn}>{calendarMonthCursor.toLocaleString('en', { month: 'long' })}</Text>
            </View>
            <View style={ss.calNav}>
              <Pressable onPress={() => setCalendarMonthCursor(new Date(calendarMonthCursor.getFullYear(), calendarMonthCursor.getMonth() - 1, 1))}>
                <Text style={ss.calNavText}>{'<'}</Text>
              </Pressable>
              <Pressable onPress={() => setCalendarMonthCursor(new Date(calendarMonthCursor.getFullYear(), calendarMonthCursor.getMonth() + 1, 1))}>
                <Text style={ss.calNavText}>{'>'}</Text>
              </Pressable>
            </View>
            {/* 요일 */}
            <View style={ss.calRow}>
              {WEEKDAY_LABELS.map((label) => (
                <Text key={label} style={ss.calDow}>{label}</Text>
              ))}
            </View>
            {/* 날짜 */}
            <View style={ss.calGrid}>
              {calendarDays.map((cell) => {
                const active = cell.dateKey === selectedCalendarDate;
                return (
                  <Pressable
                    key={cell.key}
                    onPress={() => { if (cell.inMonth) setSelectedCalendarDate(cell.dateKey); }}
                    style={[ss.calCell, active && ss.calCellActive, !cell.inMonth && { opacity: 0 }]}
                  >
                    <Text style={[ss.calCellText, active && { color: '#fff', fontWeight: '600' }]}>{cell.label}</Text>
                    {cell.count > 0 ? <View style={[ss.calDot, active && { backgroundColor: '#fff' }]} /> : null}
                  </Pressable>
                );
              })}
            </View>

            {/* 선택 날짜 수업 */}
            <View style={{ marginTop: 16, gap: 8 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={ss.calDateTitle}>
                  {selectedCalendarDate.slice(5).replace('-', '월 ')}일 {c.classesOfDate}
                </Text>
                <Text style={ss.calDateCount}>{selectedDateClasses.length}개</Text>
              </View>
              {selectedDateClasses.length === 0 ? (
                <Text style={ss.emptyText}>{c.noClassesDate}</Text>
              ) : (
                selectedDateClasses.map((session) => (
                  <View key={session.id} style={ss.classCard}>
                    <View style={ss.classCardRow}>
                      <View style={ss.timeCol}>
                        <Text style={ss.timeText}>{getTimeFromClassDatetime(session.class_datetime)}</Text>
                        <Text style={ss.durationText}>{session.duration_minutes ?? '-'}{c.minutesSuffix}</Text>
                      </View>
                      <View style={ss.divider} />
                      <View style={{ flex: 1 }}>
                        <Text style={ss.classTitle}>{session.title}</Text>
                        <Text style={ss.classMeta}>{session.location ?? '-'}</Text>
                        <View style={ss.pillRow}>
                          <View style={[ss.pill, ss.pillGreen]}>
                            <Text style={[ss.pillText, ss.pillTextGreen]}>
                              {c.attendance} {attendanceCountByClass.get(session.id) ?? 0}{session.capacity ? `/${session.capacity}` : ''}
                            </Text>
                          </View>
                        </View>
                      </View>
                      <View style={{ gap: 6 }}>
                        <Pressable style={ss.actionBtn} onPress={() => setAttendanceModalClassId(session.id)}>
                          <Text style={ss.actionBtnText}>{c.viewAttendance}</Text>
                        </Pressable>
                        <Pressable style={ss.actionBtn} onPress={() => openClassModal(session)}>
                          <Text style={ss.actionBtnText}>{c.edit}</Text>
                        </Pressable>
                      </View>
                    </View>
                  </View>
                ))
              )}
            </View>
          </View>
        )}
      </ScrollView>

      {/* FAB — 수업 추가 */}
      <Pressable style={ss.fab} onPress={() => openClassModal()}>
        <Text style={ss.fabText}>+</Text>
      </Pressable>

      {/* 출석 체크 버튼 */}
      <Pressable style={ss.attendanceBtn} onPress={() => setAttendanceModalVisible(true)}>
        <Text style={ss.attendanceBtnText}>✓</Text>
      </Pressable>

      {/* 수업 추가/수정 모달 */}
      <Modal visible={classModalVisible} animationType="slide" transparent>
        <View style={ss.modalOverlay}>
          <ScrollView style={{ width: '100%' }} contentContainerStyle={ss.modalSheet} keyboardShouldPersistTaps="handled">
            <Text style={ss.modalTitle}>{editingClassId ? c.editClass : c.addClass}</Text>
            {error ? <Text style={ss.errorText}>{error}</Text> : null}

            <TextInput placeholder={c.className} placeholderTextColor={PALETTE.mutedText} value={title} onChangeText={setTitle} style={ss.input} />
            <Pressable style={ss.datePicker} onPress={() => openDatePicker('classDate')}>
              <Text style={{ color: classDate ? PALETTE.text : PALETTE.mutedText }}>{classDate || c.selectDate}</Text>
            </Pressable>
            <TextInput placeholder={c.timeExample} placeholderTextColor={PALETTE.mutedText} value={classTime} onChangeText={setClassTime} style={ss.input} />

            <Text style={ss.sectionLabel}>{c.durationSelect}</Text>
            <View style={ss.chipRow}>
              {DURATION_OPTIONS.map((min) => {
                const active = classDurationMinutes === min;
                return (
                  <Pressable key={min} style={[ss.chip, active && ss.chipActive]} onPress={() => setClassDurationMinutes(min)}>
                    <Text style={[ss.chipText, active && ss.chipTextActive]}>{min}{c.minutesSuffix}</Text>
                  </Pressable>
                );
              })}
            </View>

            {!editingClassId && (
              <>
                <Text style={ss.sectionLabel}>{c.repeatLabel}</Text>
                <View style={ss.chipRow}>
                  {(['none', 'weekly'] as const).map((mode) => {
                    const active = repeatMode === mode;
                    return (
                      <Pressable key={mode} style={[ss.chip, active && ss.chipActive]}
                        onPress={() => { setRepeatMode(mode); if (mode === 'weekly' && repeatWeekdays.length === 0) { setRepeatWeekdays([getWeekdayFromDate(classDate)]); setRepeatUntilDate(addDaysToYmd(classDate, 56)); } }}>
                        <Text style={[ss.chipText, active && ss.chipTextActive]}>{mode === 'none' ? c.repeatNone : c.repeatWeekly}</Text>
                      </Pressable>
                    );
                  })}
                </View>
                {repeatMode === 'weekly' && (
                  <>
                    <Text style={ss.sectionLabel}>{c.repeatWeekdays}</Text>
                    <View style={ss.chipRow}>
                      {WEEKDAY_LABELS.map((label, index) => {
                        const active = repeatWeekdays.includes(index);
                        return (
                          <Pressable key={`${label}-${index}`} style={[ss.chip, active && ss.chipActive]} onPress={() => toggleRepeatWeekday(index)}>
                            <Text style={[ss.chipText, active && ss.chipTextActive]}>{label}</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                    <Pressable style={ss.datePicker} onPress={() => openDatePicker('repeatUntilDate')}>
                      <Text style={{ color: PALETTE.text }}>{c.repeatUntil} {repeatUntilDate}</Text>
                    </Pressable>
                  </>
                )}
              </>
            )}

            <TextInput placeholder={c.locationOptional} placeholderTextColor={PALETTE.mutedText} value={location} onChangeText={setLocation} style={ss.input} />
            <TextInput placeholder={c.capacityOptional} placeholderTextColor={PALETTE.mutedText} keyboardType="number-pad" value={capacity} onChangeText={setCapacity} style={ss.input} />

            <Pressable style={[ss.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSaveClass} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={ss.saveBtnText}>{editingClassId ? c.saveEdit : c.saveClass}</Text>}
            </Pressable>
            <Pressable style={ss.cancelBtn} onPress={() => { setClassModalVisible(false); resetClassForm(); setError(null); }}>
              <Text style={ss.cancelBtnText}>{c.cancel}</Text>
            </Pressable>
          </ScrollView>
        </View>
      </Modal>

      {/* 출석 체크 모달 */}
      <Modal visible={attendanceModalVisible} animationType="slide" transparent>
        <View style={ss.modalOverlay}>
          <ScrollView style={{ width: '100%' }} contentContainerStyle={ss.modalSheet}>
            <Text style={ss.modalTitle}>{c.attendanceCheck}</Text>
            {error ? <Text style={ss.errorText}>{error}</Text> : null}

            <Text style={ss.sectionLabel}>{c.step1Class}</Text>
            <View style={ss.chipRow}>
              {classes.map((item) => {
                const active = selectedClassId === item.id;
                return (
                  <Pressable key={item.id} style={[ss.chip, active && ss.chipActive]} onPress={() => setSelectedClassId(item.id)}>
                    <Text style={[ss.chipText, active && ss.chipTextActive]}>{item.title}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={ss.sectionLabel}>{c.step2Member}</Text>
            <View style={ss.chipRow}>
              {members.map((item) => {
                const active = selectedMemberIds.includes(item.id);
                return (
                  <Pressable key={item.id} style={[ss.chip, active && ss.chipActive]} onPress={() => toggleSelectedMember(item.id)}>
                    <Text style={[ss.chipText, active && ss.chipTextActive]}>{item.full_name}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Pressable style={[ss.saveBtn, saving && { opacity: 0.6 }]} onPress={handleCheckAttendance} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={ss.saveBtnText}>{c.processAttendance}</Text>}
            </Pressable>
            <Pressable style={ss.cancelBtn} onPress={() => { setAttendanceModalVisible(false); setError(null); }}>
              <Text style={ss.cancelBtnText}>{c.cancel}</Text>
            </Pressable>
          </ScrollView>
        </View>
      </Modal>

      {/* 출석 명단 모달 */}
      <Modal visible={attendanceModalClassId !== null} transparent animationType="fade" onRequestClose={() => setAttendanceModalClassId(null)}>
        <Pressable style={ss.attendanceListOverlay} onPress={() => setAttendanceModalClassId(null)}>
          <Pressable style={ss.attendanceListSheet} onPress={(e) => e.stopPropagation()}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={ss.modalTitle}>{c.attendanceListTitle}</Text>
                {attendanceModalSession ? (
                  <Text style={{ color: PALETTE.mutedText, fontSize: 13, marginTop: 2 }}>
                    {attendanceModalSession.title} · {getTimeFromClassDatetime(attendanceModalSession.class_datetime)}
                  </Text>
                ) : null}
              </View>
              <Pressable onPress={() => setAttendanceModalClassId(null)}>
                <Text style={{ color: PALETTE.mutedText, fontSize: 14 }}>{c.close}</Text>
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={{ gap: 8 }}>
              {attendanceModalRows.length === 0 ? (
                <Text style={ss.emptyText}>{c.noAttendanceYet}</Text>
              ) : attendanceModalRows.map((row) => (
                <View key={row.id} style={ss.attendanceRow}>
                  <Text style={{ color: PALETTE.text, fontWeight: '600' }}>{memberById.get(row.member_id)?.full_name ?? row.member_id}</Text>
                  <Text style={{ color: PALETTE.mutedText, fontSize: 12 }}>{row.created_at?.slice(0, 16)}</Text>
                </View>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      <CalendarDatePickerModal
        visible={activeDateField !== null} title={c.selectDate} cancelLabel={c.cancel}
        value={activeDateField === 'repeatUntilDate' ? repeatUntilDate : classDate}
        weekdays={WEEKDAY_LABELS}
        onClose={() => setActiveDateField(null)}
        onSelect={(date) => {
          if (activeDateField === 'repeatUntilDate') { setRepeatUntilDate(date); }
          else {
            setClassDate(date);
            if (repeatMode === 'weekly' && repeatWeekdays.length === 0) setRepeatWeekdays([getWeekdayFromDate(date)]);
            if (repeatMode === 'weekly' && repeatUntilDate < date) setRepeatUntilDate(addDaysToYmd(date, 56));
          }
          setActiveDateField(null);
        }}
      />
    </SafeAreaView>
  );
}

const ss = StyleSheet.create({
  safe: { flex: 1, backgroundColor: PALETTE.page },
  scroll: { paddingHorizontal: 22, paddingTop: 20, paddingBottom: 140 },
  header: { marginBottom: 20 },
  eyebrow: { fontSize: 13, color: PALETTE.accent, fontStyle: 'italic', marginBottom: 2 },
  title: { fontSize: 30, fontWeight: '600', color: PALETTE.text, letterSpacing: -0.3 },
  errorText: { color: PALETTE.dangerText, fontSize: 13, marginBottom: 8 },

  // 뷰 토글
  seg: { flexDirection: 'row', backgroundColor: '#F1EBE3', borderRadius: 14, padding: 4, gap: 4, marginBottom: 16 },
  segBtn: { flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: 'center' },
  segBtnOn: { backgroundColor: '#fff', shadowColor: PALETTE.ink, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 2 },
  segBtnText: { fontSize: 13, fontWeight: '600', color: PALETTE.mutedText },
  segBtnTextOn: { color: PALETTE.primaryDark },

  cardList: { gap: 12 },
  classCard: {
    backgroundColor: PALETTE.card, borderWidth: 1, borderColor: PALETTE.border,
    borderRadius: 22, padding: 18,
    shadowColor: PALETTE.ink, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2,
  },
  classCardRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  timeCol: { width: 52, alignItems: 'center' },
  timeText: { fontSize: 18, fontWeight: '600', color: PALETTE.primaryDark },
  durationText: { fontSize: 10.5, color: PALETTE.mutedText, marginTop: 2 },
  divider: { width: 1, alignSelf: 'stretch', backgroundColor: PALETTE.border },
  classTitle: { fontSize: 15, fontWeight: '600', color: PALETTE.text },
  classMeta: { fontSize: 12.5, color: PALETTE.mutedText, marginTop: 2 },
  pillRow: { flexDirection: 'row', gap: 7, flexWrap: 'wrap', marginTop: 10 },
  pill: { paddingHorizontal: 11, paddingVertical: 5, borderRadius: 999 },
  pillText: { fontSize: 11.5, fontWeight: '600' },
  pillGreen: { backgroundColor: PALETTE.greenSoft },
  pillTextGreen: { color: PALETTE.primaryDark },
  pillGrey: { backgroundColor: '#F1EBE3' },
  pillTextGrey: { color: PALETTE.mutedText },
  actionBtn: { backgroundColor: PALETTE.card, borderWidth: 1, borderColor: PALETTE.border, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7 },
  actionBtnText: { fontSize: 11.5, fontWeight: '600', color: PALETTE.text },

  // 달력
  calCard: { backgroundColor: PALETTE.card, borderWidth: 1, borderColor: PALETTE.border, borderRadius: 22, padding: 16, shadowColor: PALETTE.ink, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2 },
  calHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  calMonthText: { fontSize: 15, fontWeight: '600', color: PALETTE.text },
  calMonthTextEn: { fontSize: 14, color: PALETTE.accent, fontStyle: 'italic' },
  calNav: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  calNavText: { color: PALETTE.primary, fontSize: 16, paddingVertical: 4, paddingHorizontal: 8 },
  calRow: { flexDirection: 'row', marginBottom: 4 },
  calDow: { width: '14.285%', textAlign: 'center', fontSize: 10.5, color: PALETTE.mutedText, fontWeight: '600', paddingVertical: 4 },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calCell: { width: '14.285%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 13 },
  calCellActive: { backgroundColor: PALETTE.primary },
  calCellText: { fontSize: 13, color: PALETTE.text, fontWeight: '500' },
  calDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: PALETTE.accent, marginTop: 2 },
  calDateTitle: { fontSize: 15, fontWeight: '600', color: PALETTE.text },
  calDateCount: { fontSize: 12.5, color: PALETTE.mutedText },

  emptyCard: { backgroundColor: PALETTE.card, borderWidth: 1, borderColor: PALETTE.border, borderRadius: 22, padding: 40, alignItems: 'center' },
  emptyText: { color: PALETTE.mutedText, fontSize: 13 },

  fab: { position: 'absolute', right: 20, bottom: 100, width: 58, height: 58, borderRadius: 20, backgroundColor: PALETTE.primary, alignItems: 'center', justifyContent: 'center', shadowColor: PALETTE.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.45, shadowRadius: 14, elevation: 6 },
  fabText: { color: '#fff', fontSize: 28, lineHeight: 32 },
  attendanceBtn: { position: 'absolute', right: 88, bottom: 100, width: 58, height: 58, borderRadius: 20, backgroundColor: PALETTE.card, borderWidth: 1, borderColor: PALETTE.border, alignItems: 'center', justifyContent: 'center', elevation: 3 },
  attendanceBtnText: { fontSize: 22, color: PALETTE.primary },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(43,37,33,0.4)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: PALETTE.page, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 28, paddingBottom: 48, gap: 10 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: PALETTE.text, marginBottom: 4 },
  sectionLabel: { fontSize: 12, fontWeight: '600', color: PALETTE.mutedText, marginTop: 4 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: PALETTE.border, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 13, fontSize: 15, color: PALETTE.text },
  datePicker: { backgroundColor: '#fff', borderWidth: 1, borderColor: PALETTE.border, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 13 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderColor: PALETTE.border, backgroundColor: PALETTE.card, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
  chipActive: { backgroundColor: PALETTE.primary, borderColor: PALETTE.primary },
  chipText: { fontSize: 13, fontWeight: '600', color: PALETTE.text },
  chipTextActive: { color: '#fff' },
  saveBtn: { backgroundColor: PALETTE.primary, borderRadius: 16, paddingVertical: 15, alignItems: 'center', marginTop: 4 },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  cancelBtn: { alignItems: 'center', paddingVertical: 10 },
  cancelBtnText: { color: PALETTE.mutedText, fontSize: 14 },

  attendanceListOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', paddingHorizontal: 20 },
  attendanceListSheet: { backgroundColor: PALETTE.card, borderRadius: 22, padding: 20, maxHeight: '70%' },
  attendanceRow: { borderWidth: 1, borderColor: PALETTE.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, gap: 2 },

  // 스타일 이름 충돌 방지용 빈 항목 (사용안함)
  styles: {},
});
