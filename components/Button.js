import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { FONTS } from '../constants/typography';
import { useTheme } from '../services/ThemeContext';

const buildVariants = (colors, tints) => ({
  primary: { backgroundColor: colors.blue, color: colors.white },
  success: { backgroundColor: colors.green, color: colors.white },
  gold: { backgroundColor: colors.gold, color: colors.goldText },
  dark: { backgroundColor: colors.surface, color: colors.text, borderWidth: 1, borderColor: colors.borderStrong },
  muted: { backgroundColor: colors.surface, color: colors.textSecondary, borderWidth: 1, borderColor: colors.borderStrong },
  danger: { backgroundColor: tints.red10, color: colors.red, borderWidth: 1, borderColor: tints.redBorder40 },
  payme: { backgroundColor: colors.payme, color: colors.paymeText },
  click: { backgroundColor: colors.click, color: colors.white },
});

export default function Button({
  title,
  variant = 'primary',
  height = 50,
  radius = 13,
  fontSize = 15,
  icon,
  shadow = false,
  style,
  textStyle,
  onPress,
  disabled,
}) {
  const { colors, tints } = useTheme();
  const VARIANTS = buildVariants(colors, tints);
  const styles = makeStyles(colors);
  const v = VARIANTS[variant] || VARIANTS.primary;
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.button,
        {
          height,
          borderRadius: radius,
          backgroundColor: v.backgroundColor,
          borderWidth: v.borderWidth || 0,
          borderColor: v.borderColor,
        },
        shadow ? styles.shadow : null,
        style,
      ]}
    >
      {icon || null}
      <Text style={[styles.title, { color: v.color, fontSize }, textStyle]}>{title}</Text>
    </TouchableOpacity>
  );
}

const makeStyles = (colors) =>
  StyleSheet.create({
    button: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    title: {
      fontFamily: FONTS.extrabold,
    },
    shadow: {
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.18,
      shadowRadius: 12,
      elevation: 4,
    },
  });
