import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { FONTS } from '../constants/typography';
import { NAV_BAR_HEIGHT } from '../constants/spacing';
import { useTheme } from '../services/ThemeContext';

export default function TabBar({ items, activeKey, onPress, style }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  return (
    <View style={[styles.bar, style]}>
      {items.map((item) => {
        const active = item.key === activeKey;
        const color = active ? colors.blue : colors.textMuted;
        return (
          <TouchableOpacity
            key={item.key}
            activeOpacity={0.7}
            onPress={() => onPress && onPress(item.key)}
            style={styles.item}
          >
            <View style={[styles.pill, active ? styles.pillActive : null]}>
              <View style={styles.iconBox}>
                {item.icon(color)}
                {item.dot ? <View style={styles.dot} /> : null}
              </View>
            </View>
            <Text
              style={[
                styles.label,
                { color, fontFamily: active ? FONTS.extrabold : FONTS.bold },
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const makeStyles = (colors) =>
  StyleSheet.create({
    bar: {
      height: NAV_BAR_HEIGHT,
      backgroundColor: colors.navBg,
      borderTopWidth: 1,
      borderTopColor: colors.divider,
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-around',
      paddingTop: 9,
    },
    item: {
      alignItems: 'center',
      gap: 3,
    },
    // Material 3 active-indicator pill behind the icon.
    pill: {
      height: 30,
      minWidth: 56,
      paddingHorizontal: 18,
      borderRadius: 999,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pillActive: {
      backgroundColor: colors.secondaryContainer,
    },
    iconBox: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    dot: {
      position: 'absolute',
      top: -3,
      right: -5,
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.red,
      borderWidth: 2,
      borderColor: colors.navBg,
    },
    label: {
      fontSize: 10,
    },
  });
