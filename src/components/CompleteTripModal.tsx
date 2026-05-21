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
import { GroceryItem } from '../types';
import { getItemEmoji } from '../utils/itemIcons';

interface Props {
  visible: boolean;
  checkedItems: GroceryItem[];
  onClose: () => void;
  onConfirm: (data: {
    storeName: string;
    totalSpent: number | undefined;
    itemPrices: { name: string; price: number }[];
  }) => void;
}

export default function CompleteTripModal({ visible, checkedItems, onClose, onConfirm }: Props) {
  const { Colors, Shadow } = useTheme();
  const styles = useMemo(() => makeStyles(Colors, Shadow), [Colors, Shadow]);

  const [storeName, setStoreName] = useState('');
  const [totalSpent, setTotalSpent] = useState('');
  const [showItemized, setShowItemized] = useState(false);
  const [itemPrices, setItemPrices] = useState<Record<string, string>>({});

  const reset = () => {
    setStoreName('');
    setTotalSpent('');
    setShowItemized(false);
    setItemPrices({});
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSkip = () => {
    // Confirm without price data
    onConfirm({ storeName: storeName.trim(), totalSpent: undefined, itemPrices: [] });
    reset();
  };

  const handleConfirm = () => {
    const totalNum = parseFloat(totalSpent);
    const prices: { name: string; price: number }[] = [];
    if (showItemized) {
      for (const item of checkedItems) {
        const v = parseFloat(itemPrices[item.id] || '');
        if (!isNaN(v) && v > 0) prices.push({ name: item.name, price: v });
      }
    }
    onConfirm({
      storeName: storeName.trim(),
      totalSpent: !isNaN(totalNum) && totalNum > 0 ? totalNum : undefined,
      itemPrices: prices,
    });
    reset();
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
              <Ionicons name="receipt" size={22} color={Colors.gradientGlow} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Complete Trip</Text>
              <Text style={styles.subtitle}>
                Track where you shopped — optional, helps spot savings later
              </Text>
            </View>
            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Ionicons name="close" size={22} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Store */}
            <Text style={styles.label}>Store name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Whole Foods, Trader Joe's"
              placeholderTextColor={Colors.textMuted}
              value={storeName}
              onChangeText={setStoreName}
              returnKeyType="next"
            />

            {/* Total */}
            <Text style={styles.label}>Total spent</Text>
            <View style={styles.amountInputBox}>
              <Text style={styles.amountPrefix}>$</Text>
              <TextInput
                style={styles.amountInput}
                placeholder="0.00"
                placeholderTextColor={Colors.textMuted}
                value={totalSpent}
                onChangeText={setTotalSpent}
                keyboardType="decimal-pad"
                returnKeyType="done"
              />
            </View>

            {/* Itemized toggle */}
            <TouchableOpacity
              style={styles.itemizedToggle}
              onPress={() => setShowItemized((s) => !s)}
              activeOpacity={0.75}
            >
              <Ionicons
                name={showItemized ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={Colors.primary}
              />
              <Text style={styles.itemizedToggleText}>
                {showItemized ? 'Hide' : 'Add'} per-item prices
                <Text style={styles.itemizedHint}>  · unlocks cheapest-store insights</Text>
              </Text>
            </TouchableOpacity>

            {showItemized && (
              <View style={styles.itemizedBlock}>
                {checkedItems.map((item) => (
                  <View key={item.id} style={styles.itemRow}>
                    <Text style={styles.itemEmoji}>{getItemEmoji(item.name)}</Text>
                    <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                    <View style={styles.itemAmountBox}>
                      <Text style={styles.itemAmountPrefix}>$</Text>
                      <TextInput
                        style={styles.itemAmountInput}
                        placeholder="0.00"
                        placeholderTextColor={Colors.textMuted}
                        value={itemPrices[item.id] || ''}
                        onChangeText={(v) => setItemPrices({ ...itemPrices, [item.id]: v })}
                        keyboardType="decimal-pad"
                      />
                    </View>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>

          <View style={styles.buttons}>
            <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
              <Text style={styles.skipText}>Skip prices</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
              <Ionicons name="checkmark" size={18} color={Colors.textWhite} />
              <Text style={styles.confirmText}>Complete Trip</Text>
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
    maxHeight: '85%',
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
    marginBottom: 18,
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
  label: {
    fontSize: 11,
    fontWeight: '900',
    color: Colors.primary,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 14,
    padding: 14,
    fontSize: 16,
    color: Colors.textPrimary,
    backgroundColor: Colors.inputBg,
  },
  amountInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 14,
    backgroundColor: Colors.inputBg,
    paddingHorizontal: 14,
  },
  amountPrefix: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textSecondary,
    marginRight: 6,
  },
  amountInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  itemizedToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
    paddingVertical: 10,
  },
  itemizedToggleText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
  },
  itemizedHint: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  itemizedBlock: {
    backgroundColor: Colors.inputBg,
    borderRadius: 14,
    padding: 10,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  itemEmoji: { fontSize: 20 },
  itemName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  itemAmountBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardBg,
    borderRadius: 10,
    paddingHorizontal: 8,
    minWidth: 86,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  itemAmountPrefix: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginRight: 2,
  },
  itemAmountInput: {
    flex: 1,
    paddingVertical: 8,
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  buttons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  skipBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  skipText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '700',
  },
  confirmBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    padding: 14,
    borderRadius: 14,
  },
  confirmText: {
    fontSize: 15,
    color: Colors.textWhite,
    fontWeight: '800',
  },
});
