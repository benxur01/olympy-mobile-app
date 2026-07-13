import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../services/ThemeContext';
import { FONTS } from '../constants/typography';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Avatar from '../components/Avatar';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import useFetch from '../services/useFetch';
import { adminApi } from '../services/api';
import { BackIcon, CloseIcon, SendIcon, SparkleIcon, RepeatIcon } from '../components/icons/Icons';

const timeOf = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
};

const roleLabel = (role) =>
  role === 'user' ? 'Foydalanuvchi' : role === 'admin' ? 'Siz (Admin)' : 'AI Yordamchi';

export default function AdminSupportScreen({ navigation, embedded = false }) {
  const { colors, tints } = useTheme();
  const styles = makeStyles(colors, tints);
  const Wrapper = embedded ? View : SafeAreaView;
  const wrapperProps = embedded ? {} : { edges: ['top'] };

  const { data, loading, refreshing, error, reload, refresh } = useFetch(async () => {
    const { data: res } = await adminApi.getSupportChats();
    return Array.isArray(res?.threads) ? res.threads : [];
  }, []);

  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
  }, []);

  const loadMessages = useCallback(async (chatKey) => {
    setLoadingMessages(true);
    try {
      const { data: res } = await adminApi.getSupportChatMessages(chatKey);
      setMessages(Array.isArray(res?.messages) ? res.messages : []);
    } catch (e) {
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  const openThread = useCallback(
    (thread) => {
      setSelected(thread);
      setReplyText('');
      setMessages([]);
      loadMessages(thread.chat_key);
    },
    [loadMessages],
  );

  useEffect(() => {
    if (messages.length) scrollToEnd();
  }, [messages, scrollToEnd]);

  const sendReply = useCallback(async () => {
    const text = replyText.trim();
    if (!text || sending || !selected) return;
    setSending(true);
    try {
      await adminApi.sendSupportReply(selected.chat_key, text);
      setReplyText('');
      // Optimistik: xabarni darhol ko'rsatamiz, so'ng serverdan yangilaymiz.
      setMessages((prev) => [...prev, { role: 'admin', text, created_at: new Date().toISOString() }]);
      loadMessages(selected.chat_key);
      reload();
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { role: 'admin', text: `${text}\n\n(Yuborilmadi — qayta urinib ko'ring)`, created_at: new Date().toISOString(), failed: true },
      ]);
    } finally {
      setSending(false);
    }
  }, [replyText, sending, selected, loadMessages, reload]);

  if (loading) return <LoadingState message="Yozishmalar yuklanmoqda…" />;
  if (error && !data) return <ErrorState onRetry={reload} />;

  const threads = data || [];

  return (
    <Wrapper style={styles.screen} {...wrapperProps}>
      <View style={styles.topBar}>
        {embedded ? null : (
          <TouchableOpacity activeOpacity={0.7} onPress={() => navigation.goBack()} style={styles.iconBtn}>
            <BackIcon size={20} color={colors.text} />
          </TouchableOpacity>
        )}
        <View style={styles.headerText}>
          <Text style={styles.title}>AI Support yozishmalari</Text>
          <Text style={styles.subtitle}>{threads.length} ta murojaat</Text>
        </View>
        <TouchableOpacity activeOpacity={0.7} onPress={reload} style={styles.iconBtn}>
          <RepeatIcon size={17} color={colors.blueLight} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.blue} />}
      >
        {threads.length === 0 ? (
          <Card style={styles.emptyCard}>
            <SparkleIcon size={26} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>Murojaatlar topilmadi</Text>
            <Text style={styles.emptyText}>Foydalanuvchilar AI yordamchi bilan yozishganda bu yerda ko'rinadi.</Text>
          </Card>
        ) : (
          <View style={styles.list}>
            {threads.map((t) => (
              <TouchableOpacity key={t.chat_key} activeOpacity={0.85} onPress={() => openThread(t)}>
                <Card style={styles.threadCard}>
                  <Avatar
                    letter={(t.full_name || '?').trim()[0]?.toUpperCase() || '?'}
                    size={40}
                    fontSize={15}
                    background={t.is_guest ? colors.surfaceDeep : colors.blue}
                  />
                  <View style={styles.threadText}>
                    <View style={styles.threadTop}>
                      <Text style={styles.threadName} numberOfLines={1}>{t.full_name || "Noma'lum"}</Text>
                      <Text style={styles.threadTime}>{timeOf(t.updated_at)}</Text>
                    </View>
                    <Text style={styles.threadPreview} numberOfLines={1}>
                      <Text style={styles.threadRole}>
                        {t.last_message_role === 'user' ? 'Foydalanuvchi: ' : t.last_message_role === 'admin' ? 'Siz: ' : 'AI: '}
                      </Text>
                      {t.last_message || '—'}
                    </Text>
                  </View>
                  {t.is_guest ? (
                    <Badge label="Mehmon" color={colors.textMuted} background={colors.surfaceDeep} size={9.5} />
                  ) : null}
                </Card>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Suhbat tafsilotlari — to'liq ekran modal */}
      <Modal visible={!!selected} animationType="slide" onRequestClose={() => setSelected(null)}>
        <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
          <View style={styles.detailHeader}>
            <View style={styles.detailAvatar}>
              <Text style={styles.detailAvatarText}>
                {(selected?.full_name || '?').trim()[0]?.toUpperCase() || '?'}
              </Text>
            </View>
            <View style={styles.headerText}>
              <Text style={styles.detailName} numberOfLines={1}>{selected?.full_name || "Noma'lum"}</Text>
              <Text style={styles.detailPhone}>{selected?.phone || ''}</Text>
            </View>
            <TouchableOpacity activeOpacity={0.7} onPress={() => setSelected(null)} style={styles.iconBtn}>
              <CloseIcon size={18} color={colors.textMuted} strokeWidth={2.2} />
            </TouchableOpacity>
          </View>

          <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
          >
            {loadingMessages ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator size="large" color={colors.blue} />
              </View>
            ) : (
              <ScrollView
                ref={scrollRef}
                contentContainerStyle={styles.messages}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {messages.length === 0 ? (
                  <Text style={styles.noMessages}>Bu suhbatda hali xabar yo'q.</Text>
                ) : (
                  messages.map((m, idx) => {
                    const isUser = m.role === 'user';
                    const isAdmin = m.role === 'admin';
                    return (
                      <View
                        key={idx}
                        style={[
                          styles.bubbleWrap,
                          isUser ? styles.bubbleRight : styles.bubbleLeft,
                        ]}
                      >
                        <View
                          style={[
                            styles.bubble,
                            isUser ? styles.userBubble : isAdmin ? styles.adminBubble : styles.aiBubble,
                          ]}
                        >
                          <Text style={[styles.bubbleRole, isUser ? styles.bubbleRoleLight : null]}>
                            {roleLabel(m.role)} · {timeOf(m.created_at)}
                          </Text>
                          <Text
                            style={[
                              styles.bubbleText,
                              isUser ? styles.userText : isAdmin ? styles.adminText : styles.aiText,
                            ]}
                          >
                            {m.text}
                          </Text>
                        </View>
                      </View>
                    );
                  })
                )}
              </ScrollView>
            )}

            <View style={styles.inputRow}>
              <View style={styles.input}>
                <TextInput
                  style={styles.inputField}
                  placeholder="Foydalanuvchiga javob yozing…"
                  placeholderTextColor={colors.textMuted}
                  value={replyText}
                  onChangeText={setReplyText}
                  editable={!sending}
                  multiline
                />
              </View>
              <TouchableOpacity
                activeOpacity={0.8}
                style={[styles.sendBtn, (!replyText.trim() || sending) ? styles.sendBtnDisabled : null]}
                onPress={sendReply}
                disabled={!replyText.trim() || sending}
              >
                {sending ? <ActivityIndicator size="small" color={colors.white} /> : <SendIcon size={18} />}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </Wrapper>
  );
}

const makeStyles = (colors, tints) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    flex: { flex: 1 },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingTop: 6,
      paddingHorizontal: 20,
      paddingBottom: 14,
    },
    iconBtn: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerText: { flex: 1 },
    title: { fontSize: 18, fontFamily: FONTS.extrabold, color: colors.text },
    subtitle: { fontSize: 11.5, fontFamily: FONTS.semibold, color: colors.textSecondary, marginTop: 1 },
    content: { paddingHorizontal: 20, paddingBottom: 40 },
    list: { gap: 8 },
    threadCard: { paddingVertical: 12, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
    threadText: { flex: 1 },
    threadTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    threadName: { flex: 1, fontSize: 13.5, fontFamily: FONTS.extrabold, color: colors.text },
    threadTime: { fontSize: 10.5, fontFamily: FONTS.semibold, color: colors.textMuted },
    threadPreview: { fontSize: 11.5, fontFamily: FONTS.semibold, color: colors.textSecondary, marginTop: 3 },
    threadRole: { fontFamily: FONTS.extrabold, color: colors.textMuted },
    emptyCard: { padding: 26, alignItems: 'center', gap: 8, marginTop: 20 },
    emptyTitle: { fontSize: 14, fontFamily: FONTS.extrabold, color: colors.text, marginTop: 4 },
    emptyText: { fontSize: 12, fontFamily: FONTS.semibold, color: colors.textMuted, textAlign: 'center' },
    // Detail modal
    detailHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 11,
      paddingTop: 6,
      paddingHorizontal: 20,
      paddingBottom: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.divider,
    },
    detailAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.blue,
      alignItems: 'center',
      justifyContent: 'center',
    },
    detailAvatarText: { fontSize: 15, fontFamily: FONTS.extrabold, color: colors.white },
    detailName: { fontSize: 15, fontFamily: FONTS.extrabold, color: colors.text },
    detailPhone: { fontSize: 11.5, fontFamily: FONTS.semibold, color: colors.textSecondary, marginTop: 1 },
    loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    messages: { paddingVertical: 16, paddingHorizontal: 20, gap: 12 },
    noMessages: { textAlign: 'center', fontSize: 12.5, fontFamily: FONTS.semibold, color: colors.textMuted, marginTop: 24 },
    bubbleWrap: { maxWidth: '86%' },
    bubbleLeft: { alignSelf: 'flex-start' },
    bubbleRight: { alignSelf: 'flex-end' },
    bubble: { borderRadius: 16, paddingVertical: 11, paddingHorizontal: 14 },
    userBubble: { backgroundColor: colors.blue, borderBottomRightRadius: 4 },
    aiBubble: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderBottomLeftRadius: 4 },
    adminBubble: { borderWidth: 1, borderColor: tints.goldBorder40, backgroundColor: tints.gold08, borderBottomLeftRadius: 4 },
    bubbleRole: {
      fontSize: 9.5,
      fontFamily: FONTS.extrabold,
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.3,
      marginBottom: 4,
    },
    bubbleRoleLight: { color: 'rgba(255,255,255,0.75)' },
    bubbleText: { fontSize: 13.5, fontFamily: FONTS.semibold, lineHeight: 20 },
    userText: { color: colors.white },
    aiText: { color: colors.textBody },
    adminText: { color: colors.goldSoftText },
    inputRow: {
      flexDirection: 'row',
      gap: 9,
      paddingTop: 12,
      paddingBottom: 8,
      paddingHorizontal: 20,
      borderTopWidth: 1,
      borderTopColor: colors.divider,
      alignItems: 'flex-end',
    },
    input: {
      flex: 1,
      minHeight: 46,
      maxHeight: 120,
      borderWidth: 1,
      borderColor: colors.borderStrong,
      borderRadius: 23,
      backgroundColor: colors.surface,
      justifyContent: 'center',
      paddingHorizontal: 17,
      paddingVertical: 6,
    },
    inputField: { fontSize: 13, fontFamily: FONTS.semibold, color: colors.text, padding: 0, maxHeight: 108 },
    sendBtn: {
      width: 46,
      height: 46,
      borderRadius: 23,
      backgroundColor: colors.blue,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sendBtnDisabled: { opacity: 0.5 },
  });
