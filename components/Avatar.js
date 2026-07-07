import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { FONTS } from '../constants/typography';
import { useTheme } from '../services/ThemeContext';

export default function Avatar({
  letter,
  uri,
  size = 38,
  background,
  color,
  fontSize = 15,
  borderColor,
  borderWidth = 2.5,
  style,
}) {
  const { colors } = useTheme();
  const styles = makeStyles();
  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: background || colors.blueDeep,
        },
        borderColor ? { borderWidth, borderColor } : null,
        style,
      ]}
    >
      {uri ? (
        <Image source={{ uri }} style={styles.image} resizeMode="cover" />
      ) : (
        <Text style={[styles.letter, { color: color || colors.white, fontSize }]}>{letter}</Text>
      )}
    </View>
  );
}

const makeStyles = () =>
  StyleSheet.create({
    avatar: {
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    image: {
      width: '100%',
      height: '100%',
    },
    letter: {
      fontFamily: FONTS.extrabold,
    },
  });
