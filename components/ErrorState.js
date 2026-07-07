import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FONTS } from '../constants/typography';
import { WarningIcon } from './icons/Icons';
import Button from './Button';
import { useTheme } from '../services/ThemeContext';

export default function ErrorState({
  title = 'Xatolik yuz berdi',
  message = "Ma'lumotlarni yuklab bo'lmadi. Internet aloqasini tekshiring.",
  onRetry,
}) {
  const { colors, tints } = useTheme();
  const styles = makeStyles(colors, tints);
  return (
    <View style={styles.wrap}>
      <View style={styles.iconWrap}>
        <WarningIcon size={26} color={colors.red} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {onRetry ? (
        <Button title="Qayta urinish" variant="primary" height={46} radius={12} fontSize={14} style={styles.button} onPress={onRetry} />
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
      gap: 10,
    },
    iconWrap: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: tints.red13,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 6,
    },
    title: {
      fontSize: 17,
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
