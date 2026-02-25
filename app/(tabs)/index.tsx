import { TaskList } from "@/components/TaskList";
import { TimePickerModal } from "@/components/TimePickerModal";
import { Timer } from "@/components/Timer";
import { useMorningLock } from "@/hooks/useMorningLock";
import { useScheduledTime } from "@/hooks/useScheduledTime";
import { router, useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useState } from "react";
import {
  Alert,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function formatTime(hour: number, minute: number): string {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export default function MorningLockScreen() {
  const {
    secondsLeft,
    completedIds,
    handleToggle,
    canUnlock,
    hardMode,
    toggleHardMode,
    handleUnlock,
    status,
    frictionPause,
    frictionCountdown,
    userTasks,
    sessionTasks,
    refreshUserTasks,
  } = useMorningLock();

  const { time, scheduleTime } = useScheduledTime();
  const [pickerVisible, setPickerVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refreshUserTasks();
    }, [refreshUserTasks]),
  );

  async function handleTimeSet(hour: number, minute: number) {
    setPickerVisible(false);
    const granted = await scheduleTime(hour, minute);
    if (!granted) {
      Alert.alert("Permission denied", "Enable notifications in Settings.");
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="light" />
      <View style={styles.inner}>
        <Text style={styles.heading}>Morning Lock</Text>

        {status === "active" && <Timer secondsLeft={secondsLeft} />}
        {status === "idle" && <Text style={styles.timerIdle}>- -:- -</Text>}
        {status === "completed" && <Text style={styles.timerDone}>✓</Text>}
        {status === "failed" && <Text style={styles.timerFailed}>✕</Text>}

        <View style={styles.divider} />

        <View style={styles.taskContainer}>
          {status === "active" ? (
            <TaskList
              tasks={sessionTasks}
              completedIds={completedIds}
              onToggle={handleToggle}
            />
          ) : status === "completed" || status === "failed" ? (
            <TaskList
              tasks={sessionTasks}
              completedIds={completedIds}
              onToggle={() => {}}
            />
          ) : (
            userTasks.map((task) => (
              <View key={task.id} style={styles.idleTask}>
                <Text style={styles.idleTaskLabel}>{task.label}</Text>
              </View>
            ))
          )}

          {status !== "active" && (
            <TouchableOpacity
              style={styles.editTasksBtn}
              onPress={() => router.push("/edit-tasks")}
              activeOpacity={0.7}
            >
              <Text style={styles.editTasksBtnText}>Edit Tasks</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.alarmSection}>
          <Text style={styles.alarmLabel}>Morning Alarm</Text>
          <TouchableOpacity
            onPress={() => setPickerVisible(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.alarmTime}>
              {time ? formatTime(time.hour, time.minute) : "——:——"}
            </Text>
          </TouchableOpacity>
          <Text style={styles.alarmHint}>
            {time ? "Tap to change" : "Tap to set"}
          </Text>
        </View>

        <View style={styles.hardModeRow}>
          <View>
            <Text style={styles.hardModeLabel}>Hard Mode</Text>
            <Text style={styles.hardModeHint}>
              {hardMode ? "Timer must reach 0:00" : "Complete tasks to unlock"}
            </Text>
          </View>
          <Switch
            value={hardMode}
            onValueChange={toggleHardMode}
            trackColor={{ false: "#1A1A1A", true: "#FFFFFF" }}
            thumbColor={hardMode ? "#000000" : "#333333"}
            ios_backgroundColor="#1A1A1A"
          />
        </View>

        {canUnlock && status === "active" && (
          <TouchableOpacity
            style={styles.unlockButton}
            onPress={handleUnlock}
            activeOpacity={0.8}
          >
            <Text style={styles.unlockLabel}>Unlock</Text>
          </TouchableOpacity>
        )}
      </View>

      {pickerVisible && (
        <TimePickerModal
          initialHour={time?.hour ?? 7}
          initialMinute={time?.minute ?? 0}
          onConfirm={handleTimeSet}
          onCancel={() => setPickerVisible(false)}
        />
      )}

      {frictionPause && (
        <View style={styles.frictionOverlay}>
          <Text style={styles.frictionLabel}>Regain focus</Text>
          <Text style={styles.frictionCountdown}>{frictionCountdown}</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#000000",
  },
  inner: {
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: 52,
    alignItems: "center",
  },
  heading: {
    fontSize: 11,
    letterSpacing: 5,
    color: "#444444",
    textTransform: "uppercase",
    marginBottom: 40,
  },
  timerIdle: {
    fontSize: 80,
    fontWeight: "200",
    color: "#2A2A2A",
    letterSpacing: 4,
    fontVariant: ["tabular-nums"],
  },
  timerDone: {
    fontSize: 80,
    fontWeight: "200",
    color: "#FFFFFF",
    letterSpacing: 4,
  },
  timerFailed: {
    fontSize: 80,
    fontWeight: "200",
    color: "#333333",
    letterSpacing: 4,
  },
  divider: {
    width: "100%",
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#222222",
    marginTop: 40,
    marginBottom: 8,
  },
  taskContainer: {
    width: "100%",
  },
  idleTask: {
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#1A1A1A",
  },
  idleTaskLabel: {
    fontSize: 15,
    color: "#888888",
  },
  editTasksBtn: {
    marginTop: 20,
    alignSelf: "flex-start",
  },
  editTasksBtnText: {
    fontSize: 11,
    letterSpacing: 4,
    color: "#AAAAAA",
    textTransform: "uppercase",
  },
  alarmSection: {
    marginTop: 40,
    alignItems: "center",
  },
  alarmLabel: {
    fontSize: 10,
    letterSpacing: 4,
    color: "#444444",
    textTransform: "uppercase",
    marginBottom: 10,
  },
  alarmTime: {
    fontSize: 40,
    fontWeight: "200",
    color: "#FFFFFF",
    letterSpacing: 4,
    fontVariant: ["tabular-nums"],
  },
  alarmHint: {
    marginTop: 8,
    fontSize: 10,
    letterSpacing: 2,
    color: "#333333",
    textTransform: "uppercase",
  },
  hardModeRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#1C1C1C",
    paddingBottom: 88,
  },
  hardModeLabel: {
    fontSize: 10,
    letterSpacing: 4,
    color: "#444444",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  hardModeHint: {
    fontSize: 10,
    letterSpacing: 1,
    color: "#2A2A2A",
    textTransform: "uppercase",
  },
  unlockButton: {
    position: "absolute",
    bottom: 48,
    borderWidth: 1,
    borderColor: "#FFFFFF",
    paddingHorizontal: 48,
    paddingVertical: 14,
  },
  unlockLabel: {
    color: "#FFFFFF",
    fontSize: 12,
    letterSpacing: 5,
    textTransform: "uppercase",
  },
  frictionOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000000",
    alignItems: "center",
    justifyContent: "center",
  },
  frictionLabel: {
    fontSize: 11,
    letterSpacing: 5,
    color: "#444444",
    textTransform: "uppercase",
    marginBottom: 24,
  },
  frictionCountdown: {
    fontSize: 80,
    fontWeight: "200",
    color: "#FFFFFF",
    letterSpacing: 4,
    fontVariant: ["tabular-nums"],
  },
});
