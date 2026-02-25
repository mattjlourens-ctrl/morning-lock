import { useState, useEffect } from 'react';
import {
  requestPermissions,
  scheduleDailyNotification,
  saveScheduledTime,
  loadScheduledTime,
  type ScheduledTime,
} from '@/lib/notifications';

export function useScheduledTime() {
  const [time, setTime] = useState<ScheduledTime | null>(null);

  // Restore saved time on mount
  useEffect(() => {
    loadScheduledTime().then(saved => {
      if (saved) setTime(saved);
    });
  }, []);

  /**
   * Request permissions, schedule the daily notification, and persist the time.
   * Returns false if permission was denied.
   */
  async function scheduleTime(hour: number, minute: number): Promise<boolean> {
    const granted = await requestPermissions();
    if (!granted) return false;

    await scheduleDailyNotification(hour, minute);
    await saveScheduledTime(hour, minute);
    setTime({ hour, minute });
    return true;
  }

  return { time, scheduleTime };
}
