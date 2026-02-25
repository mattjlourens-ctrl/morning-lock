import AsyncStorage from '@react-native-async-storage/async-storage';

export const SESSION_HISTORY_KEY = '@morning_lock/session_history';

export type SessionRecord = {
  id: string;
  date: string; // ISO string
  status: 'completed' | 'failed';
  totalDuration: number; // seconds
  outsideSeconds: number; // accumulated while active
  tasksCompleted: number;
  totalTasks: number;
};

export async function appendSessionRecord(record: SessionRecord): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(SESSION_HISTORY_KEY);
    const history: SessionRecord[] = raw ? JSON.parse(raw) : [];
    history.push(record);
    await AsyncStorage.setItem(SESSION_HISTORY_KEY, JSON.stringify(history));
  } catch {}
}
