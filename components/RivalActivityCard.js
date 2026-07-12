import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Card from './Card';
import Avatar from './Avatar';
import Badge from './Badge';
import useFetch from '../services/useFetch';
import { studentApi } from '../services/api';
import { useTheme } from '../services/ThemeContext';
import { FONTS } from '../constants/typography';
import { API_BASE_URL } from '../services/config';

// DH2. Raqib harakati. Web: pages/RetentionWidgets.jsx (359-395).
// Nisbiy avatar URL'ni API_BASE_URL bilan to'ldiramiz (websaytdagi makeAssetUrl
// mantiqi bilan bir xil), bo'lmasa initsial ko'rsatiladi.
const assetUri = (raw) => {
  if (!raw) return undefined;
  return /^https?:\/\//i.test(raw) ? raw : `${API_BASE_URL}${raw.startsWith('/') ? '' : '/'}${raw}`;
};
const initialOf = (name) => (name || '?').trim().charAt(0).toUpperCase() || '?';

export default function RivalActivityCard() {
  const { colors, tints } = useTheme();
  const styles = makeStyles(colors, tints);
  const { data, loading } = useFetch(() => studentApi.rivalActivity().then((r) => r.data), []);
  if (loading) return null;
  const rivals = Array.isArray(data) ? data : [];
  if (!rivals.length) return null;

  return (
    <Card radius={16} style={styles.card}>
      <Text style={styles.heading}>⚔️ Raqiblar</Text>
      <View style={styles.list}>
        {rivals.map((r) => (
          <View
            key={r.rival_id}
            style={[styles.rivalRow, r.rival_is_premium ? styles.rivalRowPremium : null]}
          >
            <Avatar
              letter={initialOf(r.rival_name)}
              uri={assetUri(r.rival_avatar_url)}
              size={34}
              fontSize={14}
              background={colors.purple}
            />
            <View style={styles.info}>
              <View style={styles.nameRow}>
                <Text style={styles.name} numberOfLines={1}>{r.rival_name}</Text>
                {r.rival_is_premium ? (
                  <Badge label="Premium" color={colors.gold} background={tints.gold14} size={8.5} />
                ) : null}
              </View>
              <Text style={styles.message} numberOfLines={1}>{r.message}</Text>
            </View>
            <View style={styles.scoreCol}>
              <Text style={[styles.scoreChange, r.rival_score_change > 0 ? { color: colors.greenLight } : { color: colors.textMuted }]}>
                {r.rival_score_change > 0 ? `+${r.rival_score_change}` : '0'}
              </Text>
              <Text style={styles.myScore}>siz +{r.my_score_change}</Text>
            </View>
          </View>
        ))}
      </View>
    </Card>
  );
}

const makeStyles = (colors, tints) =>
  StyleSheet.create({
    card: {
      padding: 16,
    },
    heading: {
      fontSize: 14,
      fontFamily: FONTS.extrabold,
      color: colors.text,
      marginBottom: 12,
    },
    list: {
      gap: 8,
    },
    rivalRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 11,
      padding: 9,
      borderRadius: 12,
      backgroundColor: colors.surfaceDeep,
    },
    rivalRowPremium: {
      backgroundColor: tints.gold08,
      borderWidth: 1,
      borderColor: tints.goldBorder30,
    },
    info: {
      flex: 1,
    },
    nameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    name: {
      flexShrink: 1,
      fontSize: 13,
      fontFamily: FONTS.bold,
      color: colors.text,
    },
    message: {
      fontSize: 11,
      fontFamily: FONTS.semibold,
      color: colors.textSecondary,
      marginTop: 2,
    },
    scoreCol: {
      alignItems: 'flex-end',
    },
    scoreChange: {
      fontSize: 12,
      fontFamily: FONTS.extrabold,
    },
    myScore: {
      fontSize: 9.5,
      fontFamily: FONTS.semibold,
      color: colors.textMuted,
      marginTop: 1,
    },
  });
