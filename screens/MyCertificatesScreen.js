import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
  Modal,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../services/ThemeContext';
import { FONTS } from '../constants/typography';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Button from '../components/Button';
import IconBox from '../components/IconBox';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';
import useFetch from '../services/useFetch';
import { studentApi } from '../services/api';
import { BackIcon, DownloadIcon, MedalIcon } from '../components/icons/Icons';

const asArray = (data) => (Array.isArray(data) ? data : data?.results || data?.entries || []);

const formatWhen = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('uz-UZ', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

// Premium / MyCompetitions kabi alohida stack package — sertifikatlar.
// Backend: sertifikat faqat 1-o'rin egasiga beriladi.
export default function MyCertificatesScreen({ navigation }) {
  const { colors, tints } = useTheme();
  const styles = makeStyles(colors, tints);
  const [certLoadingId, setCertLoadingId] = useState(null);
  const [certImage, setCertImage] = useState(null);

  const { data, loading, refreshing, error, reload, refresh } = useFetch(async () => {
    const [resultsRes, olympiadsRes] = await Promise.all([
      studentApi.myResults({ page_size: 50 }).then((r) => r.data).catch(() => null),
      studentApi.olympiads().then((r) => r.data).catch(() => null),
    ]);
    if (resultsRes === null) {
      throw new Error('certificates_load_failed');
    }
    const results = asArray(resultsRes);
    const olympiads = asArray(olympiadsRes);
    const olyById = {};
    olympiads.forEach((o) => {
      if (o?.id != null) olyById[o.id] = o;
    });

    const missingIds = [
      ...new Set(
        results
          .map((r) => {
            if (r.olympiad_title || r.olympiad?.title) return null;
            const o = r.olympiad;
            const id = o && typeof o === 'object' ? o.id : o;
            if (id == null || olyById[id]) return null;
            return id;
          })
          .filter((id) => id != null)
      ),
    ];
    if (missingIds.length) {
      const details = await Promise.all(
        missingIds.slice(0, 20).map((id) =>
          studentApi.olympiadDetail(id).then((r) => r.data).catch(() => null)
        )
      );
      details.forEach((o) => {
        if (o?.id != null) olyById[o.id] = o;
      });
    }

    const items = results.map((r) => {
      const olympiadId =
        r.olympiad && typeof r.olympiad === 'object' ? r.olympiad.id : r.olympiad;
      const oly =
        (olympiadId != null ? olyById[olympiadId] : null) ||
        (r.olympiad && typeof r.olympiad === 'object' ? r.olympiad : null);
      const title =
        r.olympiad_title ||
        oly?.title ||
        r.olympiad?.title ||
        (olympiadId != null ? `Olimpiada #${olympiadId}` : 'Tadbir');
      const rank = r.rank != null ? Number(r.rank) : null;
      return {
        id: r.id,
        title,
        subject: r.subject || oly?.subject || '',
        score: r.score,
        rank,
        isWinner: rank === 1,
        when: formatWhen(r.submitted_at),
        correct: r.correct_count,
        total: r.total_questions,
      };
    });

    // Faqat sertifikat olganlar (1-o'rin) — qatnashgan lekin 1-emaslar ko'rsatilmaydi.
    const winners = items.filter((x) => x.isWinner);
    return { items: winners, winners, total: winners.length };
  }, []);

  const openCertificate = async (attempt) => {
    if (certLoadingId || !attempt?.id) return;
    if (!attempt.isWinner) {
      Alert.alert(
        'Sertifikat',
        "Sertifikat faqat tadbirda 1-o'rinni egallagan o'quvchiga beriladi."
      );
      return;
    }
    setCertLoadingId(attempt.id);
    try {
      const res = await studentApi.certificatePng(attempt.id);
      const reader = new FileReader();
      reader.onload = () => {
        setCertImage(reader.result);
        setCertLoadingId(null);
      };
      reader.onerror = () => {
        setCertLoadingId(null);
        Alert.alert('Xatolik', "Sertifikatni ochib bo'lmadi.");
      };
      reader.readAsDataURL(res.data);
    } catch (e) {
      setCertLoadingId(null);
      const status = e?.response?.status;
      if (status === 403) {
        Alert.alert(
          'Sertifikat',
          "Sertifikat faqat tadbirda 1-o'rinni egallagan o'quvchiga beriladi."
        );
      } else {
        Alert.alert('Xatolik', "Sertifikatni yuklab bo'lmadi. Internet aloqasini tekshiring.");
      }
    }
  };

  if (loading && !data) return <LoadingState message="Sertifikatlar yuklanmoqda…" />;
  if (error && !data) return <ErrorState onRetry={reload} />;

  const items = data?.items || [];
  const winnersCount = data?.total ?? items.filter((x) => x.isWinner).length;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.topBar}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Orqaga"
        >
          <BackIcon size={16} />
        </TouchableOpacity>
        <Text style={styles.title}>Sertifikatlarim</Text>
        <View style={styles.countPill}>
          <Text style={styles.countText}>{winnersCount}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          winnersCount === 0 ? styles.contentEmpty : null,
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.blue} />
        }
      >
        {winnersCount === 0 ? (
          <View style={styles.emptyCenter}>
            <EmptyState
              title="Hali sertifikat olinmagan"
              message="Sertifikat faqat tadbirda 1-o'rin egallaganingizda beriladi. Qatnashgan musobaqalaringiz «Musobaqalar» bo'limida."
            />
          </View>
        ) : (
          <>
          <Text style={styles.subtitle}>
            Faqat 1-o'rin uchun berilgan sertifikatlar. Yuklab olish uchun ↓ tugmasini bosing.
          </Text>
          <View style={styles.list}>
            <Text style={styles.sectionHint}>Sizning sertifikatlaringiz ({winnersCount})</Text>
            {items
              .filter((o) => o.isWinner)
              .map((o, i) => (
                <Card key={o.id || i} style={styles.row}>
                  <IconBox size={42} radius={12} background={tints.gold13}>
                    <MedalIcon size={19} color={colors.gold} />
                  </IconBox>
                  <View style={styles.rowText}>
                    <Text style={styles.rowTitle} numberOfLines={2}>
                      {o.title}
                    </Text>
                    <View style={styles.meta}>
                      {o.subject ? <Text style={styles.metaText}>{o.subject}</Text> : null}
                      {o.when ? <Text style={styles.metaText}>{o.when}</Text> : null}
                      <Badge
                        label="1-o'rin"
                        color={colors.gold}
                        background={tints.gold13}
                        size={9.5}
                        style={styles.badge}
                      />
                    </View>
                    {o.correct != null && o.total != null ? (
                      <Text style={styles.metaText}>
                        {o.score} ball · {o.correct}/{o.total} to'g'ri
                      </Text>
                    ) : (
                      <Text style={styles.metaText}>{o.score != null ? `${o.score} ball` : ''}</Text>
                    )}
                  </View>
                  <TouchableOpacity
                    activeOpacity={0.75}
                    style={styles.downloadBox}
                    onPress={() => openCertificate(o)}
                    disabled={!!certLoadingId}
                  >
                    {certLoadingId === o.id ? (
                      <ActivityIndicator size="small" color={colors.blue} />
                    ) : (
                      <DownloadIcon size={16} />
                    )}
                  </TouchableOpacity>
                </Card>
              ))}
          </View>
          </>
        )}
      </ScrollView>

      {certLoadingId ? (
        <View style={styles.overlay} pointerEvents="auto">
          <ActivityIndicator color={colors.white} size="large" />
        </View>
      ) : null}

      <Modal
        visible={!!certImage}
        transparent
        animationType="fade"
        onRequestClose={() => setCertImage(null)}
      >
        <View style={styles.modalWrap}>
          <View style={styles.modalCard}>
            {certImage ? (
              <Image source={{ uri: certImage }} style={styles.certImage} resizeMode="contain" />
            ) : null}
            <Text style={styles.certHint}>Sertifikatni saqlash uchun ekran suratini oling</Text>
            <Button
              title="Yopish"
              variant="dark"
              height={46}
              radius={12}
              fontSize={14}
              style={styles.closeBtn}
              onPress={() => setCertImage(null)}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const makeStyles = (colors, tints) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 10,
      gap: 10,
    },
    backBtn: {
      width: 38,
      height: 38,
      borderRadius: 12,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderStrong,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      flex: 1,
      fontSize: 18,
      fontFamily: FONTS.extrabold,
      color: colors.text,
    },
    countPill: {
      minWidth: 32,
      height: 28,
      paddingHorizontal: 10,
      borderRadius: 999,
      backgroundColor: tints.purple16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    countText: {
      fontSize: 13,
      fontFamily: FONTS.extrabold,
      color: colors.purple,
    },
    content: {
      paddingHorizontal: 20,
      paddingBottom: 40,
      flexGrow: 1,
    },
    contentEmpty: {
      flexGrow: 1,
      justifyContent: 'center',
      paddingBottom: 80,
    },
    emptyCenter: {
      width: '100%',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 8,
    },
    subtitle: {
      fontSize: 12.5,
      fontFamily: FONTS.semibold,
      color: colors.textSecondary,
      marginBottom: 14,
      lineHeight: 18,
    },
    sectionHint: {
      fontSize: 12,
      fontFamily: FONTS.bold,
      color: colors.textSecondary,
      marginBottom: 4,
    },
    list: {
      gap: 10,
    },
    row: {
      paddingVertical: 14,
      paddingHorizontal: 14,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    rowMuted: {
      opacity: 0.88,
    },
    rowText: {
      flex: 1,
      minWidth: 0,
      gap: 3,
    },
    rowTitle: {
      fontSize: 14,
      fontFamily: FONTS.extrabold,
      color: colors.text,
    },
    meta: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 6,
    },
    metaText: {
      fontSize: 11,
      fontFamily: FONTS.semibold,
      color: colors.textSecondary,
    },
    badge: {
      paddingVertical: 2,
      paddingHorizontal: 7,
      borderRadius: 6,
    },
    scoreBox: {
      alignItems: 'center',
      minWidth: 44,
    },
    score: {
      fontSize: 18,
      fontFamily: FONTS.extrabold,
      color: colors.text,
    },
    scoreLabel: {
      fontSize: 10,
      fontFamily: FONTS.bold,
      color: colors.textSecondary,
      marginTop: 1,
    },
    downloadBox: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: tints.blue14,
      borderWidth: 1,
      borderColor: tints.blueBorder30 || colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    overlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.35)',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 20,
    },
    modalWrap: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.55)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
    },
    modalCard: {
      width: '100%',
      maxWidth: 400,
      backgroundColor: colors.surface,
      borderRadius: 18,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    certImage: {
      width: '100%',
      height: 320,
      borderRadius: 12,
      backgroundColor: colors.surfaceDeep || colors.bg,
    },
    certHint: {
      marginTop: 12,
      fontSize: 12,
      fontFamily: FONTS.semibold,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    closeBtn: {
      marginTop: 12,
    },
  });
