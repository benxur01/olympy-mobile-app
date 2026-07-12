import React, { useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../services/ThemeContext';
import { FONTS } from '../constants/typography';
import Card from '../components/Card';
import Button from '../components/Button';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';
import useFetch from '../services/useFetch';
import { adminApi } from '../services/api';
import { BookIcon, PlusIcon } from '../components/icons/Icons';

const asArray = (data) => (Array.isArray(data) ? data : data?.results || []);

export default function AdminSubjectsScreen() {
  const { colors, tints } = useTheme();
  const styles = makeStyles(colors, tints);
  const { data, loading, refreshing, error, reload, refresh } = useFetch(
    () => adminApi.subjects().then((r) => asArray(r.data)),
    []
  );
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const subjects = data || [];

  const addSubject = async () => {
    const trimmed = name.trim();
    if (!trimmed || saving) return;
    if (subjects.some((s) => (typeof s === 'string' ? s : s.name) === trimmed)) {
      Alert.alert('Diqqat', `"${trimmed}" allaqachon mavjud`);
      return;
    }
    setSaving(true);
    try {
      await adminApi.createSubject(trimmed);
      setName('');
      reload();
    } catch (e) {
      const detail = e?.response?.data?.detail;
      Alert.alert('Xatolik', detail || "Fan qo'shib bo'lmadi. Qayta urinib ko'ring.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingState message="Fanlar yuklanmoqda…" />;
  if (error && !data) return <ErrorState onRetry={reload} />;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.blue} />}
      >
        <Text style={styles.title}>Fanlar</Text>
        <Text style={styles.subtitle}>Platformada ishlatiladigan fan kategoriyalari</Text>

        <Card radius={16} style={styles.addCard}>
          <Text style={styles.addLabel}>Yangi fan qo'shish</Text>
          <View style={styles.addRow}>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Fan nomi"
              placeholderTextColor={colors.textMuted}
              onSubmitEditing={addSubject}
              returnKeyType="done"
            />
            <Button
              title={saving ? '…' : "Qo'shish"}
              height={44}
              radius={11}
              fontSize={13}
              icon={<PlusIcon size={14} color={colors.white} />}
              style={styles.addBtn}
              disabled={saving || !name.trim()}
              onPress={addSubject}
            />
          </View>
        </Card>

        {subjects.length === 0 ? (
          <EmptyState
            compact
            icon={<BookIcon size={22} color={colors.blueLight} />}
            title="Fanlar yo'q"
            message="Hozircha birorta fan qo'shilmagan."
          />
        ) : (
          <View style={styles.list}>
            {subjects.map((s, i) => {
              const label = typeof s === 'string' ? s : s.name;
              return (
                <Card key={s.id ?? label ?? i} style={styles.row}>
                  <BookIcon size={16} color={colors.textSecondary} />
                  <Text style={styles.rowText}>{label}</Text>
                </Card>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (colors, tints) => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    paddingTop: 18,
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  title: {
    fontSize: 19,
    fontFamily: FONTS.extrabold,
    color: colors.text,
  },
  subtitle: {
    fontSize: 12,
    fontFamily: FONTS.semibold,
    color: colors.textSecondary,
    marginTop: 3,
  },
  addCard: {
    marginTop: 16,
    padding: 16,
  },
  addLabel: {
    fontSize: 11,
    fontFamily: FONTS.extrabold,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 9,
  },
  addRow: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 11,
    backgroundColor: colors.surfaceDeep,
    paddingHorizontal: 13,
    fontSize: 13,
    fontFamily: FONTS.semibold,
    color: colors.text,
  },
  addBtn: {
    paddingHorizontal: 16,
  },
  list: {
    gap: 8,
    marginTop: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 13,
    paddingHorizontal: 15,
  },
  rowText: {
    fontSize: 13.5,
    fontFamily: FONTS.bold,
    color: colors.text,
  },
});
