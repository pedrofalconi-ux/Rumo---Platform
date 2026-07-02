import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  ScrollView,
  Pressable,
  View,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useChat, ChatMessage } from '@/hooks/use-traveler-store';

function formatTime(isoString: string) {
  const date = new Date(isoString);
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(isoString: string) {
  const date = new Date(isoString);
  return date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' });
}

function MessageBubble({
  message,
  theme,
}: {
  message: ChatMessage;
  theme: ReturnType<typeof useTheme>;
}) {
  const isMe = message.senderRole === 'traveler';

  return (
    <View style={[styles.bubbleWrapper, isMe ? styles.bubbleRight : styles.bubbleLeft]}>
      {!isMe && (
        <View style={styles.avatarCircle}>
          <ThemedText style={styles.avatarText}>
            {message.senderName.charAt(0).toUpperCase()}
          </ThemedText>
        </View>
      )}

      <View style={styles.bubbleColumn}>
        {!isMe && (
          <ThemedText style={styles.senderName} themeColor="textSecondary">
            {message.senderName}
          </ThemedText>
        )}
        <View
          style={[
            styles.bubble,
            isMe
              ? { backgroundColor: '#004782' }
              : { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected, borderWidth: 1 },
          ]}
        >
          <ThemedText
            style={[styles.bubbleText, { color: isMe ? '#fff' : undefined }]}
          >
            {message.text}
          </ThemedText>
        </View>
        <ThemedText style={[styles.timeText, isMe && styles.timeRight]} themeColor="textSecondary">
          {formatTime(message.sentAt)}
          {isMe && ' ✓'}
        </ThemedText>
      </View>
    </View>
  );
}

export default function ChatScreen() {
  const { tripId } = useLocalSearchParams<{ tripId?: string }>();
  const activeTripId = tripId ?? 'HOR-9921';
  const theme = useTheme();
  const { messages, sendMessage } = useChat(activeTripId);
  const [inputText, setInputText] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages]);

  const handleSend = () => {
    const text = inputText.trim();
    if (!text) return;
    setInputText('');
    sendMessage(text);
  };

  // Group messages by date
  const grouped: { date: string; messages: ChatMessage[] }[] = [];
  messages.forEach((msg) => {
    const date = formatDate(msg.sentAt);
    const last = grouped[grouped.length - 1];
    if (last && last.date === date) {
      last.messages.push(msg);
    } else {
      grouped.push({ date, messages: [msg] });
    }
  });

  return (
    <ThemedView style={[styles.container, { backgroundColor: theme.background }]}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        {/* Header */}
        <ThemedView
          style={[styles.header, { borderBottomColor: theme.backgroundSelected }]}
        >
          <View style={styles.agentInfo}>
            <View style={[styles.agentAvatar, { backgroundColor: '#004782' }]}>
              <ThemedText style={styles.agentAvatarText}>D</ThemedText>
            </View>
            <View>
              <ThemedText style={styles.agentName}>Digueira Rumo</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Seu consultor de viagem
              </ThemedText>
            </View>
          </View>
          <View style={styles.onlineDot} />
        </ThemedView>

        {/* Messages */}
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={styles.messagesContent}
            showsVerticalScrollIndicator={false}
          >
            {grouped.map((group) => (
              <View key={group.date}>
                {/* Date separator */}
                <View style={styles.dateSeparator}>
                  <View style={[styles.dateLine, { backgroundColor: theme.backgroundSelected }]} />
                  <ThemedText style={styles.dateText} themeColor="textSecondary">
                    {group.date}
                  </ThemedText>
                  <View style={[styles.dateLine, { backgroundColor: theme.backgroundSelected }]} />
                </View>

                {group.messages.map((msg) => (
                  <MessageBubble key={msg.id} message={msg} theme={theme} />
                ))}
              </View>
            ))}

            {messages.length === 0 && (
              <View style={styles.emptyChat}>
                <ThemedText style={styles.emptyChatEmoji}>💬</ThemedText>
                <ThemedText style={styles.emptyChatText} themeColor="textSecondary">
                  Comece uma conversa com seu consultor!
                </ThemedText>
              </View>
            )}
          </ScrollView>

          {/* Input Bar */}
          <ThemedView
            style={[
              styles.inputBar,
              {
                borderTopColor: theme.backgroundSelected,
                backgroundColor: theme.background,
              },
            ]}
          >
            <TextInput
              style={[
                styles.textInput,
                {
                  backgroundColor: theme.backgroundElement,
                  color: theme.text,
                  borderColor: theme.backgroundSelected,
                },
              ]}
              placeholder="Escreva uma mensagem..."
              placeholderTextColor={theme.textSecondary}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={500}
              returnKeyType="send"
              onSubmitEditing={handleSend}
            />
            <Pressable
              onPress={handleSend}
              disabled={!inputText.trim()}
              style={({ pressed }) => [
                styles.sendButton,
                {
                  backgroundColor: inputText.trim()
                    ? pressed
                      ? '#003a6a'
                      : '#004782'
                    : theme.backgroundSelected,
                },
              ]}
            >
              <ThemedText style={styles.sendIcon}>↑</ThemedText>
            </Pressable>
          </ThemedView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  safeArea: {
    flex: 1,
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    width: '100%',
  },
  header: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  agentInfo: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  agentAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  agentAvatarText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  agentName: { fontSize: 15, fontWeight: '700' },
  onlineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#22C55E',
  },
  messagesContent: {
    padding: Spacing.three,
    paddingBottom: Spacing.four,
    gap: Spacing.one,
    flexGrow: 1,
  },
  dateSeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginVertical: Spacing.three,
  },
  dateLine: { flex: 1, height: 1 },
  dateText: { fontSize: 11, fontWeight: '600' },
  bubbleWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginVertical: 2,
    gap: Spacing.one,
  },
  bubbleLeft: { justifyContent: 'flex-start' },
  bubbleRight: { justifyContent: 'flex-end' },
  avatarCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#004782',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginBottom: 16,
  },
  avatarText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  bubbleColumn: { maxWidth: '75%', gap: 2 },
  senderName: { fontSize: 11, fontWeight: '600', marginLeft: Spacing.one },
  bubble: {
    borderRadius: 16,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  bubbleText: { fontSize: 14, lineHeight: 20 },
  timeText: { fontSize: 10, marginLeft: Spacing.one },
  timeRight: { textAlign: 'right', marginRight: Spacing.one },
  emptyChat: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: Spacing.two,
  },
  emptyChatEmoji: { fontSize: 48 },
  emptyChatText: { fontSize: 15, fontWeight: '500', textAlign: 'center' },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: Spacing.two,
    borderTopWidth: 1,
    gap: Spacing.two,
    paddingBottom: Platform.OS === 'ios' ? BottomTabInset : Spacing.two,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 14,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendIcon: { color: '#fff', fontSize: 18, fontWeight: '700' },
});
