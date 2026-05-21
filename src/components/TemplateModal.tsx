import React, { useMemo, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, Theme } from '../theme';
import { TEMPLATES, Template } from '../utils/templates';

interface Props {
  visible: boolean;
  onClose: () => void;
  onApply: (items: { name: string; quantity: string }[]) => void;
}

export default function TemplateModal({ visible, onClose, onApply }: Props) {
  const { Colors, Shadow } = useTheme();
  const styles = useMemo(() => makeStyles(Colors, Shadow), [Colors, Shadow]);
  const [selected, setSelected] = useState<Template | null>(null);

  const handleApply = () => {
    if (!selected) return;
    Alert.alert(
      `Add ${selected.name}?`,
      `${selected.items.length} items will be added to your list. Duplicates are skipped.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add to List',
          style: 'default',
          onPress: () => {
            onApply(selected.items.map((i) => ({ name: i.name, quantity: i.quantity || '' })));
            setSelected(null);
            onClose();
          },
        },
      ]
    );
  };

  const handleClose = () => {
    setSelected(null);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.handle} />

          {selected ? (
            // Detail view
            <>
              <View style={styles.detailHeader}>
                <TouchableOpacity onPress={() => setSelected(null)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                  <Ionicons name="chevron-back" size={24} color={Colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.detailTitle}>{selected.emoji}  {selected.name}</Text>
                <View style={{ width: 24 }} />
              </View>
              <Text style={styles.detailTagline}>{selected.tagline}</Text>
              <Text style={styles.detailCount}>
                {selected.items.length} items
              </Text>
              <ScrollView style={styles.itemList}>
                {selected.items.map((it, idx) => (
                  <View
                    key={`${selected.id}-${idx}`}
                    style={[styles.itemRow, { borderLeftColor: selected.accentColor }]}
                  >
                    <Text style={styles.itemName}>{it.name}</Text>
                    {!!it.quantity && (
                      <Text style={styles.itemQty}>{it.quantity}</Text>
                    )}
                  </View>
                ))}
              </ScrollView>
              <TouchableOpacity
                style={[styles.applyBtn, { backgroundColor: selected.accentColor }]}
                onPress={handleApply}
                activeOpacity={0.9}
              >
                <Ionicons name="add-circle" size={20} color={Colors.textWhite} />
                <Text style={styles.applyBtnText}>Add {selected.items.length} items</Text>
              </TouchableOpacity>
            </>
          ) : (
            // Grid view
            <>
              <View style={styles.headerRow}>
                <View>
                  <Text style={styles.title}>Quick-Start Templates</Text>
                  <Text style={styles.subtitle}>One tap — a full list, instantly</Text>
                </View>
                <TouchableOpacity onPress={handleClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                  <Ionicons name="close" size={24} color={Colors.textMuted} />
                </TouchableOpacity>
              </View>
              <ScrollView
                contentContainerStyle={styles.grid}
                showsVerticalScrollIndicator={false}
              >
                {TEMPLATES.map((tpl) => (
                  <TouchableOpacity
                    key={tpl.id}
                    style={[styles.card, { borderColor: tpl.accentColor }]}
                    onPress={() => setSelected(tpl)}
                    activeOpacity={0.85}
                  >
                    <View style={[styles.cardEmojiCircle, { backgroundColor: tpl.accentColor }]}>
                      <Text style={styles.cardEmoji}>{tpl.emoji}</Text>
                    </View>
                    <Text style={styles.cardName} numberOfLines={1}>{tpl.name}</Text>
                    <Text style={styles.cardTagline} numberOfLines={2}>{tpl.tagline}</Text>
                    <View style={styles.cardFooter}>
                      <Ionicons name="basket-outline" size={11} color={tpl.accentColor} />
                      <Text style={[styles.cardCount, { color: tpl.accentColor }]}>
                        {tpl.items.length} items
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          )}
        </View>
      </View>
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
    backgroundColor: Colors.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    paddingBottom: 32,
    height: '85%',
    ...Shadow.modal,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 3,
    fontWeight: '500',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingBottom: 20,
  },
  card: {
    width: '48%',
    backgroundColor: Colors.cardBg,
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    borderLeftWidth: 4,
    ...Shadow.card,
  },
  cardEmojiCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardEmoji: { fontSize: 22 },
  cardName: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  cardTagline: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 3,
    lineHeight: 15,
    minHeight: 30,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 10,
  },
  cardCount: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },

  // Detail view
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  detailTagline: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 6,
  },
  detailCount: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    textAlign: 'center',
    marginBottom: 16,
  },
  itemList: {
    flex: 1,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: Colors.cardBg,
    borderRadius: 10,
    marginBottom: 6,
    borderLeftWidth: 3,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  itemQty: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  applyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    marginTop: 12,
  },
  applyBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textWhite,
    letterSpacing: 0.3,
  },
});
