import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Card from './Card';
import Button from './Button';
import useFetch from '../services/useFetch';
import { studentApi } from '../services/api';
import { useTheme } from '../services/ThemeContext';
import { FONTS } from '../constants/typography';

// OB4. Siz uchun olimpiada taklifi. Web: pages/RetentionWidgets.jsx (456-482).
// Mobil'da alohida olimpiada obyektini qidirmaymiz — shunchaki "Tadbirlar"
// ro'yxatiga o'tamiz.
export default function SuggestedOlympiadCard({ navigation }) {
  const { colors, tints } = useTheme();
  const styles = makeStyles(colors, tints);
  const { data, loading } = useFetch(() => studentApi.suggestedOlympiad().then((r) => r.data), []);
  if (loading || !data || !data.olympiad_id) return null;

  return (
    <Card radius={16} elevated={false} background={tints.blue08} borderColor={tints.blueBorder30} style={styles.row}>
      <Text style={styles.emoji}>🎯</Text>
      <View style={styles.body}>
        <Text style={styles.label}>Siz uchun olimpiada</Text>
        <Text style={styles.title} numberOfLines={1}>{data.name}</Text>
        <Text style={styles.sub}>
          {data.subject} · {data.time_until ? `${data.time_until}dan keyin` : 'tez orada'}
        </Text>
      </View>
      {navigation ? (
        <Button
          title="Ko'rish"
          height={36}
          radius={11}
          fontSize={12.5}
          style={styles.btn}
          onPress={() => navigation.navigate('Tadbirlar')}
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
    label: {
      fontSize: 10.5,
      fontFamily: FONTS.bold,
      color: colors.blueLight,
      marginBottom: 2,
    },
    title: {
      fontSize: 13.5,
      fontFamily: FONTS.extrabold,
      color: colors.text,
    },
    sub: {
      fontSize: 11.5,
      fontFamily: FONTS.semibold,
      color: colors.textSecondary,
      marginTop: 2,
    },
    btn: {
      paddingHorizontal: 14,
    },
  });
