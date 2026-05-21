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
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, Theme } from '../theme';
import { parseRecipeText, ParsedItem } from '../utils/recipeParser';
import { getItemEmoji } from '../utils/itemIcons';

interface Props {
  visible: boolean;
  onClose: () => void;
  onApply: (items: ParsedItem[]) => void;
}

const SAMPLE = `2 cups flour
1 lb chicken breast
3 large eggs
1 onion, chopped
2 cloves garlic
1 tbsp olive oil
salt to taste`;

export default function RecipePasteModal({ visible, onClose, onApply }: Props) {
  const { Colors, Shadow } = useTheme();
  const styles = useMemo(() => makeStyles(Colors, Shadow), [Colors, Shadow]);
  const [text, setText] = useState('');

  const parsed = useMemo(() => parseRecipeText(text), [text]);

  const handleClose = () => {
    setText('');
    onClose();
  };

  const handleApply = () => {
    if (parsed.length === 0) return;
    Alert.alert(
      `Add ${parsed.length} item${parsed.length !== 1 ? 's' : ''}?`,
      'Items already on your list will be skipped automatically.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add to List',
          onPress: () => {
            onApply(parsed);
            setText('');
            onClose();
          },
        },
      ]
    );
  };

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
              <Ionicons name="restaurant" size={22} color={Colors.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Paste Recipe</Text>
              <Text style={styles.subtitle}>
                Drop an ingredient list — we'll extract the items
              </Text>
            </View>
            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Ionicons name="close" size={22} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.input}
            placeholder={`Paste ingredients here…\n\nExample:\n${SAMPLE}`}
            placeholderTextColor={Colors.textMuted}
            value={text}
            onChangeText={setText}
            multiline
            textAlignVertical="top"
            autoFocus
          />

          {/* Preview */}
          {parsed.length > 0 && (
            <>
              <View style={styles.previewHeader}>
                <Ionicons name="sparkles" size={13} color={Colors.gradientGlow} />
                <Text style={styles.previewLabel}>
                  PARSED {parsed.length} ITEM{parsed.length !== 1 ? 'S' : ''}
                </Text>
              </View>
              <ScrollView style={styles.previewScroll} showsVerticalScrollIndicator={false}>
                {parsed.map((item, idx) => (
                  <View key={`${idx}-${item.name}`} style={styles.previewRow}>
                    <Text style={styles.previewEmoji}>{getItemEmoji(item.name)}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.previewName} numberOfLines={1}>{item.name}</Text>
                      {!!item.quantity && (
                        <Text style={styles.previewQty}>{item.quantity}</Text>
                      )}
                    </View>
                  </View>
                ))}
              </ScrollView>
            </>
          )}

          {text.trim() && parsed.length === 0 && (
            <View style={styles.emptyParse}>
              <Ionicons name="alert-circle-outline" size={18} color={Colors.warning} />
              <Text style={styles.emptyParseText}>
                Couldn't recognize ingredients. Try one item per line.
              </Text>
            </View>
          )}

          <View style={styles.buttons}>
            <TouchableOpacity style={styles.cancelBtn} onPress={handleClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.addBtn, parsed.length === 0 && styles.disabled]}
              onPress={handleApply}
              disabled={parsed.length === 0}
            >
              <Ionicons name="add-circle" size={18} color={Colors.textWhite} />
              <Text style={styles.addText}>
                Add {parsed.length > 0 ? parsed.length : ''} {parsed.length === 1 ? 'item' : 'items'}
              </Text>
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
    backgroundColor: Colors.accentLight,
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
    fontSize: 14,
    color: Colors.textPrimary,
    backgroundColor: Colors.inputBg,
    minHeight: 130,
    maxHeight: 200,
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
    letterSpacing: 1.4,
  },
  previewScroll: {
    maxHeight: 180,
  },
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
