import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useTaskEditor } from '@/hooks/useTaskEditor';
import type { Task } from '@/constants/defaultTasks';

function EditTaskRow({
  task,
  onUpdate,
  onDelete,
  onToggleRecurring,
}: {
  task: Task;
  onUpdate: (id: string, text: string) => void;
  onDelete: (id: string) => void;
  onToggleRecurring: (id: string) => void;
}) {
  const [text, setText] = useState(task.label);
  return (
    <View style={styles.row}>
      <TextInput
        style={styles.input}
        value={text}
        onChangeText={setText}
        onBlur={() => {
          const trimmed = text.trim();
          if (trimmed) {
            onUpdate(task.id, trimmed);
          } else {
            setText(task.label);
          }
        }}
        placeholderTextColor="#333333"
      />
      <TouchableOpacity
        onPress={() => onToggleRecurring(task.id)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        style={styles.iconBtn}
      >
        <Ionicons name="repeat" size={16} color={task.recurring ? '#888888' : '#333333'} />
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => onDelete(task.id)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Text style={styles.deleteBtn}>✕</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function EditTasksScreen() {
  const { tasks, isEditable, addTask, updateTask, deleteTask, toggleRecurring } = useTaskEditor();
  const [newTaskText, setNewTaskText] = useState('');

  function commitNewTask() {
    const trimmed = newTaskText.trim();
    if (trimmed) {
      addTask(trimmed);
      setNewTaskText('');
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Tasks</Text>
        <View style={styles.headerSpacer} />
      </View>

      {!isEditable ? (
        <View style={styles.blocked}>
          <Text style={styles.blockedText}>Cannot edit during an active session.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {tasks.map(task => (
            <EditTaskRow
              key={task.id}
              task={task}
              onUpdate={updateTask}
              onDelete={deleteTask}
              onToggleRecurring={toggleRecurring}
            />
          ))}
          <View style={styles.addRow}>
            <TextInput
              style={styles.addInput}
              value={newTaskText}
              onChangeText={setNewTaskText}
              placeholder="New task"
              placeholderTextColor="#2A2A2A"
              onSubmitEditing={commitNewTask}
              returnKeyType="done"
            />
            <TouchableOpacity style={styles.addBtn} onPress={commitNewTask} activeOpacity={0.7}>
              <Text style={styles.addBtnText}>Add</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 32,
    paddingTop: 16,
    paddingBottom: 24,
  },
  back: {
    fontSize: 20,
    color: '#888888',
    fontWeight: '200',
  },
  title: {
    fontSize: 11,
    letterSpacing: 5,
    color: '#444444',
    textTransform: 'uppercase',
  },
  headerSpacer: {
    width: 24,
  },
  list: {
    paddingHorizontal: 32,
    paddingBottom: 40,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    width: '100%',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1A1A1A',
  },
  input: {
    flex: 1,
    color: '#888888',
    fontSize: 20,
    paddingVertical: 0,
  },
  iconBtn: {
    marginLeft: 12,
  },
  deleteBtn: {
    color: '#333333',
    fontSize: 13,
    paddingLeft: 16,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 14,
  },
  addInput: {
    flex: 1,
    color: '#888888',
    fontSize: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#2A2A2A',
    paddingVertical: 6,
  },
  addBtn: {
    marginLeft: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  addBtnText: {
    color: '#555555',
    fontSize: 10,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  blocked: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blockedText: {
    color: '#444444',
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});
