import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../services/ThemeContext';

export default function ProgressBar({ progress = 0, height = 8, color, track, style }) {
  const { colors } = useTheme();
  const styles = makeStyles();
  return (
    <View style={[styles.track, { height, borderRadius: height / 2, backgroundColor: track || colors.barIdle }, style]}>
      <View
        style={{
          width: `${Math.min(Math.max(progress, 0), 100)}%`,
          height: '100%',
          backgroundColor: color || colors.blue,
          borderRadius: height / 2,
        }}
      />
    </View>
  );
}

const makeStyles = () =>
  StyleSheet.create({
    track: {
      overflow: 'hidden',
    },
  });
