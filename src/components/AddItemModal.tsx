import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, Theme } from '../theme';
import { getItemEmoji } from '../utils/itemIcons';
import { getCategoryKey } from '../utils/categoryStyle';
import { GroceryItem } from '../types';

interface Props {
  visible: boolean;
  editingItem?: GroceryItem | null;
  onAdd: (name: string, quantity: string, priority: boolean) => void;
  onSaveEdit?: (id: string, name: string, quantity: string, priority: boolean) => void;
  onClose: () => void;
}

export default function AddItemModal({ visible, editingItem, onAdd, onSaveEdit, onClose }: Props) {
  const { Colors, Shadow, CategoryColors } = useTheme();
  const styles = useMemo(() => makeStyles(Colors, Shadow), [Colors, Shadow]);

  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [priority, setPriority] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false);
  const nameInputRef = useRef<TextInput>(null);
  const micPulse = useRef(new Animated.Value(1)).current;

  const isEditing = !!editingItem;

  useEffect(() => {
    if (visible && editingItem) {
      setName(editingItem.name);
      setQuantity(editingItem.quantity);
      setPriority(!!editingItem.priority);
      setVoiceMode(false);
    } else if (visible && !editingItem) {
      setName('');
      setQuantity('');
      setPriority(false);
      setVoiceMode(false);
    }
  }, [visible, editingItem]);

  // Pulse animation for the mic while in voice mode
  useEffect(() => {
    if (voiceMode) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(micPulse, { toValue: 1.2, duration: 600, useNativeDriver: true }),
          Animated.timing(micPulse, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    }
  }, [voiceMode, micPulse]);

  const emoji = name.trim() ? getItemEmoji(name) : '🛒';
  const cat = name.trim()
    ? (CategoryColors[getCategoryKey(name)] || CategoryColors.pantry)
    : { color: Colors.primary, tint: Colors.iconBg, label: 'New Item' };

  const handleVoiceTrigger = () => {
    setVoiceMode(true);
    setName('');
    setTimeout(() => nameInputRef.current?.focus(), 50);
    Alert.alert(
      '🎤 Voice Input',
      Platform.OS === 'ios'
        ? 'Tap the 🎤 mic key on your keyboard, then say what you need.\n\n(If you don\'t see it, enable "Dictation" in Settings → General → Keyboard.)'
        : 'Tap the 🎤 mic icon on your Gboard / Samsung Keyboard, then speak.\n\n(If hidden, enable "Voice Typing" in your keyboard\'s settings.)',
      [{ text: 'Got it' }]
    );
  };

  const handleSubmit = () => {
    if (!name.trim()) return;
    if (isEditing && editingItem && onSaveEdit) {
      onSaveEdit(editingItem.id, name.trim(), quantity.trim(), priority);
    } else {
      onAdd(name.trim(), quantity.trim(), priority);
    }
    reset();
  };

  const reset = () => {
    setName('');
    setQuantity('');
    setPriority(false);
    setVoiceMode(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View style={styles.sheet}>
          <View style={styles.handle} />

          {/* Live emoji + category preview */}
          <View style={styles.previewRow}>
            <View style={[styles.previewIcon, { backgroundColor: cat.tint }]}>
              <Text style={styles.previewEmoji}>{emoji}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{isEditing ? 'Edit Item' : 'Add Item'}</Text>
              <Text style={[styles.previewCategory, { color: cat.color }]}>{cat.label}</Text>
            </View>
            {!isEditing && (
              <TouchableOpacity
                onPress={handleVoiceTrigger}
                style={[styles.voiceFab, voiceMode && styles.voiceFabActive]}
                activeOpacity={0.85}
              >
                <Animated.View style={{ transform: [{ scale: voiceMode ? micPulse : 1 }] }}>
                  <Ionicons
                    name="mic"
                    size={22}
                    color={voiceMode ? Colors.textWhite : Colors.accent}
                  />
                </Animated.View>
              </TouchableOpacity>
            )}
          </View>

          {voiceMode && (
            <View style={styles.voiceHint}>
              <Ionicons name="information-circle" size={14} color={Colors.accent} />
              <Text style={styles.voiceHintText}>
                Tap the mic on your keyboard and start talking
              </Text>
            </View>
          )}

          <TextInput
            ref={nameInputRef}
            style={[styles.input, voiceMode && styles.inputVoice]}
            placeholder="Item name  (e.g. Milk, Apples)"
            placeholderTextColor={Colors.textMuted}
            value={name}
            onChangeText={setName}
            autoFocus
            returnKeyType="next"
          />
          <TextInput
            style={styles.input}
            placeholder="Quantity — optional  (e.g. 1 gallon, 2 lbs)"
            placeholderTextColor={Colors.textMuted}
            value={quantity}
            onChangeText={setQuantity}
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
          />

          {/* Priority toggle */}
          <TouchableOpacity
            style={[styles.priorityRow, priority && styles.priorityRowActive]}
            onPress={() => setPriority((p) => !p)}
            activeOpacity={0.8}
          >
            <Ionicons
              name={priority ? 'star' : 'star-outline'}
              size={22}
              color={priority ? Colors.urgent : Colors.textMuted}
            />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[styles.priorityLabel, priority && styles.priorityLabelActive]}>
                Mark as urgent
              </Text>
              <Text style={styles.priorityHint}>
                Urgent items float to the top of your list
              </Text>
            </View>
          </TouchableOpacity>

          <View style={styles.buttons}>
            <TouchableOpacity style={styles.cancelBtn} onPress={handleClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.addBtn, !name.trim() && styles.disabled]}
              onPress={handleSubmit}
              disabled={!name.trim()}
            >
              <Text style={styles.addText}>{isEditing ? 'Save Changes' : 'Add to List'}</Text>
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
    padding: 24,
    paddingBottom: 44,
    ...Shadow.modal,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  previewIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  previewEmoji: { fontSize: 30 },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  previewCategory: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 2,
  },

  voiceFab: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.accentLight,
    borderWidth: 1.5,
    borderColor: Colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  voiceFabActive: {
    backgroundColor: Colors.accent,
  },
  voiceHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.accentLight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: Colors.accent,
  },
  voiceHintText: {
    fontSize: 12,
    color: Colors.accentDark,
    fontWeight: '700',
    flex: 1,
  },

  input: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 14,
    padding: 14,
    fontSize: 16,
    marginBottom: 12,
    color: Colors.textPrimary,
    backgroundColor: Colors.inputBg,
  },
  inputVoice: {
    borderColor: Colors.accent,
    backgroundColor: Colors.accentLight,
  },
  priorityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.border,
    padding: 12,
    marginTop: 4,
  },
  priorityRowActive: {
    borderColor: Colors.urgent,
    backgroundColor: Colors.urgentLight,
  },
  priorityLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  priorityLabelActive: {
    color: Colors.urgentDark,
  },
  priorityHint: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  cancelBtn: {
    flex: 1,
    padding: 15,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  addBtn: {
    flex: 2,
    backgroundColor: Colors.primary,
    padding: 15,
    borderRadius: 14,
    alignItems: 'center',
  },
  disabled: { opacity: 0.35 },
  addText: {
    fontSize: 16,
    color: Colors.textWhite,
    fontWeight: '700',
  },
});
