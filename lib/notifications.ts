import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DAILY_ID_KEY = '@morning_lock/daily_notification_id';
const TIME_KEY = '@morning_lock/scheduled_time';

export interface ScheduledTime {
  hour: number;
  minute: number;
}

// Show alerts/sound even when the app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/** Request notification permissions. Returns true if granted. */
export async function requestPermissions(): Promise<boolean> {
  const { status: current } = await Notifications.getPermissionsAsync();
  if (current === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

/**
 * Schedule (or reschedule) a daily repeating notification at the given hour/minute.
 * Cancels any previously scheduled daily notification first.
 * Returns the new notification ID.
 */
export async function scheduleDailyNotification(
  hour: number,
  minute: number,
): Promise<string> {
  const prevId = await AsyncStorage.getItem(DAILY_ID_KEY).catch(() => null);
  if (prevId) {
    await Notifications.cancelScheduledNotificationAsync(prevId).catch(() => {});
  }

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Morning Lock',
      body: 'Time to start your morning routine.',
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });

  await AsyncStorage.setItem(DAILY_ID_KEY, id).catch(() => {});
  return id;
}

/** Persist the user's chosen alarm time. */
export async function saveScheduledTime(hour: number, minute: number): Promise<void> {
  try {
    await AsyncStorage.setItem(TIME_KEY, JSON.stringify({ hour, minute }));
  } catch {}
}

/** Load the user's previously saved alarm time, or null if none. */
export async function loadScheduledTime(): Promise<ScheduledTime | null> {
  try {
    const raw = await AsyncStorage.getItem(TIME_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ScheduledTime;
  } catch {
    return null;
  }
}

/** Cancel the stored daily notification. */
export async function cancelDailyNotification(): Promise<void> {
  const id = await AsyncStorage.getItem(DAILY_ID_KEY).catch(() => null);
  if (id) {
    await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
    await AsyncStorage.removeItem(DAILY_ID_KEY).catch(() => {});
  }
}

/**
 * Schedule a one-off test notification 1 minute from now.
 * Returns the notification ID.
 */
export async function scheduleTestNotification(): Promise<string> {
  return Notifications.scheduleNotificationAsync({
    content: {
      title: 'Morning Lock',
      body: 'Test notification — your morning lock is ready.',
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 60,
    },
  });
}
