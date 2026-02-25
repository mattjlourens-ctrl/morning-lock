import React from 'react';
import { Text, StyleSheet } from 'react-native';

interface Props {
  secondsLeft: number;
}

export function Timer({ secondsLeft }: Props) {
  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const ss = String(secondsLeft % 60).padStart(2, '0');

  return <Text style={styles.text}>{mm}:{ss}</Text>;
}

const styles = StyleSheet.create({
  text: {
    fontSize: 80,
    fontWeight: '200',
    color: '#FFFFFF',
    letterSpacing: 4,
    fontVariant: ['tabular-nums'],
  },
});
