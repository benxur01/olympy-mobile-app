import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Card from './Card';
import Badge from './Badge';
import Button from './Button';
import useFetch from '../services/useFetch';
import { studentApi } from '../services/api';
import { useTheme } from '../services/ThemeContext';
import { FONTS } from '../constants/typography';

// DH3. Streak himoyasi eslatmasi. Web: pages/RetentionWidgets.jsx (10-53).
// streak_count <= 3 bo'lsa yoki premium bo'lmasa-yu warning yo'q bo'lsa —
// hech narsa ko'rsatilmaydi (jim widget).
export default function StreakWarningBanner({ navigation }) {
  const { colors, tints } = useTheme();
  const styles = makeStyles(colors, tints);
  const { data } = useFetch(() => studentApi.streakWarning().then((r) => r.data), []);
  if (!data || (data.streak_count || 0) <= 3) return null;

  // Premium — informatsion, streak muzlatilgan (indigo/purple tone).
  if (data.is_premium) {
    return (
      <Card radius={16} elevated={false} background={tints.purple16} borderColor={tints.purpleBorder35} style={styles.row}>
        <Text style={styles.emoji}>❄️</Text>
        <View style={styles.body}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: colors.purpleLight }]}>Streak Premium Himoyasida!</Text>
            <Badge label="MUZLATILGAN" color={colors.purpleLight} background={tints.purple16} size={8.5} />
          </View>
          <Text style={styles.sub}>Bugun faol bo'la olmasangiz ham, ketma-ket faollik seriyangiz uzilmaydi.</Text>
        </View>
      </Card>
    );
  }

  if (!data.warning) return null;

  // Oddiy foydalanuvchi — seriya xavf ostida (amber/orange tone).
  return (
    <Card radius={16} elevated={false} background={tints.orange14} borderColor={tints.orangeBorder35} style={styles.row}>
      <Text style={styles.emoji}>🔥</Text>
      <View style={styles.body}>
        <Text style={[styles.title, { color: colors.orange }]}>{data.streak_count} kunlik seriya xavf ostida!</Text>
        <Text style={styles.sub}>{data.message} Uni premium bilan butunlay himoyalashni xohlaysizmi?</Text>
      </View>
      {navigation ? (
        <Button
          title="Muzlatish"
          variant="gold"
          height={36}
          radius={11}
          fontSize={12.5}
          style={styles.btn}
          onPress={() => navigation.navigate('Premium')}
        />
      ) : null}
    </Card>
  );
}

const makeStyles = (colors, tints) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 14,
    },
    emoji: {
      fontSize: 26,
    },
    body: {
      flex: 1,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 7,
    },
    title: {
      fontSize: 13.5,
      fontFamily: FONTS.extrabold,
      flexShrink: 1,
    },
    sub: {
      fontSize: 11.5,
      fontFamily: FONTS.semibold,
      color: colors.textSecondary,
      marginTop: 3,
      lineHeight: 15.5,
    },
    btn: {
      paddingHorizontal: 14,
    },
  });
