import React from 'react';
import { View, StyleSheet } from 'react-native';

export default function IconBox({ size = 40, radius = 12, background, borderColor, children, style }) {
  return (
    <View
      style={[
        styles.box,
        {
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor: background,
        },
        borderColor ? { borderWidth: 1, borderColor } : null,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
