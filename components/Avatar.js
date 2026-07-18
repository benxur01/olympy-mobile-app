import React, { useEffect, useState } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { FONTS } from '../constants/typography';
import { useTheme } from '../services/ThemeContext';
import { API_BASE_URL } from '../services/config';

// Backend avatar_url ba'zan absolyut (Cloudinary/S3), ba'zan nisbiy
// (/media/avatars/...) — Image uchun to'liq URL kerak.
export function resolveAvatarUri(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const s = raw.trim();
  if (!s) return null;
  if (/^https?:\/\//i.test(s) || s.startsWith('data:') || s.startsWith('file:')) return s;
  return `${API_BASE_URL}${s.startsWith('/') ? '' : '/'}${s}`;
}

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
  const resolved = resolveAvatarUri(uri);
  const [imgFailed, setImgFailed] = useState(false);
  useEffect(() => {
    setImgFailed(false);
  }, [resolved]);
  const showImage = !!resolved && !imgFailed;

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
      {showImage ? (
        <Image
          source={{ uri: resolved }}
          style={styles.image}
          resizeMode="cover"
          onError={() => setImgFailed(true)}
        />
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
