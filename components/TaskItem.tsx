import React from 'react';
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import type { Task } from '@/constants/defaultTasks';

interface Props {
  task: Task;
  completed: boolean;
  onToggle: (id: string) => void;
}

export function TaskItem({ task, completed, onToggle }: Props) {
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={() => onToggle(task.id)}
      activeOpacity={0.6}
    >
      <View style={[styles.checkbox, completed && styles.checkboxDone]}>
        {completed && <Text style={styles.checkmark}>✓</Text>}
      </View>
      <Text style={[styles.label, completed && styles.labelDone]}>
        {task.label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#444444',
    marginRight: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxDone: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  checkmark: {
    fontSize: 12,
    color: '#000000',
    fontWeight: '700',
  },
  label: {
    fontSize: 15,
    color: '#888888',
    flex: 1,
  },
  labelDone: {
    color: '#FFFFFF',
    textDecorationLine: 'line-through',
    textDecorationColor: '#444444',
  },
});
