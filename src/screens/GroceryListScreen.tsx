import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  SectionList,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  Share,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { GroceryItem as GroceryItemType, Trip, PriceRecord } from '../types';
import {
  getGroceryList,
  saveGroceryList,
  getSettings,
  saveSettings,
  saveTrip,
  getTripHistory,
  appendPriceRecords,
} from '../services/storageService';
import { useTheme, Theme, CategoryOrder } from '../theme';
import GroceryItemComponent from '../components/GroceryItem';
import AddItemModal from '../components/AddItemModal';
import TemplateModal from '../components/TemplateModal';
import RecipePasteModal from '../components/RecipePasteModal';
import ImportListModal from '../components/ImportListModal';
import CompleteTripModal from '../components/CompleteTripModal';
import ProgressRing from '../components/ProgressRing';
import Constellation from '../components/Constellation';
import SuggestionStrip from '../components/SuggestionStrip';
import CelebrationOverlay from '../components/CelebrationOverlay';
import { getItemCategory } from '../utils/storeItemMatching';
import { getItemEmoji } from '../utils/itemIcons';
import { computeSuggestions, Suggestion } from '../utils/suggestions';
import { buildShareableText } from '../utils/shareList';
import { getCategoryKey } from '../utils/categoryStyle';
import { refreshLiveWidget } from '../services/widgetService';
import { getActiveList, getLists } from '../services/listService';
import { GroceryListDef } from '../types';
import { useSubscription } from '../contexts/SubscriptionContext';
import ListSwitcherModal from '../components/ListSwitcherModal';
import AIAssistantModal from '../components/AIAssistantModal';
import BarcodeScannerModal from '../components/BarcodeScannerModal';
import { useNavigation } from '@react-navigation/native';

type ViewMode = 'flat' | 'aisle';

