import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';

interface Props {
  initialHour: number;
  initialMinute: number;
  onConfirm: (hour: number, minute: number) => void;
  onCancel: () => void;
}

export function TimePickerModal({
  initialHour,
  initialMinute,
  onConfirm,
  onCancel,
}: Props) {
  const [date, setDate] = useState(() => {
    const d = new Date();
    d.setHours(initialHour, initialMinute, 0, 0);
    return d;
  });

  function handleChange(_: DateTimePickerEvent, selected?: Date) {
    if (Platform.OS === 'android') {
      // Android fires onChange with the final selection and closes automatically
      if (selected) {
        onConfirm(selected.getHours(), selected.getMinutes());
      } else {
        onCancel();
      }
      return;
    }
    if (selected) setDate(selected);
  }

  // Android shows a native dialog — no Modal wrapper needed
  if (Platform.OS === 'android') {
    return (
      <DateTimePicker
        value={date}
        mode="time"
        is24Hour
        onChange={handleChange}
      />
    );
  }

  // iOS — bottom sheet with spinner picker
  return (
    <Modal transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <DateTimePicker
            value={date}
            mode="time"
            display="spinner"
            textColor="#FFFFFF"
            onChange={handleChange}
          />
          <View style={styles.actions}>
            <TouchableOpacity onPress={onCancel} style={styles.actionButton}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => onConfirm(date.getHours(), date.getMinutes())}
              style={styles.actionButton}
            >
              <Text style={styles.setText}>Set</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#111111',
    paddingBottom: 44,
    paddingTop: 8,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 32,
    paddingTop: 4,
  },
  actionButton: {
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  cancelText: {
    color: '#555555',
    fontSize: 14,
    letterSpacing: 1,
  },
  setText: {
    color: '#FFFFFF',
    fontSize: 14,
    letterSpacing: 1,
  },
});
