import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { DEFAULT_TASKS, type Task } from '@/constants/defaultTasks';
import { appendSessionRecord } from '@/lib/sessionHistory';

const STORAGE_KEY = '@morning_lock/state';
const HARD_MODE_KEY = '@morning_lock/hard_mode';
const ABANDONMENT_NOTIFICATION_KEY = '@morning_lock/abandonment_notification_id';
const USER_TASKS_KEY = '@morning_lock/user_tasks';
const SESSION_TASKS_KEY = '@morning_lock/session_tasks';
const DURATION = 30 * 60;
const ABANDONMENT_SECONDS = 15;

export type SessionStatus = 'idle' | 'active' | 'completed' | 'failed';

interface SavedState {
  secondsLeft: number;
  completedIds: string[];
  savedAt: number;
  status: SessionStatus;
}

async function persist(secondsLeft: number, completedIds: string[], status: SessionStatus) {
  try {
    const state: SavedState = { secondsLeft, completedIds, savedAt: Date.now(), status };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

async function restore(): Promise<{ secondsLeft: number; completedIds: string[]; status: SessionStatus }> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return { secondsLeft: DURATION, completedIds: [], status: 'idle' };

    const saved: SavedState = JSON.parse(raw);
    // Backward compat: old saves have no status field, treat as active
    const status: SessionStatus = saved.status ?? 'active';

    // Frozen states — do not subtract elapsed time
    if (status === 'completed' || status === 'failed') {
      return { secondsLeft: saved.secondsLeft, completedIds: saved.completedIds, status };
    }

    const elapsed = Math.floor((Date.now() - saved.savedAt) / 1000);
    const secondsLeft = Math.max(0, saved.secondsLeft - elapsed);
    return { secondsLeft, completedIds: saved.completedIds, status };
  } catch {
    return { secondsLeft: DURATION, completedIds: [], status: 'idle' };
  }
}