export default function GroceryListScreen(): React.JSX.Element {
  const { Colors, Shadow, CategoryColors } = useTheme();
  const styles = useMemo(() => makeStyles(Colors, Shadow), [Colors, Shadow]);
  const { isPremium, openPaywall } = useSubscription();

  const [items, setItems] = useState<GroceryItemType[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [activeList, setActiveList] = useState<GroceryListDef | null>(null);
  const [listCount, setListCount] = useState(1);
  const [showListSwitcher, setShowListSwitcher] = useState(false);
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set());
  const [showAddModal, setShowAddModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showRecipeModal, setShowRecipeModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);
  const [showCompleteTripModal, setShowCompleteTripModal] = useState(false);
  const navigation = useNavigation<any>();
  const [editingItem, setEditingItem] = useState<GroceryItemType | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('flat');
  const [showCelebration, setShowCelebration] = useState(false);
  const [reorderMode, setReorderMode] = useState(false);
  const wasAllChecked = useRef(false);

  const loadAll = useCallback(async () => {
    const [list, settings, history, activeListDef, allLists] = await Promise.all([
      getGroceryList(),
      getSettings(),
      getTripHistory(),
      getActiveList(),
      getLists(),
    ]);
    setItems(list);
    setTrips(history);
    setActiveList(activeListDef);
    setListCount(allLists.length);
    setViewMode((settings.listViewMode ?? 'flat') as ViewMode);
    refreshLiveWidget(list).catch(() => {});
  }, []);

  const handleListSelected = (_id: string) => {
    // After switching, reload everything for the new active list
    loadAll();
  };

  useFocusEffect(useCallback(() => { loadAll(); }, [loadAll]));

  useEffect(() => {
    const total = items.length;
    const checked = items.filter((i) => i.checked).length;
    const allDone = total > 0 && checked === total;
    if (allDone && !wasAllChecked.current) {
      setShowCelebration(true);
    }
    wasAllChecked.current = allDone;
  }, [items]);

  const persistItems = async (updated: GroceryItemType[]) => {
    setItems(updated);
    await saveGroceryList(updated);
    // Keep the live widget in sync — no-op if the user hasn't enabled it.
    refreshLiveWidget(updated).catch(() => {});
  };

  const addItem = async (name: string, quantity: string, priority: boolean) => {
    const exists = items.some((i) => i.name.toLowerCase() === name.toLowerCase());
    if (exists) {
      setShowAddModal(false);
      return;
    }
    const newItem: GroceryItemType = {
      id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
      name,
      quantity,
      checked: false,
      createdAt: Date.now(),
      priority,
      boughtCount: 0,
    };
    await persistItems([newItem, ...items]);
    setShowAddModal(false);
  };

  const saveEdit = async (id: string, name: string, quantity: string, priority: boolean) => {
    const updated = items.map((i) =>
      i.id === id ? { ...i, name, quantity, priority } : i
    );
    await persistItems(updated);
    setEditingItem(null);
  };

  const toggleItem = async (id: string) => {
    if (reorderMode) return;
    const updated = items.map((i) => (i.id === id ? { ...i, checked: !i.checked } : i));
    await persistItems(updated);
  };

  const togglePriority = async (id: string) => {
    const updated = items.map((i) => (i.id === id ? { ...i, priority: !i.priority } : i));
    await persistItems(updated);
  };

  const deleteItem = async (id: string) => {
    const updated = items.filter((i) => i.id !== id);
    await persistItems(updated);
  };

  const moveItem = async (id: string, direction: 'up' | 'down') => {
    const idx = items.findIndex((i) => i.id === id);
    if (idx === -1) return;
    const target = direction === 'up' ? idx - 1 : idx + 1;
    if (target < 0 || target >= items.length) return;
    const updated = [...items];
    [updated[idx], updated[target]] = [updated[target], updated[idx]];
    await persistItems(updated);
  };

  const applyTemplateOrRecipe = async (incoming: { name: string; quantity: string; priority?: boolean }[]) => {
    const existingNames = new Set(items.map((i) => i.name.toLowerCase()));
    const now = Date.now();
    const newItems: GroceryItemType[] = incoming
      .filter((it) => !existingNames.has(it.name.toLowerCase()))
      .map((it, idx) => ({
        id: `${now}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
        name: it.name,
        quantity: it.quantity,
        checked: false,
        createdAt: now + idx,
        priority: !!it.priority,
        boughtCount: 0,
      }));
    if (newItems.length === 0) return;
    await persistItems([...newItems, ...items]);
  };

  const resetForNewTrip = () => {
    const checked = items.filter((i) => i.checked);
    if (checked.length === 0) {
      Alert.alert('Nothing to reset', 'Check off some items first, then start a new trip.');
      return;
    }
    setShowCompleteTripModal(true);
  };

  const finalizeTrip = async (data: {
    storeName: string;
    totalSpent: number | undefined;
    itemPrices: { name: string; price: number }[];
  }) => {
    setShowCompleteTripModal(false);
    const checked = items.filter((i) => i.checked);
    const now = Date.now();
    const trip: Trip = {
      id: now.toString(),
      startedAt: Math.min(...items.map((i) => i.createdAt || now)),
      completedAt: now,
      itemNames: checked.map((i) => i.name),
      totalItemCount: items.length,
      storeName: data.storeName || undefined,
      totalSpent: data.totalSpent,
      itemPrices: data.itemPrices.length > 0 ? data.itemPrices : undefined,
    };
    await saveTrip(trip);

    // Record per-item prices to ledger if both store name + prices are provided
    if (data.storeName && data.itemPrices.length > 0) {
      const records: PriceRecord[] = data.itemPrices.map((p) => ({
        itemName: p.name,
        storeName: data.storeName,
        price: p.price,
        recordedAt: now,
      }));
      await appendPriceRecords(records);
    }

    const updated = items.map((i) => ({
      ...i,
      checked: false,
      boughtCount: i.checked ? (i.boughtCount ?? 0) + 1 : (i.boughtCount ?? 0),
      lastBoughtAt: i.checked ? now : i.lastBoughtAt,
    }));
    await persistItems(updated);
    setTrips(await getTripHistory());
    wasAllChecked.current = false;
  };

  const toggleViewMode = async () => {
    if (reorderMode) return;
    const next: ViewMode = viewMode === 'flat' ? 'aisle' : 'flat';
    setViewMode(next);
    await saveSettings({ listViewMode: next });
  };

  const handleShare = async () => {
    const unchecked = items.filter((i) => !i.checked);
    if (unchecked.length === 0) {
      Alert.alert('Nothing to share', 'Add some items to your list first.');
      return;
    }
    const text = buildShareableText(items);
    try {
      await Share.share({ message: text });
    } catch {
      // user cancelled or system error — no-op
    }
  };

  const handleSuggestionAdd = async (name: string) => {
    await addItem(name, '', false);
    setDismissedSuggestions(new Set([...dismissedSuggestions, name.toLowerCase()]));
  };

  const handleSuggestionDismiss = (name: string) => {
    setDismissedSuggestions(new Set([...dismissedSuggestions, name.toLowerCase()]));
  };

  const unchecked = items.filter((i) => !i.checked);
  const checked = items.filter((i) => i.checked);
  const urgent = unchecked.filter((i) => i.priority);
  const regularUnchecked = unchecked.filter((i) => !i.priority);
  const progress = items.length > 0 ? checked.length / items.length : 0;

  const allSuggestions: Suggestion[] = computeSuggestions(trips, items, 5);
  const suggestions = allSuggestions
    .filter((s) => !dismissedSuggestions.has(s.name.toLowerCase()))
    .slice(0, 3);

  type Section = { title: string; data: GroceryItemType[]; accent?: string; emoji?: string };
  let sections: Section[] = [];

  if (viewMode === 'flat') {
    sections = [
      ...(urgent.length > 0
        ? [{ title: 'Urgent', data: urgent, accent: Colors.urgent, emoji: '⚡' }]
        : []),
      ...(regularUnchecked.length > 0
        ? [{ title: 'Need to grab', data: regularUnchecked, accent: Colors.primary, emoji: '🛒' }]
        : []),
      ...(checked.length > 0
        ? [{ title: 'In the cart', data: checked, accent: Colors.textMuted, emoji: '✓' }]
        : []),
    ];
  } else {
    const grouped: Record<string, GroceryItemType[]> = {};
    for (const item of unchecked) {
      const cat = getItemCategory(item.name);
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(item);
    }
    for (const cat of CategoryOrder) {
      if (grouped[cat]?.length) {
        sections.push({
          title: CategoryColors[cat].label,
          data: grouped[cat],
          accent: CategoryColors[cat].color,
        });
      }
    }
    if (checked.length > 0) {
      sections.push({ title: 'In the cart', data: checked, accent: Colors.textMuted, emoji: '✓' });
    }
  }

  const heroMessage = items.length === 0
    ? 'Start building your master list'
    : reorderMode
    ? 'Reorder mode — tap arrows'
    : unchecked.length === 0
    ? 'All picked up — great trip!'
    : urgent.length > 0
    ? `${urgent.length} urgent · ${regularUnchecked.length} more`
    : `${unchecked.length} item${unchecked.length !== 1 ? 's' : ''} to grab`;

  return (
    <SafeAreaView style={styles.container}>
      {/* Hero card */}
      <View style={styles.heroCard}>
        <Constellation variant="dense" />
        <View style={styles.heroLeft}>
          <ProgressRing
            size={120}
            dotSize={8}
            dotCount={20}
            progress={progress}
            color={Colors.gradientGlow}
            trackColor="rgba(255,255,255,0.18)"
          >
            <Text style={styles.heroProgressNum}>{checked.length}</Text>
            <Text style={styles.heroProgressDenom}>of {items.length}</Text>
          </ProgressRing>
        </View>
        <View style={styles.heroRight}>
          <View style={styles.heroBrandRow}>
            <TouchableOpacity
              style={styles.listPicker}
              onPress={() => setShowListSwitcher(true)}
              activeOpacity={0.75}
              hitSlop={{ top: 6, bottom: 6, right: 6 }}
            >
              <Ionicons
                name={(activeList?.icon as any) || 'cart'}
                size={12}
                color={Colors.gradientGlow}
              />
              <Text style={styles.listPickerText} numberOfLines={1}>
                {activeList?.name || 'My List'}
              </Text>
              <Ionicons name="chevron-down" size={12} color={Colors.gradientGlow} />
              {listCount > 1 && (
                <View style={styles.listCountBadge}>
                  <Text style={styles.listCountBadgeText}>{listCount}</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.heroShareBtn}
              onPress={handleShare}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="share-outline" size={16} color={Colors.gradientGlow} />
            </TouchableOpacity>
          </View>
          <Text style={styles.heroTitle}>{heroMessage}</Text>
          {items.length > 0 && (
            <View style={styles.heroStatsRow}>
              <View style={styles.heroChip}>
                <Ionicons name="flash" size={12} color={Colors.gradientGlow} />
                <Text style={styles.heroChipText}>{Math.round(progress * 100)}%</Text>
              </View>
              {urgent.length > 0 && (
                <View style={[styles.heroChip, styles.heroChipUrgent]}>
                  <Ionicons name="star" size={11} color={Colors.urgentLight} />
                  <Text style={styles.heroChipText}>{urgent.length} urgent</Text>
                </View>
              )}
            </View>
          )}
        </View>
      </View>

      {/* Quick actions */}
      <View style={styles.actionRowHeader}>
        <Text style={styles.actionRowLabel}>QUICK ACTIONS</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.actionRowContent}
      >
        <TouchableOpacity
          style={styles.actionCard}
          onPress={toggleViewMode}
          disabled={reorderMode}
          activeOpacity={0.7}
        >
          <View style={styles.actionIconBox}>
            <Ionicons
              name={viewMode === 'flat' ? 'list-outline' : 'grid-outline'}
              size={20}
              color={Colors.primary}
            />
          </View>
          <View style={styles.actionTextBlock}>
            <Text style={styles.actionTitle}>
              {viewMode === 'flat' ? 'Flat list' : 'By aisle'}
            </Text>
            <Text style={styles.actionSubtitle}>
              {viewMode === 'flat' ? 'Tap to group by aisle' : 'Tap for plain list'}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionCard, reorderMode && styles.actionCardActive]}
          onPress={() => setReorderMode((r) => !r)}
          activeOpacity={0.7}
        >
          <View style={[styles.actionIconBox, reorderMode && styles.actionIconBoxActive]}>
            <Ionicons
              name={reorderMode ? 'checkmark' : 'swap-vertical-outline'}
              size={20}
              color={reorderMode ? Colors.primaryDark : Colors.primary}
            />
          </View>
          <View style={styles.actionTextBlock}>
            <Text style={[styles.actionTitle, reorderMode && styles.actionTitleActive]}>
              {reorderMode ? 'Done reordering' : 'Reorder'}
            </Text>
            <Text style={[styles.actionSubtitle, reorderMode && styles.actionSubtitleActive]}>
              {reorderMode ? 'Back to your list' : 'Move items up or down'}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionCard, styles.actionCardAI]}
          onPress={() => setShowAIModal(true)}
          activeOpacity={0.7}
        >
          <View style={[styles.actionIconBox, styles.actionIconBoxAI]}>
            <Ionicons name="sparkles" size={20} color={Colors.primaryDark} />
          </View>
          <View style={styles.actionTextBlock}>
            <Text style={[styles.actionTitle, { color: Colors.primaryDark }]}>AI assistant</Text>
            <Text style={styles.actionSubtitle}>"Add ingredients for tacos"</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionCard, styles.actionCardAccent]}
          onPress={() => setShowBarcodeModal(true)}
          activeOpacity={0.7}
        >
          <View style={[styles.actionIconBox, styles.actionIconBoxAccent]}>
            <Ionicons name="scan" size={20} color={Colors.accent} />
          </View>
          <View style={styles.actionTextBlock}>
            <Text style={[styles.actionTitle, { color: Colors.accentDark }]}>Scan barcode</Text>
            <Text style={styles.actionSubtitle}>Point camera at a product</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionCard, styles.actionCardAccent]}
          onPress={() => setShowTemplateModal(true)}
          activeOpacity={0.7}
        >
          <View style={[styles.actionIconBox, styles.actionIconBoxAccent]}>
            <Ionicons name="albums-outline" size={20} color={Colors.accent} />
          </View>
          <View style={styles.actionTextBlock}>
            <Text style={[styles.actionTitle, { color: Colors.accentDark }]}>Templates</Text>
            <Text style={styles.actionSubtitle}>Add common items at once</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionCard, styles.actionCardAccent]}
          onPress={() => setShowRecipeModal(true)}
          activeOpacity={0.7}
        >
          <View style={[styles.actionIconBox, styles.actionIconBoxAccent]}>
            <Ionicons name="restaurant-outline" size={20} color={Colors.accent} />
          </View>
          <View style={styles.actionTextBlock}>
            <Text style={[styles.actionTitle, { color: Colors.accentDark }]}>Paste recipe</Text>
            <Text style={styles.actionSubtitle}>Extract ingredients from text</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionCard, styles.actionCardAccent]}
          onPress={() => setShowImportModal(true)}
          activeOpacity={0.7}
        >
          <View style={[styles.actionIconBox, styles.actionIconBoxAccent]}>
            <Ionicons name="download-outline" size={20} color={Colors.accent} />
          </View>
          <View style={styles.actionTextBlock}>
            <Text style={[styles.actionTitle, { color: Colors.accentDark }]}>Import list</Text>
            <Text style={styles.actionSubtitle}>Paste a shared code</Text>
          </View>
        </TouchableOpacity>

        {checked.length > 0 && !reorderMode && (
          <TouchableOpacity style={styles.actionCardFinish} onPress={resetForNewTrip} activeOpacity={0.85}>
            <View style={styles.actionIconBoxFinish}>
              <Ionicons name="checkmark-done" size={20} color={Colors.gradientGlow} />
            </View>
            <View style={styles.actionTextBlock}>
              <Text style={styles.actionTitleFinish}>Finish trip</Text>
              <Text style={styles.actionSubtitleFinish}>Save & start fresh</Text>
            </View>
          </TouchableOpacity>
        )}
      </ScrollView>

      {!reorderMode && (
        <SuggestionStrip
          suggestions={suggestions}
          onAdd={handleSuggestionAdd}
          onDismiss={handleSuggestionDismiss}
        />
      )}

      {items.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🛒</Text>
          <Text style={styles.emptyTitle}>Your list is empty</Text>
          <Text style={styles.emptyText}>
            Build your master shopping list once.{'\n'}
            ShopMind remembers it forever and alerts you{'\n'}
            when you're near a store that has what you need.
          </Text>
          <View style={styles.emptyButtons}>
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => setShowAddModal(true)}
            >
              <Ionicons name="add" size={18} color={Colors.textWhite} />
              <Text style={styles.emptyBtnText}>Add an item</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.emptyBtnOutline}
              onPress={() => setShowTemplateModal(true)}
            >
              <Ionicons name="albums-outline" size={18} color={Colors.primary} />
              <Text style={styles.emptyBtnOutlineText}>Use a template</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : reorderMode ? (
        // Flat scrollable view with up/down arrows
        <ScrollView style={{ marginTop: 14 }} contentContainerStyle={{ paddingBottom: 110 }}>
          <Text style={styles.reorderHint}>
            Tap the arrows to move items. Tap "Done" when finished.
          </Text>
          {items.map((item, idx) => {
            const catKey = getCategoryKey(item.name);
            const cat = CategoryColors[catKey] || CategoryColors.pantry;
            return (
              <View key={item.id} style={styles.reorderRow}>
                <View style={[styles.reorderStripe, { backgroundColor: cat.color }]} />
                <View style={[styles.reorderIconCircle, { backgroundColor: cat.tint }]}>
                  <Text style={styles.reorderEmoji}>{getItemEmoji(item.name)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.reorderName} numberOfLines={1}>{item.name}</Text>
                  <Text style={[styles.reorderCat, { color: cat.color }]}>{cat.label}</Text>
                </View>
                <View style={styles.reorderArrows}>
                  <TouchableOpacity
                    style={[styles.arrowBtn, idx === 0 && styles.arrowBtnDisabled]}
                    onPress={() => moveItem(item.id, 'up')}
                    disabled={idx === 0}
                  >
                    <Ionicons name="chevron-up" size={20} color={idx === 0 ? Colors.textMuted : Colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.arrowBtn, idx === items.length - 1 && styles.arrowBtnDisabled]}
                    onPress={() => moveItem(item.id, 'down')}
                    disabled={idx === items.length - 1}
                  >
                    <Ionicons name="chevron-down" size={20} color={idx === items.length - 1 ? Colors.textMuted : Colors.primary} />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </ScrollView>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <GroceryItemComponent
              item={item}
              onToggle={toggleItem}
              onDelete={deleteItem}
              onTogglePriority={togglePriority}
              onEdit={setEditingItem}
            />
          )}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <View
                style={[
                  styles.sectionDot,
                  { backgroundColor: (section as Section).accent || Colors.primary },
                ]}
              />
              <Text
                style={[
                  styles.sectionHeaderText,
                  { color: (section as Section).accent || Colors.primary },
                ]}
              >
                {(section as Section).emoji ? `${(section as Section).emoji}  ` : ''}
                {section.title}  ({section.data.length})
              </Text>
            </View>
          )}
          style={{ paddingTop: 1 }}
          contentContainerStyle={{ paddingBottom: 110 }}
          stickySectionHeadersEnabled={false}
        />
      )}

      {!reorderMode && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setShowAddModal(true)}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={32} color={Colors.textWhite} />
        </TouchableOpacity>
      )}

      <AddItemModal
        visible={showAddModal || !!editingItem}
        editingItem={editingItem}
        onAdd={addItem}
        onSaveEdit={saveEdit}
        onClose={() => {
          setShowAddModal(false);
          setEditingItem(null);
        }}
      />
      <TemplateModal
        visible={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        onApply={applyTemplateOrRecipe}
      />
      <RecipePasteModal
        visible={showRecipeModal}
        onClose={() => setShowRecipeModal(false)}
        onApply={applyTemplateOrRecipe}
      />
      <ImportListModal
        visible={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={applyTemplateOrRecipe}
      />
      <CompleteTripModal
        visible={showCompleteTripModal}
        checkedItems={items.filter((i) => i.checked)}
        onClose={() => setShowCompleteTripModal(false)}
        onConfirm={finalizeTrip}
      />
      <CelebrationOverlay
        visible={showCelebration}
        itemCount={items.length}
        onDismiss={() => setShowCelebration(false)}
      />
      <ListSwitcherModal
        visible={showListSwitcher}
        activeListId={activeList?.id || 'default'}
        onSelect={handleListSelected}
        onClose={() => setShowListSwitcher(false)}
        onUpgrade={() => {
          setShowListSwitcher(false);
          openPaywall();
        }}
      />
      <AIAssistantModal
        visible={showAIModal}
        onClose={() => setShowAIModal(false)}
        onApply={applyTemplateOrRecipe}
        onConfigureKey={() => {
          setShowAIModal(false);
          navigation.navigate('Settings');
        }}
      />
      <BarcodeScannerModal
        visible={showBarcodeModal}
        onClose={() => setShowBarcodeModal(false)}
        onAdd={(name, quantity) => addItem(name, quantity, false)}
      />
    </SafeAreaView>
  );
}

const makeStyles = (Colors: Theme['Colors'], Shadow: Theme['Shadow']) => StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 4,
    paddingVertical: 18,
    paddingHorizontal: 18,
    borderRadius: 28,
    backgroundColor: Colors.primaryDark,
    overflow: 'hidden',
    ...Shadow.cardElevated,
  },
  heroLeft: {
    marginRight: 18,
  },
  heroRight: { flex: 1 },
  heroBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  heroBrand: {
    fontSize: 10,
    fontWeight: '900',
    color: Colors.gradientGlow,
    letterSpacing: 3,
  },
  listPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(252,211,77,0.16)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    maxWidth: 170,
  },
  listPickerText: {
    fontSize: 11,
    fontWeight: '900',
    color: Colors.gradientGlow,
    letterSpacing: 0.4,
    flexShrink: 1,
  },
  listCountBadge: {
    backgroundColor: Colors.gradientGlow,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
    marginLeft: 2,
  },
  listCountBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: Colors.primaryDark,
  },
  heroShareBtn: {
    padding: 4,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: Colors.textWhite,
    letterSpacing: -0.4,
    lineHeight: 26,
  },
  heroProgressNum: {
    fontSize: 30,
    fontWeight: '900',
    color: Colors.textWhite,
    letterSpacing: -1,
  },
  heroProgressDenom: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.gradientGlow,
    letterSpacing: 0.5,
    marginTop: -2,
  },
  heroStatsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  heroChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
  },
  heroChipUrgent: {
    backgroundColor: 'rgba(251,113,133,0.32)',
  },
  heroChipText: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.textWhite,
    letterSpacing: 0.2,
  },

  actionRowHeader: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 4,
  },
  actionRowLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: Colors.textSecondary,
    letterSpacing: 1.4,
  },
  actionRowContent: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 12,
    gap: 8,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.cardBg,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Colors.border,
    minWidth: 190,
    minHeight: 45,
    ...Shadow.card,
  },
  actionCardActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  actionCardAccent: {
    borderColor: Colors.accent,
    backgroundColor: Colors.accentLight,
  },
  actionCardAI: {
    borderColor: Colors.gradientGlow,
    backgroundColor: 'rgba(252,211,77,0.18)',
  },
  actionIconBoxAI: {
    backgroundColor: Colors.gradientGlow,
  },
  actionCardFinish: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
    minWidth: 180,
    minHeight: 58,
    backgroundColor: Colors.primaryDark,
    ...Shadow.cardElevated,
  },
  actionIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionIconBoxActive: {
    backgroundColor: Colors.gradientGlow,
  },
  actionIconBoxAccent: {
    backgroundColor: Colors.cardBg,
  },
  actionIconBoxFinish: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(252,211,77,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionTextBlock: {
    flexShrink: 1,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: Colors.textPrimary,
    letterSpacing: 0.1,
  },
  actionTitleActive: {
    color: Colors.textWhite,
  },
  actionTitleFinish: {
    fontSize: 14,
    fontWeight: '900',
    color: Colors.gradientGlow,
    letterSpacing: 0.2,
  },
  actionSubtitle: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginTop: 1,
  },
  actionSubtitleActive: {
    color: Colors.gradientGlow,
  },
  actionSubtitleFinish: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textInverse,
    opacity: 0.85,
    marginTop: 1,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 6,
  },
  sectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  sectionHeaderText: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.1,
  },

  // Reorder mode
  reorderHint: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 12,
    paddingHorizontal: 30,
  },
  reorderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardBg,
    marginHorizontal: 16,
    marginVertical: 3,
    borderRadius: 14,
    paddingRight: 8,
    paddingLeft: 0,
    paddingVertical: 8,
    overflow: 'hidden',
    ...Shadow.card,
  },
  reorderStripe: {
    width: 4,
    alignSelf: 'stretch',
    marginRight: 10,
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
  },
  reorderIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  reorderEmoji: { fontSize: 18 },
  reorderName: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  reorderCat: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 1 },
  reorderArrows: { flexDirection: 'row', gap: 4 },
  arrowBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowBtnDisabled: { opacity: 0.3 },

  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: { fontSize: 72, marginBottom: 16 },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 28,
  },
  emptyButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 14,
  },
  emptyBtnText: { color: Colors.textWhite, fontSize: 15, fontWeight: '700' },
  emptyBtnOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  emptyBtnOutlineText: { color: Colors.primary, fontSize: 15, fontWeight: '700' },

  fab: {
    position: 'absolute',
    right: 22,
    bottom: 32,
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: Colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadow.fab,
  },
});
