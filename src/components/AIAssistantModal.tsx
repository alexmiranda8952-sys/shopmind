import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, Theme } from '../theme';
import { askAI, getAnthropicApiKey, AIExtractedItem } from '../services/aiAssistantService';
import { getItemEmoji } from '../utils/itemIcons';

interface Props {
  visible: boolean;
  onClose: () => void;
  onApply: (items: { name: string; quantity: string; priority?: boolean }[]) => void;
  onConfigureKey: () => void;
}

const SUGGESTED_PROMPTS = [
  'Ingredients for chicken tacos for 4',
  'A simple breakfast for the week',
  'Birthday party snacks for 8 kids',
  'Low-carb dinner ingredients',
];

export default function AIAssistantModal({ visible, onClose, onApply, onConfigureKey }: Props) {
  const { Colors, Shadow } = useTheme();
  const styles = useMemo(() => makeStyles(Colors, Shadow), [Colors, Shadow]);

  const [prompt, setPrompt] = useState('');
  const [reply, setReply] = useState('');
  const [items, setItems] = useState<AIExtractedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const apiKeyRef = useRef('');

  useEffect(() => {
    if (visible) {
      (async () => {
        const key = await getAnthropicApiKey();
        apiKeyRef.current = key;
        setHasKey(!!key);
      })();
    } else {
      setPrompt('');
      setReply('');
      setItems([]);
      setError(null);
    }
  }, [visible]);

  const handleAsk = async (q?: string) => {
    const question = (q ?? prompt).trim();
    if (!question || loading) return;
    setPrompt(question);
    setLoading(true);
    setError(null);
    setItems([]);
    setReply('');

    const result = await askAI(question, apiKeyRef.current);
    setLoading(false);
    if (!result.ok) {
      setError(result.error || 'Something went wrong');
      return;
    }
    setReply(result.reply);
    setItems(result.items);
  };

  const handleAddAll = () => {
    if (items.length === 0) return;
    onApply(items.map((i) => ({ name: i.name, quantity: i.quantity || '' })));
    onClose();
  };

  const renderNoKey = () => (
    <View style={styles.noKeyBox}>
      <Ionicons name="key" size={28} color={Colors.gradientGlow} />
      <Text style={styles.noKeyTitle}>Add your Claude API key</Text>
      <Text style={styles.noKeyBody}>
        ShopMind's AI assistant uses your own Anthropic API key for full privacy and no per-message
        markup. Get one at console.anthropic.com — most requests cost less than a cent.
      </Text>
      <TouchableOpacity style={styles.noKeyBtn} onPress={onConfigureKey}>
        <Ionicons name="settings-outline" size={16} color={Colors.textWhite} />
        <Text style={styles.noKeyBtnText}>Open settings</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.headerRow}>
            <View style={styles.aiIconBox}>
              <Ionicons name="sparkles" size={22} color={Colors.primaryDark} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>AI Assistant</Text>
              <Text style={styles.subtitle}>
                Describe what you need — items add themselves
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Ionicons name="close" size={22} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>

          {hasKey === null ? (
            <ActivityIndicator color={Colors.primary} style={{ marginVertical: 30 }} />
          ) : !hasKey ? (
            renderNoKey()
          ) : (
            <>
              <TextInput
                style={styles.input}
                placeholder="e.g. ingredients for chili for 6 people"
                placeholderTextColor={Colors.textMuted}
                value={prompt}
                onChangeText={setPrompt}
                multiline
                autoFocus
                onSubmitEditing={() => handleAsk()}
                returnKeyType="send"
              />

              {!loading && items.length === 0 && !error && (
                <View style={styles.promptChips}>
                  {SUGGESTED_PROMPTS.map((p) => (
                    <TouchableOpacity
                      key={p}
                      style={styles.promptChip}
                      onPress={() => handleAsk(p)}
                    >
                      <Text style={styles.promptChipText}>{p}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {loading && (
                <View style={styles.loadingBox}>
                  <ActivityIndicator color={Colors.primary} />
                  <Text style={styles.loadingText}>Thinking through your list…</Text>
                </View>
              )}

              {error && (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle" size={18} color={Colors.urgent} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              {!loading && reply && (
                <View style={styles.replyBox}>
                  <Text style={styles.replyText}>{reply}</Text>
                </View>
              )}

              {!loading && items.length > 0 && (
                <>
                  <Text style={styles.previewLabel}>
                    SUGGESTED ITEMS · {items.length}
                  </Text>
                  <ScrollView style={styles.previewScroll}>
                    {items.map((item, idx) => (
                      <View key={`${idx}-${item.name}`} style={styles.previewRow}>
                        <Text style={styles.previewEmoji}>{getItemEmoji(item.name)}</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.previewName}>{item.name}</Text>
                          {!!item.quantity && <Text style={styles.previewQty}>{item.quantity}</Text>}
                        </View>
                      </View>
                    ))}
                  </ScrollView>
                </>
              )}

              <View style={styles.buttons}>
                <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                {items.length > 0 ? (
                  <TouchableOpacity style={styles.applyBtn} onPress={handleAddAll}>
                    <Ionicons name="add-circle" size={18} color={Colors.textWhite} />
                    <Text style={styles.applyText}>Add {items.length} to list</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[styles.applyBtn, !prompt.trim() && styles.disabled]}
                    onPress={() => handleAsk()}
                    disabled={!prompt.trim() || loading}
                  >
                    <Ionicons name="sparkles" size={18} color={Colors.textWhite} />
                    <Text style={styles.applyText}>Ask</Text>
                  </TouchableOpacity>
                )}
              </View>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const makeStyles = (Colors: Theme['Colors'], Shadow: Theme['Shadow']) => StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: Colors.overlay },
  sheet: {
    backgroundColor: Colors.cardBg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 22,
    paddingBottom: 36,
    maxHeight: '90%',
    ...Shadow.modal,
  },
  handle: {
    width: 40, height: 4, backgroundColor: Colors.border,
    borderRadius: 2, alignSelf: 'center', marginBottom: 18,
  },
  headerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14,
  },
  aiIconBox: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: Colors.gradientGlow,
    justifyContent: 'center', alignItems: 'center',
  },
  title: { fontSize: 20, fontWeight: '900', color: Colors.textPrimary, letterSpacing: -0.3 },
  subtitle: { fontSize: 12, color: Colors.textSecondary, fontWeight: '500', marginTop: 2 },

  input: {
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: 14,
    padding: 14, fontSize: 15, color: Colors.textPrimary,
    backgroundColor: Colors.inputBg, minHeight: 60, maxHeight: 120,
  },
  promptChips: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12,
  },
  promptChip: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 14,
  },
  promptChipText: {
    fontSize: 11, color: Colors.primary, fontWeight: '700',
  },

  loadingBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.inputBg, padding: 14, borderRadius: 12, marginTop: 14,
  },
  loadingText: { fontSize: 13, color: Colors.textSecondary, fontWeight: '600' },

  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.urgentLight, padding: 12, borderRadius: 12, marginTop: 14,
  },
  errorText: { flex: 1, fontSize: 12, color: Colors.urgentDark, fontWeight: '700' },

  replyBox: {
    backgroundColor: Colors.primaryLight, padding: 12, borderRadius: 12, marginTop: 14,
    borderLeftWidth: 3, borderLeftColor: Colors.primary,
  },
  replyText: { fontSize: 13, color: Colors.textPrimary, fontWeight: '600', lineHeight: 18 },

  previewLabel: {
    fontSize: 10, fontWeight: '900', color: Colors.gradientGlow,
    letterSpacing: 1.4, marginTop: 14, marginBottom: 8,
  },
  previewScroll: { maxHeight: 180 },
  previewRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.inputBg, borderRadius: 12, padding: 10, marginBottom: 6,
  },
  previewEmoji: { fontSize: 20 },
  previewName: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  previewQty: { fontSize: 12, color: Colors.textSecondary, marginTop: 1 },

  buttons: { flexDirection: 'row', gap: 10, marginTop: 16 },
  cancelBtn: {
    flex: 1, padding: 14, borderRadius: 14,
    borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center',
  },
  cancelText: { fontSize: 14, color: Colors.textSecondary, fontWeight: '700' },
  applyBtn: {
    flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: Colors.primary, padding: 14, borderRadius: 14,
  },
  disabled: { opacity: 0.35 },
  applyText: { fontSize: 15, color: Colors.textWhite, fontWeight: '800' },

  // No-key onboarding
  noKeyBox: { alignItems: 'center', padding: 20 },
  noKeyTitle: {
    fontSize: 17, fontWeight: '900', color: Colors.textPrimary, marginTop: 10, marginBottom: 6,
  },
  noKeyBody: {
    fontSize: 13, color: Colors.textSecondary, textAlign: 'center',
    lineHeight: 19, marginBottom: 16, fontWeight: '500',
  },
  noKeyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.primary,
    paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12,
  },
  noKeyBtnText: { color: Colors.textWhite, fontSize: 14, fontWeight: '800' },
});
