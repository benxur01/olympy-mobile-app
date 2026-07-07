import React from 'react';
import { View, StyleSheet } from 'react-native';
import { RADIUS } from '../constants/spacing';
import { useTheme } from '../services/ThemeContext';

export default function Card({
  children,
  style,
  radius = RADIUS.cardMd,
  borderColor,
  background,
  elevated = true,
}) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  return (
    <View
      style={[
        styles.card,
        { borderRadius: radius, borderColor: borderColor || colors.border, backgroundColor: background || colors.surface },
        elevated ? styles.elevation : null,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const makeStyles = (colors) =>
  StyleSheet.create({
    card: {
      borderWidth: 1,
    },
    // Soft Material 3 surface lift — subtle so nested cards don't stack heavily.
    elevation: {
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.05,
      shadowRadius: 10,
      elevation: 1,
    },
  });
