import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChatFabIcon } from './icons/Icons';
import { useTheme } from '../services/ThemeContext';
import { TAB_BAR_CONTENT_HEIGHT } from './TabBar';

export default function Fab({ onPress, bottom, right = 16 }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = makeStyles(colors);
  // Tab bar endi kontent ustida suzib turadi (o'z joyini egallamaydi) —
  // shuning uchun FAB navbar tagida qolib ketmasligi uchun uning balandligi
  // + insets hisobga olinadi.
  const defaultBottom = TAB_BAR_CONTENT_HEIGHT + insets.bottom + 16;
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[styles.fab, { bottom: bottom ?? defaultBottom, right }]}
    >
      <ChatFabIcon size={24} />
    </TouchableOpacity>
  );
}

const makeStyles = (colors) =>
  StyleSheet.create({
    fab: {
      position: 'absolute',
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: colors.blue,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.28,
      shadowRadius: 14,
      elevation: 6,
      zIndex: 6,
    },
  });