export function useMorningLock() {
  const [secondsLeft, setSecondsLeft] = useState(DURATION);
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  // userTasks: the editable template edited only in idle state
  const [userTasks, setUserTasks] = useState<Task[]>(DEFAULT_TASKS);
  // sessionTasks: snapshot of userTasks taken at session start, used during active/completed/failed
  const [sessionTasks, setSessionTasks] = useState<Task[]>(DEFAULT_TASKS);
  const [status, setStatus] = useState<SessionStatus>('idle');
  const [hardMode, setHardMode] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [frictionPause, setFrictionPause] = useState(false);
  const [frictionCountdown, setFrictionCountdown] = useState(3);

  // Always holds the latest values — safe to read from callbacks
  const latestRef = useRef({ secondsLeft, completedIds, status, userTasks, sessionTasks });
  latestRef.current = { secondsLeft, completedIds, status, userTasks, sessionTasks };

  // Set only when the app fully backgrounds during an active session
  const wentToBackgroundWhileActive = useRef(false);

  // ID of the currently scheduled abandonment notification (null when none is pending)
  const abandonmentNotificationIdRef = useRef<string | null>(null);

  // When abandonment is detected on cold start, store the notification ID here so the
  // response listener (which fires shortly after) can recognise it and skip resetSession()
  const handledAbandonmentResponseRef = useRef<string | null>(null);

  // Outside-time tracking: accumulated seconds spent outside the app during an active session
  const outsideSecondsRef = useRef(0);
  // Timestamp (ms) when the app most recently went to background while a session was active
  const backgroundStartRef = useRef<number | null>(null);

  // Restore persisted state, task lists, hard mode, and check for cold-start abandonment
  useEffect(() => {
    Promise.all([
      restore(),
      AsyncStorage.getItem(HARD_MODE_KEY).catch(() => null),
      AsyncStorage.getItem(ABANDONMENT_NOTIFICATION_KEY).catch(() => null),
      AsyncStorage.getItem(USER_TASKS_KEY).catch(() => null),
      AsyncStorage.getItem(SESSION_TASKS_KEY).catch(() => null),
    ]).then(async ([restoreResult, hardModeRaw, storedNotifId, userTasksRaw, sessionTasksRaw]) => {
      let { secondsLeft, completedIds, status } = restoreResult;

      const rawUserTasks: Task[] = userTasksRaw ? JSON.parse(userTasksRaw) : DEFAULT_TASKS;
      const loadedUserTasks = rawUserTasks.map(t => ({ ...t, recurring: t.recurring ?? true }));
      // sessionTasks falls back to userTasks for backward compat (no SESSION_TASKS_KEY stored yet)
      const rawSessionTasks: Task[] = sessionTasksRaw ? JSON.parse(sessionTasksRaw) : rawUserTasks;
      const loadedSessionTasks = rawSessionTasks.map(t => ({ ...t, recurring: t.recurring ?? true }));

      if (storedNotifId && status === 'active') {
        // Cold start with a pending abandonment notification ID in storage.
        // Check whether the notification has already fired (no longer in the scheduled list).
        const scheduled = await Notifications.getAllScheduledNotificationsAsync().catch(() => []);
        const stillPending = scheduled.some(n => n.identifier === storedNotifId);

        if (!stillPending) {
          // Notification fired while the app was killed — freeze and mark as failed
          handledAbandonmentResponseRef.current = storedNotifId;
          status = 'failed';
          persist(secondsLeft, completedIds, 'failed');
        } else {
          // App opened before the 15 s window elapsed — cancel the notification
          await Notifications.cancelScheduledNotificationAsync(storedNotifId).catch(() => {});
        }

        await AsyncStorage.removeItem(ABANDONMENT_NOTIFICATION_KEY).catch(() => {});
        abandonmentNotificationIdRef.current = null;
      }

      setSecondsLeft(secondsLeft);
      setCompletedIds(completedIds);
      setUserTasks(loadedUserTasks);
      setSessionTasks(loadedSessionTasks);
      setStatus(status);
      if (hardModeRaw !== null) setHardMode(JSON.parse(hardModeRaw));
      setIsLoaded(true);
    });
  }, []);

  // Reset to a fresh active session — snapshots userTasks, cancels any pending abandonment
  const resetSession = useCallback(() => {
    const { userTasks } = latestRef.current;
    const notifId = abandonmentNotificationIdRef.current;
    if (notifId !== null) {
      abandonmentNotificationIdRef.current = null;
      Notifications.cancelScheduledNotificationAsync(notifId).catch(() => {});
      AsyncStorage.removeItem(ABANDONMENT_NOTIFICATION_KEY).catch(() => {});
    }
    const snapshot = userTasks.map(t => ({ ...t }));
    setSecondsLeft(DURATION);
    setCompletedIds([]);
    setSessionTasks(snapshot);
    setStatus('active');
    persist(DURATION, [], 'active');
    AsyncStorage.setItem(SESSION_TASKS_KEY, JSON.stringify(snapshot)).catch(() => {});
    outsideSecondsRef.current = 0;
    backgroundStartRef.current = null;
  }, []);

  // Persist on background; schedule/cancel abandonment notification; trigger friction on return
  useEffect(() => {
    const sub = AppState.addEventListener('change', async nextState => {
      const { secondsLeft, completedIds, status, sessionTasks } = latestRef.current;

      if (nextState === 'background' || nextState === 'inactive') {
        persist(secondsLeft, completedIds, status);
      }

      // Only act on full background — avoids false positives from brief iOS inactive events
      if (nextState === 'background' && status === 'active') {
        wentToBackgroundWhileActive.current = true;
        backgroundStartRef.current = Date.now();

        // Schedule the abandonment notification when the session is genuinely in progress
        const allDone = completedIds.length === sessionTasks.length;
        if (secondsLeft > 0 && !allDone && abandonmentNotificationIdRef.current === null) {
          const id = await Notifications.scheduleNotificationAsync({
            content: {
              title: 'Focus Session Failed',
              body: 'You left before completing your focus session.',
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
              seconds: ABANDONMENT_SECONDS,
            },
          }).catch(() => null);

          if (id) {
            abandonmentNotificationIdRef.current = id;
            await AsyncStorage.setItem(ABANDONMENT_NOTIFICATION_KEY, id).catch(() => {});
          }
        }
      }

      if (nextState === 'active') {
        const notifId = abandonmentNotificationIdRef.current;

        if (notifId !== null) {
          // Clear immediately to prevent duplicate handling
          abandonmentNotificationIdRef.current = null;
          await AsyncStorage.removeItem(ABANDONMENT_NOTIFICATION_KEY).catch(() => {});

          const scheduled = await Notifications.getAllScheduledNotificationsAsync().catch(() => []);
          const stillPending = scheduled.some(n => n.identifier === notifId);

          if (stillPending) {
            // User returned before the notification fired — cancel it and run friction pause
            await Notifications.cancelScheduledNotificationAsync(notifId).catch(() => {});
            if (backgroundStartRef.current !== null) {
              outsideSecondsRef.current += Math.floor((Date.now() - backgroundStartRef.current) / 1000);
              backgroundStartRef.current = null;
            }
            if (wentToBackgroundWhileActive.current) {
              wentToBackgroundWhileActive.current = false;
              if (latestRef.current.status === 'active') {
                setFrictionPause(true);
                setFrictionCountdown(3);
              }
            }
          } else {
            // Notification already fired — freeze state and mark as failed
            backgroundStartRef.current = null;
            wentToBackgroundWhileActive.current = false;
            if (latestRef.current.status === 'active') {
              const { secondsLeft: frozenSeconds, completedIds: frozenTasks, sessionTasks: frozenSessionTasks } = latestRef.current;
              setStatus('failed');
              persist(frozenSeconds, frozenTasks, 'failed');
              appendSessionRecord({
                id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
                date: new Date().toISOString(),
                status: 'failed',
                totalDuration: DURATION,
                outsideSeconds: outsideSecondsRef.current,
                tasksCompleted: frozenTasks.length,
                totalTasks: frozenSessionTasks.length,
              }).catch(() => {});
              outsideSecondsRef.current = 0;
            }
          }
        } else if (wentToBackgroundWhileActive.current) {
          // No abandonment notification was scheduled (tasks were done, timer was 0, etc.)
          if (backgroundStartRef.current !== null) {
            outsideSecondsRef.current += Math.floor((Date.now() - backgroundStartRef.current) / 1000);
            backgroundStartRef.current = null;
          }
          wentToBackgroundWhileActive.current = false;
          if (latestRef.current.status === 'active') {
            setFrictionPause(true);
            setFrictionCountdown(3);
          }
        }
      }
    });
    return () => sub.remove();
  }, []);

  // Friction countdown: ticks 3 → 2 → 1, then clears the pause
  useEffect(() => {
    if (!frictionPause || frictionCountdown <= 0) return;
    const id = setTimeout(() => {
      if (frictionCountdown === 1) {
        setFrictionPause(false);
        setFrictionCountdown(3); // reset for the next time
      } else {
        setFrictionCountdown(c => c - 1);
      }
    }, 1000);
    return () => clearTimeout(id);
  }, [frictionPause, frictionCountdown]);

  // Morning alarm received in foreground → start new session
  // Notification tapped (background/killed) → start new session, unless it was the abandonment notification
  useEffect(() => {
    const receivedSub = Notifications.addNotificationReceivedListener(() => resetSession());
    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      const tappedId = response.notification.request.identifier;
      if (handledAbandonmentResponseRef.current === tappedId) {
        handledAbandonmentResponseRef.current = null;
        return;
      }
      resetSession();
    });
    return () => {
      receivedSub.remove();
      responseSub.remove();
    };
  }, [resetSession]);

  // Countdown — interval runs only during an active session; cleared on status change or unmount
  useEffect(() => {
    if (!isLoaded || status !== 'active') return;
    const id = setInterval(() => setSecondsLeft(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [isLoaded, status]);

  // Auto-complete when the timer reaches 0 during an active session
  useEffect(() => {
    if (status !== 'active' || secondsLeft > 0) return;
    const { completedIds, userTasks, sessionTasks } = latestRef.current;
    setStatus('completed');
    persist(0, completedIds, 'completed');
    const updated = userTasks.filter(t => t.recurring);
    setUserTasks(updated);
    setSessionTasks(updated);
    AsyncStorage.setItem(USER_TASKS_KEY, JSON.stringify(updated)).catch(() => {});
    appendSessionRecord({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      date: new Date().toISOString(),
      status: 'completed',
      totalDuration: DURATION,
      outsideSeconds: outsideSecondsRef.current,
      tasksCompleted: completedIds.length,
      totalTasks: sessionTasks.length,
    }).catch(() => {});
    outsideSecondsRef.current = 0;
    backgroundStartRef.current = null;
  }, [status, secondsLeft]);

  const handleToggle = useCallback((id: string) => {
    const { secondsLeft, completedIds, status } = latestRef.current;
    const next = completedIds.includes(id)
      ? completedIds.filter(x => x !== id)
      : [...completedIds, id];
    persist(secondsLeft, next, status);
    setCompletedIds(next);
  }, []);

  const toggleHardMode = useCallback((value: boolean) => {
    setHardMode(value);
    AsyncStorage.setItem(HARD_MODE_KEY, JSON.stringify(value)).catch(() => {});
  }, []);

  // Pressing unlock moves to completed — timer and tasks are preserved
  const handleUnlock = useCallback(() => {
    const { secondsLeft, completedIds, userTasks, sessionTasks } = latestRef.current;
    setStatus('completed');
    persist(secondsLeft, completedIds, 'completed');
    const updated = userTasks.filter(t => t.recurring);
    setUserTasks(updated);
    setSessionTasks(updated);
    AsyncStorage.setItem(USER_TASKS_KEY, JSON.stringify(updated)).catch(() => {});
    appendSessionRecord({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      date: new Date().toISOString(),
      status: 'completed',
      totalDuration: DURATION,
      outsideSeconds: outsideSecondsRef.current,
      tasksCompleted: completedIds.length,
      totalTasks: sessionTasks.length,
    }).catch(() => {});
    outsideSecondsRef.current = 0;
    backgroundStartRef.current = null;
  }, []);

  // Re-reads userTasks from storage — called by the index screen on focus after editing
  const refreshUserTasks = useCallback(async () => {
    const raw = await AsyncStorage.getItem(USER_TASKS_KEY).catch(() => null);
    if (!raw) return;
    const tasks = (JSON.parse(raw) as Task[]).map(t => ({ ...t, recurring: t.recurring ?? true }));
    setUserTasks(tasks);
  }, []);

  const allTasksDone = completedIds.length === sessionTasks.length && sessionTasks.length > 0;
  const canUnlock = hardMode
    ? allTasksDone && secondsLeft === 0
    : allTasksDone;

  return {
    secondsLeft, completedIds, handleToggle, canUnlock, hardMode, toggleHardMode,
    resetSession, handleUnlock, status, frictionPause, frictionCountdown,
    userTasks, sessionTasks, refreshUserTasks,
  };
}
