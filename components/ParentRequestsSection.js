import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Card from './Card';
import Avatar from './Avatar';
import Button from './Button';
import { useTheme } from '../services/ThemeContext';
import { FONTS } from '../constants/typography';
import { UsersIcon } from './icons/Icons';

const initialOf = (name) => (name || '?').trim()[0]?.toUpperCase() || '?';

// Sizni "farzand" sifatida kuzatmoqchi bo'lgan ota-ona so'rovlari (backend
// `list_parent_requests`) — bu STUDENT tomonidagi funksiya (websaytda
// StudentDashboard'da ko'rinadi). Avval xato bilan ParentScreen.js'da edi —
// bu yerga ko'chirildi va StudentHomeScreen'da ishlatiladi.
export default function ParentRequestsSection({ requests, respondingId, onRespond }) {
  const { colors, tints } = useTheme();
  const styles = makeStyles(colors, tints);
  return (
    <View style={styles.requestsSection}>
      <View style={styles.requestsHeaderRow}>
        <UsersIcon size={16} color={colors.gold} />
        <Text style={styles.requestsTitle}>Ota-ona kuzatuv so'rovlari</Text>
      </View>
      <Text style={styles.requestsDesc}>
        Quyidagi shaxslar sizni "farzand" sifatida kuzatmoqchi. Tasdiqlasangiz,
        ular natijalaringiz va faolligingizni ko'ra oladi.
      </Text>
      {requests.map((req) => {
        const busy = respondingId === req.link_id;
        return (
          <Card key={req.link_id} radius={14} style={styles.requestRow} background={colors.surfaceDeep}>
            <View style={styles.requestTop}>
              <Avatar
                letter={initialOf(req.parent_name)}
                uri={req.avatar_url || undefined}
                size={40}
                fontSize={16}
                background={tints.gold14}
                color={colors.gold}
              />
              <View style={styles.requestInfo}>
                <Text style={styles.requestName} numberOfLines={1}>
                  {req.parent_name || 'Foydalanuvchi'}
                </Text>
                {req.parent_username ? (
                  <Text style={styles.requestUser} numberOfLines={1}>@{req.parent_username}</Text>
                ) : null}
              </View>
            </View>
            <View style={styles.requestBtns}>
              <Button
                title="Tasdiqlash"
                variant="success"
                height={40}
                radius={11}
                fontSize={13}
                style={styles.requestBtn}
                disabled={busy}
                onPress={() => onRespond(req.link_id, true)}
              />
              <Button
                title="Rad etish"
                variant="muted"
                height={40}
                radius={11}
                fontSize={13}
                style={styles.requestBtn}
                disabled={busy}
                onPress={() => onRespond(req.link_id, false)}
              />
            </View>
          </Card>
        );
      })}
    </View>
  );
}

const makeStyles = (colors, tints) =>
  StyleSheet.create({
    requestsSection: {
      marginTop: 16,
      borderWidth: 1,
      borderColor: tints.goldBorder30,
      borderRadius: 18,
      backgroundColor: tints.gold06,
      padding: 15,
      gap: 10,
    },
    requestsHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    requestsTitle: {
      fontSize: 14.5,
      fontFamily: FONTS.extrabold,
      color: colors.text,
    },
    requestsDesc: {
      fontSize: 11.5,
      fontFamily: FONTS.semibold,
      color: colors.textSecondary,
      lineHeight: 17,
    },
    requestRow: {
      padding: 12,
      gap: 11,
    },
    requestTop: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 11,
    },
    requestInfo: {
      flex: 1,
    },
    requestName: {
      fontSize: 13.5,
      fontFamily: FONTS.extrabold,
      color: colors.text,
    },
    requestUser: {
      fontSize: 11.5,
      fontFamily: FONTS.semibold,
      color: colors.textSecondary,
      marginTop: 1,
    },
    requestBtns: {
      flexDirection: 'row',
      gap: 8,
    },
    requestBtn: {
      flex: 1,
    },
  });
