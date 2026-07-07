import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../services/ThemeContext';
import { FONTS } from '../constants/typography';
import Chip from '../components/Chip';
import { supportApi } from '../services/api';
import { useAuth } from '../services/AuthContext';
import { SparkleIcon, CloseIcon, CrownIcon, SendIcon } from '../components/icons/Icons';

const QUICK_REPLIES = [
  'Ariza holatim qanday?',
  'Olimpiada qanday yaratiladi?',
  'Plus/Pro tariflar nima beradi?',
  "Parolni qanday o'zgartiraman?",
];

// Backend Gemini formatidagi xabarni ekran uchun soddalashtiramiz.
const textOf = (parts) =>
  (parts || []).map((p) => (p && p.text) || '').join('').trim();

const toBubble = (m, idx) => ({
  id: `${m.role}-${idx}-${Date.now()}`,
  role: m.role === 'user' ? 'user' : m.role === 'admin' ? 'admin' : 'model',
  text: typeof m.text === 'string' ? m.text : textOf(m.parts),
});

export default function AiChatScreen({ navigation }) {
  const { colors, tints } = useTheme();
  const styles = makeStyles(colors, tints);
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const scrollRef = useRef(null);

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data } = await supportApi.history();
        const list = (data?.messages || []).map(toBubble).filter((m) => m.text);
        if (active) setMessages(list);
      } catch (e) {
        // Tarix yuklanmasa ham chat ochiladi — yangi suhbat boshlanadi.
        if (active) setMessages([]);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (messages.length) scrollToEnd();
  }, [messages, scrollToEnd]);

  const send = useCallback(
    async (raw) => {
      const text = (raw ?? input).trim();
      if (!text || sending) return;
      setError(null);
      setInput('');

      const nextMessages = [...messages, { id: `u-${Date.now()}`, role: 'user', text }];
      setMessages(nextMessages);
      setSending(true);

      // Backend Gemini formatini kutadi: [{ role, parts: [{ text }] }].
      const payload = nextMessages
        .filter((m) => m.role !== 'admin')
        .map((m) => ({
          role: m.role === 'user' ? 'user' : 'model',
          parts: [{ text: m.text }],
        }));

      try {
        const { data } = await supportApi.send(payload);
        const reply = (data?.reply || '').trim();
        setMessages((prev) => [
          ...prev,
          {
            id: `m-${Date.now()}`,
            role: 'model',
            text: reply || "Kechirasiz, javob olishda muammo bo'ldi. Birozdan so'ng urinib ko'ring.",
          },
        ]);
      } catch (e) {
        const apiReply = e?.response?.data?.reply;
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: 'model',
            text:
              apiReply ||
              "Ulanishda xatolik. Internet aloqasini tekshirib, qayta yuboring.",
          },
        ]);
        setError('send');
      } finally {
        setSending(false);
      }
    },
    [input, messages, sending]
  );

  const firstName = (user?.full_name || 'foydalanuvchi').split(' ')[0];

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <View style={styles.aiAvatar}>
          <SparkleIcon size={19} color={colors.white} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>AI Yordamchi</Text>
          <View style={styles.statusRow}>
            <View style={styles.onlineDot} />
            <Text style={styles.statusText}>Onlayn · darhol javob beradi</Text>
          </View>
        </View>
        <TouchableOpacity activeOpacity={0.7} onPress={() => navigation.goBack()}>
          <CloseIcon size={18} color={colors.textMuted} strokeWidth={2.2} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={colors.blue} />
            <Text style={styles.loadingText}>Suhbat yuklanmoqda…</Text>
          </View>
        ) : (
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={styles.messages}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.aiBubble}>
              <Text style={styles.aiText}>
                Salom, {firstName}! Men Olympy AI yordamchisiman. Sizga qanday yordam bera olaman?
              </Text>
            </View>

            {messages.length === 0 ? (
              <View style={styles.quickReplies}>
                {QUICK_REPLIES.map((q) => (
                  <Chip
                    key={q}
                    label={q}
                    activeBackground={tints.blue10}
                    radius={18}
                    onPress={() => send(q)}
                  />
                ))}
              </View>
            ) : null}

            {messages.map((m) =>
              m.role === 'user' ? (
                <View key={m.id} style={styles.userBubble}>
                  <Text style={styles.userText}>{m.text}</Text>
                </View>
              ) : m.role === 'admin' ? (
                <View key={m.id} style={styles.adminBubble}>
                  <View style={styles.adminHeader}>
                    <CrownIcon size={12} />
                    <Text style={styles.adminName}>Platforma Admini</Text>
                  </View>
                  <Text style={styles.adminText}>{m.text}</Text>
                </View>
              ) : (
                <View key={m.id} style={styles.aiBubble}>
                  <Text style={styles.aiText}>{m.text}</Text>
                </View>
              )
            )}

            {sending ? (
              <View style={[styles.aiBubble, styles.typingBubble]}>
                <ActivityIndicator size="small" color={colors.blueLight} />
                <Text style={styles.typingText}>yozmoqda…</Text>
              </View>
            ) : null}
          </ScrollView>
        )}

        <View style={styles.inputRow}>
          <View style={styles.input}>
            <TextInput
              style={styles.inputField}
              placeholder="Xabar yozing…"
              placeholderTextColor={colors.textMuted}
              value={input}
              onChangeText={setInput}
              onSubmitEditing={() => send()}
              returnKeyType="send"
              editable={!sending}
              multiline
            />
          </View>
          <TouchableOpacity
            activeOpacity={0.8}
            style={[styles.sendBtn, (!input.trim() || sending) ? styles.sendBtnDisabled : null]}
            onPress={() => send()}
            disabled={!input.trim() || sending}
          >
            <SendIcon size={18} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const makeStyles = (colors, tints) => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingTop: 12,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingTop: 6,
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  aiAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.blue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontFamily: FONTS.extrabold,
    color: colors.text,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.greenLight,
  },
  statusText: {
    fontSize: 11,
    fontFamily: FONTS.bold,
    color: colors.greenLight,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    fontFamily: FONTS.bold,
    color: colors.textSecondary,
  },
  messages: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 12,
  },
  aiBubble: {
    maxWidth: '82%',
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    backgroundColor: colors.surface,
    paddingVertical: 12,
    paddingHorizontal: 15,
  },
  aiText: {
    fontSize: 13.5,
    fontFamily: FONTS.semibold,
    color: colors.textBody,
    lineHeight: 20.925,
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typingText: {
    fontSize: 12.5,
    fontFamily: FONTS.bold,
    color: colors.textMuted,
  },
  quickReplies: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  userBubble: {
    maxWidth: '82%',
    alignSelf: 'flex-end',
    borderRadius: 16,
    borderBottomRightRadius: 4,
    backgroundColor: colors.blue,
    paddingVertical: 12,
    paddingHorizontal: 15,
  },
  userText: {
    fontSize: 13.5,
    fontFamily: FONTS.semibold,
    color: colors.white,
    lineHeight: 20.925,
  },
  adminBubble: {
    maxWidth: '86%',
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: tints.goldBorder40,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    backgroundColor: tints.gold08,
    paddingVertical: 12,
    paddingHorizontal: 15,
  },
  adminHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  adminName: {
    fontSize: 11,
    fontFamily: FONTS.extrabold,
    color: colors.gold,
  },
  adminText: {
    fontSize: 13.5,
    fontFamily: FONTS.semibold,
    color: colors.goldSoftText,
    lineHeight: 20.925,
    marginTop: 5,
  },
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
  inputField: {
    fontSize: 13,
    fontFamily: FONTS.semibold,
    color: colors.text,
    padding: 0,
    maxHeight: 108,
  },
  sendBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.blue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.5,
  },
});
