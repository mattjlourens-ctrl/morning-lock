import React, { useState, useCallback } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import { SESSION_HISTORY_KEY, type SessionRecord } from '@/lib/sessionHistory';

function formatTime(totalSeconds: number): string {
  if (!totalSeconds || totalSeconds < 0) return '0:00:00';
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const paddedMinutes = minutes < 10 ? `0${minutes}` : minutes;
  const paddedSeconds = seconds < 10 ? `0${seconds}` : seconds;
  return `${hours}:${paddedMinutes}:${paddedSeconds}`;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

export default function StatsScreen() {
  const [history, setHistory] = useState<SessionRecord[]>([]);

  const loadHistory = useCallback(async () => {
    const raw = await AsyncStorage.getItem(SESSION_HISTORY_KEY).catch(() => null);
    const parsed = raw ? JSON.parse(raw) : [];
    setHistory(parsed);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [loadHistory])
  );

  const total = history.length;
  const completed = history.filter(r => r.status === 'completed').length;
  const failed = total - completed;
  const successRate = total > 0 ? Math.round((completed / total) * 100) : 0;
  const totalTasksCompleted = history.reduce((sum, r) => sum + r.tasksCompleted, 0);
  const totalOutside = history.reduce((sum, r) => sum + r.outsideSeconds, 0);
  const avgOutside = total > 0 ? Math.round(totalOutside / total) : 0;
  const totalFocusTime = history.reduce((sum, r) => sum + ((r as SessionRecord & { actualFocusTime?: number }).actualFocusTime ?? (r.totalDuration - r.outsideSeconds)), 0);
  const avgFocusTime = total > 0 ? Math.round(totalFocusTime / total) : 0;

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.heading}>Stats</Text>

        <Row label="Sessions" value={String(total)} />
        <Row label="Completed" value={String(completed)} />
        <Row label="Failed" value={String(failed)} />
        <Row label="Success Rate" value={`${successRate}%`} />

        <View style={styles.divider} />

        <Row label="Total Tasks Completed" value={String(totalTasksCompleted)} />
        <Row label="Total Focus Time" value={formatTime(totalFocusTime)} />
        <Row label="Avg Focus Per Session" value={formatTime(avgFocusTime)} />
        <Row label="Total Time Outside" value={formatTime(totalOutside)} />
        <Row label="Avg Outside Per Session" value={formatTime(avgOutside)} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#000000',
  },
  content: {
    paddingHorizontal: 32,
    paddingTop: 52,
  },
  heading: {
    fontSize: 11,
    letterSpacing: 5,
    color: '#444444',
    textTransform: 'uppercase',
    marginBottom: 40,
    textAlign: 'center',
  },
  divider: {
    width: '100%',
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#222222',
    marginVertical: 24,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1A1A1A',
  },
  label: {
    fontSize: 10,
    letterSpacing: 2,
    color: '#444444',
    textTransform: 'uppercase',
  },
  value: {
    fontSize: 20,
    fontWeight: '200',
    color: '#FFFFFF',
  },
});
