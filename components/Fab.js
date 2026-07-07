import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { ChatFabIcon } from './icons/Icons';
import { useTheme } from '../services/ThemeContext';

export default function Fab({ onPress, bottom = 16, right = 16 }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={[styles.fab, { bottom, right }]}>
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
