import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_TASKS, type Task } from '@/constants/defaultTasks';
import type { SessionStatus } from '@/hooks/useMorningLock';

const USER_TASKS_KEY = '@morning_lock/user_tasks';
const STORAGE_KEY = '@morning_lock/state';

export function useTaskEditor() {
  const [tasks, setTasks] = useState<Task[]>(DEFAULT_TASKS);
  const [status, setStatus] = useState<SessionStatus>('idle');
  const isActiveRef = useRef(false);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(USER_TASKS_KEY).catch(() => null),
      AsyncStorage.getItem(STORAGE_KEY).catch(() => null),
    ]).then(([tasksRaw, stateRaw]) => {
      if (tasksRaw) {
        const loaded = (JSON.parse(tasksRaw) as Task[]).map(t => ({ ...t, recurring: t.recurring ?? true }));
        setTasks(loaded);
      }
      const s: SessionStatus = stateRaw ? (JSON.parse(stateRaw).status ?? 'active') : 'idle';
      setStatus(s);
      isActiveRef.current = s === 'active';
    });
  }, []);

  const addTask = useCallback((text: string) => {
    if (isActiveRef.current) return;
    const trimmed = text.trim();
    if (!trimmed) return;
    setTasks(prev => {
      const next = [...prev, { id: Date.now().toString(), label: trimmed, recurring: true }];
      AsyncStorage.setItem(USER_TASKS_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const updateTask = useCallback((id: string, text: string) => {
    if (isActiveRef.current) return;
    const trimmed = text.trim();
    if (!trimmed) return;
    setTasks(prev => {
      const next = prev.map(t => t.id === id ? { ...t, label: trimmed } : t);
      AsyncStorage.setItem(USER_TASKS_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const deleteTask = useCallback((id: string) => {
    if (isActiveRef.current) return;
    setTasks(prev => {
      const next = prev.filter(t => t.id !== id);
      AsyncStorage.setItem(USER_TASKS_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const toggleRecurring = useCallback((id: string) => {
    if (isActiveRef.current) return;
    setTasks(prev => {
      const next = prev.map(t => t.id === id ? { ...t, recurring: !t.recurring } : t);
      AsyncStorage.setItem(USER_TASKS_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const isEditable = status !== 'active';

  return { tasks, isEditable, addTask, updateTask, deleteTask, toggleRecurring };
}
