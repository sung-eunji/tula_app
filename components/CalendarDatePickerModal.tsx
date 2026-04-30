import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';

import { PALETTE } from '@/constants/theme';

interface CalendarDatePickerModalProps {
  visible: boolean;
  title: string;
  cancelLabel: string;
  value: string;
  weekdays: string[];
  onClose: () => void;
  onSelect: (date: string) => void;
}

function toDateFromYmd(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date();
  }

  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
}

function formatYmd(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function CalendarDatePickerModal({
  visible,
  title,
  cancelLabel,
  value,
  weekdays,
  onClose,
  onSelect,
}: CalendarDatePickerModalProps) {
  const [monthCursor, setMonthCursor] = useState(() => {
    const initialDate = toDateFromYmd(value);
    return new Date(initialDate.getFullYear(), initialDate.getMonth(), 1);
  });

  useEffect(() => {
    if (!visible) return;
    const initialDate = toDateFromYmd(value);
    setMonthCursor(new Date(initialDate.getFullYear(), initialDate.getMonth(), 1));
  }, [value, visible]);

  const calendarDays = useMemo(() => {
    const year = monthCursor.getFullYear();
    const month = monthCursor.getMonth();
    const firstWeekday = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: {
      key: string;
      dateKey: string;
      label: string;
      inMonth: boolean;
    }[] = [];

    for (let i = 0; i < firstWeekday; i += 1) {
      cells.push({
        key: `empty-${i}`,
        dateKey: '',
        label: '',
        inMonth: false,
      });
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const dateKey = formatYmd(new Date(year, month, day));
      cells.push({
        key: dateKey,
        dateKey,
        label: String(day),
        inMonth: true,
      });
    }

    return cells;
  }, [monthCursor]);

  const monthLabel = `${monthCursor.getFullYear()}-${String(monthCursor.getMonth() + 1).padStart(2, '0')}`;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
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
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontWeight: '600', color: PALETTE.text }}>{title}</Text>
            <Text
              onPress={onClose}
              style={{ color: PALETTE.mutedText, paddingVertical: 4 }}
            >
              {cancelLabel}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text
              onPress={() =>
                setMonthCursor(
                  new Date(monthCursor.getFullYear(), monthCursor.getMonth() - 1, 1),
                )
              }
              style={{ color: PALETTE.primary, paddingVertical: 4 }}
            >
              {'<'}
            </Text>
            <Text style={{ fontWeight: '600', color: PALETTE.text }}>{monthLabel}</Text>
            <Text
              onPress={() =>
                setMonthCursor(
                  new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 1),
                )
              }
              style={{ color: PALETTE.primary, paddingVertical: 4 }}
            >
              {'>'}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            {weekdays.map((label) => (
              <Text
                key={label}
                style={{ width: '14.2%', textAlign: 'center', color: PALETTE.mutedText }}
              >
                {label}
              </Text>
            ))}
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {calendarDays.map((cell) => {
              const active = cell.dateKey === value;
              return (
                <Pressable
                  key={cell.key}
                  onPress={() => {
                    if (!cell.inMonth) return;
                    onSelect(cell.dateKey);
                  }}
                  style={{
                    width: '14.2%',
                    minHeight: 46,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 10,
                    backgroundColor: active ? PALETTE.primary : 'transparent',
                    opacity: cell.inMonth ? 1 : 0,
                  }}
                >
                  <Text style={{ color: active ? '#fff' : PALETTE.text }}>{cell.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
