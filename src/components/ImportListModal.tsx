import React, { useMemo, useState } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, Theme } from '../theme';
import { decodeSharedList, DecodedShare } from '../utils/shareList';
import { getItemEmoji } from '../utils/itemIcons';

interface Props {
  visible: boolean;
  onClose: () => void;
  onImport: (items: { name: string; quantity: string; priority: boolean }[]) => void;
}

export default function ImportListModal({ visible, onClose, onImport }: Props) {
  const { Colors, Shadow } = useTheme();
  const styles = useMemo(() => makeStyles(Colors, Shadow), [Colors, Shadow]);
  const [text, setText] = useState('');

  const decoded: DecodedShare | null = useMemo(() => decodeSharedList(text), [text]);

  const handleClose = () => {
    setText('');
    onClose();
  };

  const handleApply = () => {
    if (!decoded) return;
    onImport(decoded.items);
    setText('');
    onClose();
  };

  const sharedDate =
    decoded?.sharedAt
      ? new Date(decoded.sharedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
      : '';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.headerRow}>
            <View style={styles.headerIconBox}>
              <Ionicons name="download" size={20} color={Colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Import Shared List</Text>
              <Text style={styles.subtitle}>
                Paste a ShopMind share code from a friend
              </Text>
            </View>
            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Ionicons name="close" size={22} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.input}
            placeholder="Paste the share code (starts with SHOPMIND/1:…)"
            placeholderTextColor={Colors.textMuted}
            value={text}
            onChangeText={setText}
            multiline
            textAlignVertical="top"
            autoFocus
          />

          {decoded ? (
            <>
              <View style={styles.previewHeader}>
                <Ionicons name="checkmark-circle" size={14} color={Colors.gradientGlow} />
                <Text style={styles.previewLabel}>
                  VALID — {decoded.items.length} ITEM{decoded.items.length !== 1 ? 'S' : ''}
                  {sharedDate ? ` · shared ${sharedDate}` : ''}
                </Text>
              </View>
              <ScrollView style={styles.previewScroll} showsVerticalScrollIndicator={false}>
                {decoded.items.map((item, idx) => (
                  <View key={`${idx}-${item.name}`} style={styles.previewRow}>
                    <Text style={styles.previewEmoji}>{getItemEmoji(item.name)}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.previewName} numberOfLines={1}>{item.name}</Text>
                      {!!item.quantity && (
                        <Text style={styles.previewQty}>{item.quantity}</Text>
                      )}
                    </View>
                    {item.priority && (
                      <Ionicons name="star" size={14} color={Colors.urgent} />
                    )}
                  </View>
                ))}
              </ScrollView>
            </>
          ) : text.trim() ? (
            <View style={styles.emptyParse}>
              <Ionicons name="alert-circle-outline" size={18} color={Colors.warning} />
              <Text style={styles.emptyParseText}>
                That doesn't look like a valid ShopMind share code.
              </Text>
            </View>
          ) : null}

          <View style={styles.buttons}>
            <TouchableOpacity style={styles.cancelBtn} onPress={handleClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.addBtn, !decoded && styles.disabled]}
              onPress={handleApply}
              disabled={!decoded}
            >
              <Ionicons name="download" size={18} color={Colors.textWhite} />
              <Text style={styles.addText}>Import</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const makeStyles = (Colors: Theme['Colors'], Shadow: Theme['Shadow']) => StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: Colors.overlay,
  },
  sheet: {
    backgroundColor: Colors.cardBg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 22,
    paddingBottom: 36,
    maxHeight: '88%',
    ...Shadow.modal,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 18,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  headerIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 14,
    padding: 14,
    fontSize: 13,
    color: Colors.textPrimary,
    backgroundColor: Colors.inputBg,
    minHeight: 100,
    maxHeight: 160,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
    marginBottom: 8,
  },
  previewLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: Colors.gradientGlow,
    letterSpacing: 1.2,
  },
  previewScroll: { maxHeight: 200 },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.inputBg,
    borderRadius: 12,
    padding: 10,
    marginBottom: 6,
  },
  previewEmoji: { fontSize: 20 },
  previewName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  previewQty: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  emptyParse: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.warningLight,
    padding: 10,
    borderRadius: 12,
    marginTop: 12,
  },
  emptyParseText: {
    fontSize: 12,
    color: Colors.textPrimary,
    fontWeight: '600',
    flex: 1,
  },
  buttons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  cancelBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 15,
    color: Colors.textSecondary,
    fontWeight: '700',
  },
  addBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    padding: 14,
    borderRadius: 14,
  },
  disabled: { opacity: 0.35 },
  addText: {
    fontSize: 15,
    color: Colors.textWhite,
    fontWeight: '800',
  },
});
