import React from 'react';
import { Text, StyleSheet } from 'react-native';
import Card from './Card';
import { FONTS } from '../constants/typography';
import { RADIUS } from '../constants/spacing';
import { useTheme } from '../services/ThemeContext';

export default function StatCard({
  label,
  value,
  note,
  noteColor,
  valueColor,
  valueSize = 24,
  icon,
  radius = RADIUS.cardLg,
  borderColor,
  background,
  style,
}) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  return (
    <Card radius={radius} borderColor={borderColor || colors.border} background={background || colors.surface} style={[styles.card, style]}>
      {icon || null}
      <Text style={[styles.label, icon ? { marginTop: 0 } : null]}>{label}</Text>
      <Text style={[styles.value, { color: valueColor || colors.text, fontSize: valueSize }]}>{value}</Text>
      {note ? <Text style={[styles.note, { color: noteColor || colors.textSecondary }]}>{note}</Text> : null}
    </Card>
  );
}

const makeStyles = (colors) =>
  StyleSheet.create({
    card: {
      flex: 1,
      padding: 14,
    },
    label: {
      fontSize: 11,
      fontFamily: FONTS.bold,
      color: colors.textSecondary,
    },
    value: {
      fontFamily: FONTS.extrabold,
      marginTop: 4,
    },
    note: {
      fontSize: 11,
      fontFamily: FONTS.extrabold,
      marginTop: 3,
    },
  });
