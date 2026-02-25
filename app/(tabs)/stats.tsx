import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SESSION_HISTORY_KEY, type SessionRecord } from '@/lib/sessionHistory';

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
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(SESSION_HISTORY_KEY)
      .then(raw => {
        if (raw) setHistory(JSON.parse(raw));
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  if (!loaded) return null;

  const total = history.length;
  const completed = history.filter(r => r.status === 'completed').length;
  const failed = total - completed;
  const successRate = total > 0 ? Math.round((completed / total) * 100) : 0;
  const totalTasksCompleted = history.reduce((sum, r) => sum + r.tasksCompleted, 0);
  const totalOutside = history.reduce((sum, r) => sum + r.outsideSeconds, 0);
  const avgOutside = total > 0 ? Math.round(totalOutside / total) : 0;

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
        <Row label="Total Seconds Outside" value={String(totalOutside)} />
        <Row label="Avg Outside Per Session" value={`${avgOutside}s`} />
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
