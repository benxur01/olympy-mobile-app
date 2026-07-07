import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { FONTS } from '../constants/typography';
import { useTheme } from '../services/ThemeContext';

export default function LoadingState({ message = 'Yuklanmoqda…' }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  return (
    <View style={styles.wrap}>
      <ActivityIndicator size="large" color={colors.blue} />
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const makeStyles = (colors) =>
  StyleSheet.create({
    wrap: {
      flex: 1,
      backgroundColor: colors.bg,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 14,
    },
    message: {
      fontSize: 13.5,
      fontFamily: FONTS.bold,
      color: colors.textSecondary,
    },
  });
