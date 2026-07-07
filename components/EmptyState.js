import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FONTS } from '../constants/typography';
import { InboxIcon } from './icons/Icons';
import Button from './Button';
import { useTheme } from '../services/ThemeContext';

// Bo'sh natija holati — ma'lumot yo'q, lekin xato ham emas. Barcha ro'yxatli
// ekranlarda bir xil ko'rinish uchun (Tadbirlar, Arizalar, Nazorat, ...).
export default function EmptyState({
  title = "Hozircha bo'sh",
  message = "Ko'rsatadigan ma'lumot yo'q.",
  icon,
  actionLabel,
  onAction,
  compact = false,
}) {
  const { colors, tints } = useTheme();
  const styles = makeStyles(colors, tints);
  return (
    <View style={[styles.wrap, compact ? styles.compact : null]}>
      <View style={styles.iconWrap}>
        {icon || <InboxIcon size={24} color={colors.blueLight} />}
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {actionLabel && onAction ? (
        <Button
          title={actionLabel}
          variant="primary"
          height={44}
          radius={12}
          fontSize={14}
          style={styles.button}
          onPress={onAction}
        />
      ) : null}
    </View>
  );
}

const makeStyles = (colors, tints) =>
  StyleSheet.create({
    wrap: {
      flex: 1,
      backgroundColor: colors.bg,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 40,
      gap: 8,
    },
    compact: {
      flex: 0,
      paddingVertical: 44,
    },
    iconWrap: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: tints.blue10,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 6,
    },
    title: {
      fontSize: 16,
      fontFamily: FONTS.extrabold,
      color: colors.text,
    },
    message: {
      fontSize: 13,
      fontFamily: FONTS.semibold,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 19.5,
    },
    button: {
      alignSelf: 'stretch',
      marginTop: 12,
    },
  });
