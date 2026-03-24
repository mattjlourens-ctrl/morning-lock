import { Platform } from 'react-native';

export interface ScheduledTime {
  hour: number;
  minute: number;
}

const DAILY_ID_KEY = '@morning_lock/daily_notification_id';
const TIME_KEY = '@morning_lock/scheduled_time';

if (Platform.OS !== 'web') {
  const Notifications = require('expo-notifications');
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export async function requestPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const Notifications = require('expo-notifications');
  const { status: current } = await Notifications.getPermissionsAsync();
  if (current === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function scheduleDailyNotification(hour: number, minute: number): Promise<string> {
  if (Platform.OS === 'web') return '';
  const Notifications = require('expo-notifications');
  const AsyncStorage = require('@react-native-async-storage/async-storage').default;
  const prevId = await AsyncStorage.getItem(DAILY_ID_KEY).catch(() => null);
  if (prevId) await Notifications.cancelScheduledNotificationAsync(prevId).catch(() => {});
  const id = await Notifications.scheduleNotificationAsync({
    content: { title: 'Morning Lock', body: 'Time to start your morning routine.', sound: true },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute },
  });
  await AsyncStorage.setItem(DAILY_ID_KEY, id).catch(() => {});
  return id;
}

export async function saveScheduledTime(hour: number, minute: number): Promise<void> {
  if (Platform.OS === 'web') return;
  const AsyncStorage = require('@react-native-async-storage/async-storage').default;
  try { await AsyncStorage.setItem(TIME_KEY, JSON.stringify({ hour, minute })); } catch {}
}

export async function loadScheduledTime(): Promise<ScheduledTime | null> {
  if (Platform.OS === 'web') return null;
  const AsyncStorage = require('@react-native-async-storage/async-storage').default;
  try {
    const raw = await AsyncStorage.getItem(TIME_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ScheduledTime;
  } catch { return null; }
}

export async function cancelDailyNotification(): Promise<void> {
  if (Platform.OS === 'web') return;
  const Notifications = require('expo-notifications');
  const AsyncStorage = require('@react-native-async-storage/async-storage').default;
  const id = await AsyncStorage.getItem(DAILY_ID_KEY).catch(() => null);
  if (id) {
    await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
    await AsyncStorage.removeItem(DAILY_ID_KEY).catch(() => {});
  }
}

export async function scheduleTestNotification(): Promise<string> {
  if (Platform.OS === 'web') return '';
  const Notifications = require('expo-notifications');
  return Notifications.scheduleNotificationAsync({
    content: { title: 'Morning Lock', body: 'Test notification — your morning lock is ready.', sound: true },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 60 },
  });
}
