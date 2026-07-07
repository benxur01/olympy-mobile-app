import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../services/ThemeContext';
import { FONTS } from '../constants/typography';
import Card from '../components/Card';
import Button from '../components/Button';
import Avatar from '../components/Avatar';
import Chip from '../components/Chip';
import IconBox from '../components/IconBox';
import SearchBar from '../components/SearchBar';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import useFetch from '../services/useFetch';
import { studentApi, duelApi } from '../services/api';
import { useAuth } from '../services/AuthContext';
import { BackIcon, LightningIcon, CheckIcon, CrownIcon, RepeatIcon } from '../components/icons/Icons';

const initialOf = (name) => (name || '?').trim()[0]?.toUpperCase() || '?';

export default function DuelInviteScreen({ navigation }) {
  const { colors, tints } = useTheme();
  const styles = makeStyles(colors, tints);
  const { user } = useAuth();
  const isPremium = !!(user?.is_premium_active ?? user?.is_premium);

  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(null); // { id, name }
  const [subject, setSubject] = useState(''); // '' = Aralash
  const [creating, setCreating] = useState(false);

  // Raqiblar manbai — reyting ro'yxati (real, faol o'quvchilar). user_id bo'yicha
  // takrorlanmaslik uchun dedupe qilamiz va o'zimizni chiqarib tashlaymiz.
  const { data, loading, error, reload } = useFetch(
    () => studentApi.leaderboard({ page_size: 100 }).then((r) => r.data),
    []
  );

  const opponents = useMemo(() => {
    const raw = data?.entries || (Array.isArray(data) ? data : []);
    const seen = new Set();
    const out = [];
    for (const e of raw) {
      const uid = e.user_id;
      if (!uid || uid === user?.id || seen.has(uid)) continue;
      seen.add(uid);
      out.push({ id: uid, name: e.name || '—', center: e.center || '' });
    }
    return out;
  }, [data, user?.id]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return opponents;
    return opponents.filter((o) => o.name.toLowerCase().includes(q));
  }, [opponents, query]);

  // "Aralash" + o'quvchi onboarding'da tanlagan fanlar (bo'lsa).
  const subjects = useMemo(() => {
    const arr = Array.isArray(user?.onboarding_subjects) ? user.onboarding_subjects : [];
    const uniq = [];
    const seen = new Set();
    for (const s of arr) {
      const v = String(s || '').trim();
      if (v && !seen.has(v.toLowerCase())) {
        seen.add(v.toLowerCase());
        uniq.push(v);
      }
    }
    return ['', ...uniq]; // '' — Aralash
  }, [user?.onboarding_subjects]);

  const pickRandom = () => {
    if (!opponents.length) return;
    const r = opponents[Math.floor(Math.random() * opponents.length)];
    setSelected(r);
    setQuery('');
  };

  const start = async () => {
    if (!selected || creating) return;
    if (!isPremium) {
      promptPremium();
      return;
    }
    setCreating(true);
    try {
      const { data: duel } = await duelApi.create({ opponent_id: selected.id, subject });
      navigation.replace('DuelPlay', { duelId: duel.id });
    } catch (e) {
      const status = e?.response?.status;
      const detail = e?.response?.data?.detail;
      if (status === 403 || e?.response?.data?.upgrade_required) {
        promptPremium(detail);
      } else {
        Alert.alert('Duel boshlanmadi', detail || 'Xatolik yuz berdi. Qayta urinib ko\'ring.', [
          { text: 'Yopish' },
        ]);
      }
    } finally {
      setCreating(false);
    }
  };

  const promptPremium = (msg) => {
    Alert.alert(
      'Premium kerak',
      msg || 'Duel — premium o\'quvchilar uchun. Premium olish uchun markaz adminiga murojaat qiling.',
      [
        { text: 'Bekor qilish', style: 'cancel' },
        { text: 'Premiumga o\'tish', onPress: () => navigation.navigate('Premium') },
      ]
    );
  };

  if (loading && !data) return <LoadingState message="O'quvchilar yuklanmoqda…" />;
  if (error && !data) return <ErrorState onRetry={reload} />;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.topBar}>
        <TouchableOpacity activeOpacity={0.7} onPress={() => navigation.goBack()} style={styles.backBtn}>
          <BackIcon size={16} />
        </TouchableOpacity>
        <Text style={styles.title}>Yangi duel</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {!isPremium ? (
          <TouchableOpacity activeOpacity={0.85} onPress={() => navigation.navigate('Premium')}>
            <Card radius={16} style={styles.premiumBanner} borderColor={tints.goldBorder35} background={tints.gold08}>
              <IconBox size={38} radius={12} background={tints.gold14}>
                <CrownIcon size={18} />
              </IconBox>
              <View style={styles.premiumText}>
                <Text style={styles.premiumTitle}>Duel — premium funksiya</Text>
                <Text style={styles.premiumSub}>Boshlash uchun premiumga o'ting →</Text>
              </View>
            </Card>
          </TouchableOpacity>
        ) : null}

        <Text style={styles.sectionLabel}>MAVZU</Text>
        <View style={styles.subjectRow}>
          {subjects.map((s) => (
            <Chip
              key={s || 'mix'}
              label={s || 'Aralash'}
              active={subject === s}
              onPress={() => setSubject(s)}
            />
          ))}
        </View>

        <View style={styles.opHeader}>
          <Text style={styles.sectionLabel}>RAQIB TANLANG</Text>
          <TouchableOpacity activeOpacity={0.8} onPress={pickRandom} style={styles.randomBtn} disabled={!opponents.length}>
            <RepeatIcon size={13} color={colors.blue} />
            <Text style={styles.randomText}>Tasodifiy</Text>
          </TouchableOpacity>
        </View>

        <SearchBar
          placeholder="Ism bo'yicha qidirish…"
          value={query}
          onChangeText={setQuery}
          style={styles.search}
        />

        {selected ? (
          <Card radius={14} style={styles.selectedCard} borderColor={colors.blue} background={tints.blue08}>
            <Avatar letter={initialOf(selected.name)} size={40} fontSize={15} background={colors.blueDeep} />
            <View style={styles.selectedText}>
              <Text style={styles.selectedName} numberOfLines={1}>{selected.name}</Text>
              <Text style={styles.selectedSub}>Tanlangan raqib</Text>
            </View>
            <View style={styles.selectedCheck}>
              <CheckIcon size={16} color={colors.white} />
            </View>
          </Card>
        ) : null}

        <View style={styles.list}>
          {filtered.length === 0 ? (
            <Text style={styles.emptyText}>
              {opponents.length === 0
                ? 'Hozircha raqib topilmadi. Reytingda faol o\'quvchilar paydo bo\'lgach shu yerda ko\'rinadi.'
                : 'Bu ism bo\'yicha o\'quvchi topilmadi.'}
            </Text>
          ) : (
            filtered.slice(0, 40).map((o) => {
              const active = selected?.id === o.id;
              return (
                <TouchableOpacity
                  key={o.id}
                  activeOpacity={0.85}
                  onPress={() => setSelected(o)}
                  style={[styles.opRow, active ? styles.opRowActive : null]}
                >
                  <Avatar letter={initialOf(o.name)} size={38} fontSize={14} background={colors.blueDeep} />
                  <View style={styles.opText}>
                    <Text style={styles.opName} numberOfLines={1}>{o.name}</Text>
                    {o.center ? <Text style={styles.opSub} numberOfLines={1}>{o.center}</Text> : null}
                  </View>
                  {active ? (
                    <View style={styles.opCheck}>
                      <CheckIcon size={14} color={colors.white} />
                    </View>
                  ) : null}
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title={creating ? 'Boshlanmoqda…' : selected ? `${(selected.name || '').split(' ')[0]} bilan boshlash` : 'Raqib tanlang'}
          height={52}
          radius={14}
          fontSize={15}
          icon={selected && !creating ? <LightningIcon size={17} color={colors.white} /> : null}
          disabled={!selected || creating}
          style={!selected ? styles.footerBtnDisabled : null}
          onPress={start}
        />
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (colors, tints) => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 8,
  },
  backBtn: {
    width: 36,
    height: 36,
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
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
  },
  premiumBanner: {
    padding: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 18,
  },
  premiumText: {
    flex: 1,
  },
  premiumTitle: {
    fontSize: 13.5,
    fontFamily: FONTS.extrabold,
    color: colors.text,
  },
  premiumSub: {
    fontSize: 11.5,
    fontFamily: FONTS.semibold,
    color: colors.goldSoftText,
    marginTop: 2,
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: FONTS.extrabold,
    color: colors.textMuted,
    letterSpacing: 0.8,
  },
  subjectRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  opHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 22,
  },
  randomBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: tints.blue10,
    borderWidth: 1,
    borderColor: tints.blueBorder30,
  },
  randomText: {
    fontSize: 12,
    fontFamily: FONTS.extrabold,
    color: colors.blue,
  },
  search: {
    marginTop: 10,
  },
  selectedCard: {
    marginTop: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  selectedText: {
    flex: 1,
  },
  selectedName: {
    fontSize: 14,
    fontFamily: FONTS.extrabold,
    color: colors.text,
  },
  selectedSub: {
    fontSize: 11,
    fontFamily: FONTS.semibold,
    color: colors.blueSoftText,
    marginTop: 2,
  },
  selectedCheck: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.blue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    marginTop: 12,
    gap: 8,
  },
  emptyText: {
    fontSize: 12.5,
    fontFamily: FONTS.semibold,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    paddingVertical: 24,
    paddingHorizontal: 10,
  },
  opRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 13,
    borderRadius: 13,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  opRowActive: {
    borderWidth: 1.5,
    borderColor: colors.blue,
    backgroundColor: tints.blue08,
  },
  opText: {
    flex: 1,
  },
  opName: {
    fontSize: 13.5,
    fontFamily: FONTS.bold,
    color: colors.text,
  },
  opSub: {
    fontSize: 11,
    fontFamily: FONTS.semibold,
    color: colors.textSecondary,
    marginTop: 1,
  },
  opCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.blue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    backgroundColor: colors.bg,
  },
  footerBtnDisabled: {
    opacity: 0.55,
  },
});
