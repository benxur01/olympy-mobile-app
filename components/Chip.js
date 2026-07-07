import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { FONTS } from '../constants/typography';
import { useTheme } from '../services/ThemeContext';

export default function Chip({
  label,
  active = false,
  icon,
  radius = 18,
  paddingV = 8,
  paddingH = 13,
  fontSize = 12,
  activeBackground,
  activeBorder,
  activeColor,
  style,
  onPress,
}) {
  const { colors, tints } = useTheme();
  const styles = makeStyles(colors);
  const bg = activeBackground || tints.blue14;
  const border = activeBorder || colors.blue;
  const color = activeColor || colors.blueLight;
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={[
        styles.chip,
        {
          borderRadius: radius,
          paddingVertical: paddingV,
          paddingHorizontal: paddingH,
          borderColor: active ? border : colors.borderStrong,
          backgroundColor: active ? bg : colors.surface,
        },
        style,
      ]}
    >
      {icon || null}
      <Text
        style={{
          fontSize,
          fontFamily: active ? FONTS.extrabold : FONTS.bold,
          color: active ? color : colors.textSecondary,
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const makeStyles = () =>
  StyleSheet.create({
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      borderWidth: 1,
      alignSelf: 'flex-start',
    },
  });
