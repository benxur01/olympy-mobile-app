import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FONTS } from '../constants/typography';

export default function Badge({ label, color, background, borderColor, size = 10.5, icon, style }) {
  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: background },
        borderColor ? { borderWidth: 1, borderColor } : null,
        style,
      ]}
    >
      {icon || null}
      <Text
        style={[styles.label, { color, fontSize: size }]}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  label: {
    fontFamily: FONTS.extrabold,
    flexShrink: 1,
  },
});
