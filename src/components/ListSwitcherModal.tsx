import React, { useMemo, useState, useEffect, useCallback } from 'react';
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
import { GroceryListDef } from '../types';
import {
  getLists,
  createList,
  deleteList,
  renameList,
  setActiveListId,
  getItemsForList,
  DEFAULT_LIST_ID_VALUE,
} from '../services/listService';
import { useSubscription } from '../contexts/SubscriptionContext';
import PremiumLock from './PremiumLock';

interface Props {
  visible: boolean;
  activeListId: string;
  onSelect: (id: string) => void;
  onClose: () => void;
  onUpgrade: () => void;
}

const LIST_PRESET_COLORS = ['#1E1B4B', '#FB923C', '#F43F5E', '#22C55E', '#0EA5E9', '#A855F7'];
const LIST_PRESET_ICONS: (React.ComponentProps<typeof Ionicons>['name'])[] = [
  'cart', 'basket', 'storefront', 'fast-food', 'leaf', 'medkit', 'gift', 'home',
];

export default function ListSwitcherModal({ visible, activeListId, onSelect, onClose, onUpgrade }: Props) {
  const { Colors, Shadow } = useTheme();
  const { has } = useSubscription();
  const styles = useMemo(() => makeStyles(Colors, Shadow), [Colors, Shadow]);

  const [lists, setLists] = useState<GroceryListDef[]>([]);
  const [itemCounts, setItemCounts] = useState<Record<string, number>>({});
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newIcon, setNewIcon] = useState<typeof LIST_PRESET_ICONS[number]>('cart');
  const [newColor, setNewColor] = useState(LIST_PRESET_COLORS[0]);

  const load = useCallback(async () => {
    const fresh = await getLists();
    setLists(fresh);
    const counts: Record<string, number> = {};
    for (const l of fresh) {
      const items = await getItemsForList(l.id);
      counts[l.id] = items.length;
    }
    setItemCounts(counts);
  }, []);

  useEffect(() => {
    if (visible) load();
  }, [visible, load]);

  const canCreateMore = true; // subscription-required model — no per-feature gates

  const handleCreateOpen = () => {
    setCreating(true);
  };

  const handleCreateConfirm = async () => {
    const name = newName.trim();
    if (!name) return;
    const created = await createList({ name, icon: newIcon, color: newColor });
    setNewName('');
    setCreating(false);
    await load();
    await setActiveListId(created.id);
    onSelect(created.id);
    onClose();
  };

  const handleSelect = async (id: string) => {
    await setActiveListId(id);
    onSelect(id);
    onClose();
  };

  const handleDelete = (list: GroceryListDef) => {
    if (list.id === DEFAULT_LIST_ID_VALUE) {
      Alert.alert("Can't delete", "The default list can't be removed, but you can rename it.");
      return;
    }
    Alert.alert(
      `Delete "${list.name}"?`,
      'All items in this list will be permanently deleted. Your other lists are unaffected.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteList(list.id);
            await load();
            if (activeListId === list.id) {
              onSelect(DEFAULT_LIST_ID_VALUE);
            }
          },
        },
      ]
    );
  };

  const handleRename = (list: GroceryListDef) => {
    Alert.prompt(
      'Rename list',
      `Currently: "${list.name}"`,
      async (text) => {
        if (text && text.trim()) {
          await renameList(list.id, text.trim());
          await load();
        }
      },
      'plain-text',
      list.name
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.headerRow}>
            <Text style={styles.title}>Your lists</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Ionicons name="close" size={22} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>


          <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
            {lists.map((l) => {
              const isActive = l.id === activeListId;
              return (
                <TouchableOpacity
                  key={l.id}
                  style={[styles.listRow, isActive && styles.listRowActive]}
                  onPress={() => handleSelect(l.id)}
                  onLongPress={() => handleRename(l)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.listIcon, { backgroundColor: l.color }]}>
                    <Ionicons
                      name={l.icon as any}
                      size={20}
                      color={Colors.textWhite}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.listName}>{l.name}</Text>
                    <Text style={styles.listMeta}>
                      {itemCounts[l.id] ?? 0} item{(itemCounts[l.id] ?? 0) !== 1 ? 's' : ''}
                      {isActive ? '  ·  active' : ''}
                    </Text>
                  </View>
                  {isActive && (
                    <Ionicons name="checkmark-circle" size={22} color={Colors.primary} />
                  )}
                  {l.id !== DEFAULT_LIST_ID_VALUE && (
                    <TouchableOpacity
                      onPress={() => handleDelete(l)}
                      style={styles.deleteBtn}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="trash-outline" size={18} color={Colors.textMuted} />
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {creating ? (
            <View style={styles.createBlock}>
              <Text style={styles.label}>List name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Costco run, Pharmacy"
                placeholderTextColor={Colors.textMuted}
                value={newName}
                onChangeText={setNewName}
                autoFocus
              />
              <Text style={styles.label}>Icon</Text>
              <View style={styles.iconGrid}>
                {LIST_PRESET_ICONS.map((ic) => (
                  <TouchableOpacity
                    key={ic}
                    style={[styles.iconChip, newIcon === ic && styles.iconChipActive]}
                    onPress={() => setNewIcon(ic)}
                  >
                    <Ionicons
                      name={ic}
                      size={20}
                      color={newIcon === ic ? Colors.textWhite : Colors.textPrimary}
                    />
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.label}>Color</Text>
              <View style={styles.colorRow}>
                {LIST_PRESET_COLORS.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[
                      styles.colorDot,
                      { backgroundColor: c },
                      newColor === c && styles.colorDotActive,
                    ]}
                    onPress={() => setNewColor(c)}
                  />
                ))}
              </View>
              <View style={styles.createBtns}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => {
                    setCreating(false);
                    setNewName('');
                  }}
                >
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.confirmBtn, !newName.trim() && styles.disabled]}
                  onPress={handleCreateConfirm}
                  disabled={!newName.trim()}
                >
                  <Text style={styles.confirmText}>Create list</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.newListBtn, !canCreateMore && styles.newListBtnLocked]}
              onPress={handleCreateOpen}
              activeOpacity={0.85}
            >
              <Ionicons
                name={canCreateMore ? 'add' : 'lock-closed'}
                size={18}
                color={Colors.textWhite}
              />
              <Text style={styles.newListBtnText}>
                {canCreateMore ? 'New list' : 'New list — Premium'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const makeStyles = (Colors: Theme['Colors'], Shadow: Theme['Shadow']) =>
  StyleSheet.create({
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
      justifyContent: 'space-between',
      marginBottom: 14,
    },
    title: {
      fontSize: 22,
      fontWeight: '900',
      color: Colors.textPrimary,
      letterSpacing: -0.4,
    },

    premiumBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: Colors.primaryDark,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 12,
      marginBottom: 12,
    },
    premiumBannerText: {
      flex: 1,
      fontSize: 12,
      color: Colors.textInverse,
      fontWeight: '700',
    },
    premiumBannerCta: {
      fontSize: 12,
      color: Colors.gradientGlow,
      fontWeight: '900',
      textDecorationLine: 'underline',
    },

    listRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 12,
      paddingHorizontal: 12,
      borderRadius: 14,
      backgroundColor: Colors.inputBg,
      marginBottom: 8,
    },
    listRowActive: {
      borderWidth: 1.5,
      borderColor: Colors.primary,
    },
    listIcon: {
      width: 44,
      height: 44,
      borderRadius: 22,
      justifyContent: 'center',
      alignItems: 'center',
    },
    listName: {
      fontSize: 15,
      fontWeight: '800',
      color: Colors.textPrimary,
    },
    listMeta: {
      fontSize: 11,
      color: Colors.textSecondary,
      marginTop: 1,
      fontWeight: '600',
    },
    deleteBtn: { padding: 6 },

    newListBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: Colors.primary,
      paddingVertical: 14,
      borderRadius: 14,
      marginTop: 12,
    },
    newListBtnLocked: {
      backgroundColor: Colors.textMuted,
    },
    newListBtnText: {
      fontSize: 15,
      fontWeight: '800',
      color: Colors.textWhite,
    },

    createBlock: {
      marginTop: 8,
      backgroundColor: Colors.inputBg,
      borderRadius: 16,
      padding: 14,
    },
    label: {
      fontSize: 11,
      fontWeight: '900',
      color: Colors.primary,
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      marginBottom: 6,
      marginTop: 8,
    },
    input: {
      borderWidth: 1.5,
      borderColor: Colors.border,
      borderRadius: 12,
      padding: 12,
      fontSize: 15,
      color: Colors.textPrimary,
      backgroundColor: Colors.cardBg,
    },
    iconGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    iconChip: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: Colors.cardBg,
      borderWidth: 1.5,
      borderColor: Colors.border,
      justifyContent: 'center',
      alignItems: 'center',
    },
    iconChipActive: {
      backgroundColor: Colors.primary,
      borderColor: Colors.primary,
    },
    colorRow: {
      flexDirection: 'row',
      gap: 10,
    },
    colorDot: {
      width: 36,
      height: 36,
      borderRadius: 18,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    colorDotActive: {
      borderColor: Colors.textPrimary,
    },
    createBtns: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 14,
    },
    cancelBtn: {
      flex: 1,
      padding: 12,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: Colors.border,
      alignItems: 'center',
    },
    cancelText: {
      fontSize: 14,
      color: Colors.textSecondary,
      fontWeight: '700',
    },
    confirmBtn: {
      flex: 2,
      padding: 12,
      borderRadius: 12,
      backgroundColor: Colors.primary,
      alignItems: 'center',
    },
    disabled: { opacity: 0.4 },
    confirmText: {
      fontSize: 14,
      color: Colors.textWhite,
      fontWeight: '800',
    },
  });
