import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useTheme, Theme } from '../theme';
import { getGroceryList, getTripHistory } from '../services/storageService';
import { GroceryItem, Trip } from '../types';
import { computeWeeklyStreak } from '../utils/streak';
import { computeSpendingSummary, formatCurrency } from '../utils/priceInsights';
import { getItemEmoji } from '../utils/itemIcons';
import { detectRunningLow, formatOverdue, RunningLowItem } from '../utils/runningLow';
import { saveGroceryList } from '../services/storageService';
import { useSubscription } from '../contexts/SubscriptionContext';
import Constellation from '../components/Constellation';

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function getDateString(): string {
  return new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

export default function HomeScreen() {
  const { Colors, Shadow } = useTheme();
  const styles = useMemo(() => makeStyles(Colors, Shadow), [Colors, Shadow]);
  const { isPremium, openPaywall } = useSubscription();
  const navigation = useNavigation<any>();
  const [items, setItems] = useState<GroceryItem[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [dismissedLow, setDismissedLow] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    const [list, history] = await Promise.all([getGroceryList(), getTripHistory()]);
    setItems(list);
    setTrips(history);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const unchecked = items.filter((i) => !i.checked);
  const checked = items.filter((i) => i.checked);
  const urgent = unchecked.filter((i) => i.priority);
  const streak = computeWeeklyStreak(trips);
  const spending = computeSpendingSummary(trips);
  const progress = items.length > 0 ? (checked.length / items.length) * 100 : 0;
  const recentTrips = trips.slice(0, 3);

  const runningLow = useMemo(
    () => detectRunningLow(trips, items, 5).filter((r) => !dismissedLow.has(r.name.toLowerCase())),
    [trips, items, dismissedLow]
  );

  const handleAddRunningLow = async (low: RunningLowItem) => {
    // Add to current active list at the top, marked as priority
    const exists = items.some((i) => i.name.toLowerCase() === low.name.toLowerCase());
    if (exists) {
      setDismissedLow(new Set([...dismissedLow, low.name.toLowerCase()]));
      return;
    }
    const newItem: GroceryItem = {
      id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
      name: low.name,
      quantity: '',
      checked: false,
      createdAt: Date.now(),
      priority: false,
      boughtCount: 0,
    };
    const updated = [newItem, ...items];
    setItems(updated);
    await saveGroceryList(updated);
    setDismissedLow(new Set([...dismissedLow, low.name.toLowerCase()]));
  };

  const handleDismissRunningLow = (low: RunningLowItem) => {
    setDismissedLow(new Set([...dismissedLow, low.name.toLowerCase()]));
  };

  const heroEyebrow =
    unchecked.length > 0
      ? urgent.length > 0
        ? `${urgent.length} URGENT · ${unchecked.length} TOTAL`
        : 'CURRENT LIST'
      : items.length > 0
      ? 'ALL PICKED UP'
      : 'WELCOME';
  const heroTitle =
    unchecked.length > 0
      ? `${unchecked.length} item${unchecked.length !== 1 ? 's' : ''} to grab`
      : items.length > 0
      ? "You're all set!"
      : 'Start your first list';
  const heroCtaLabel =
    unchecked.length > 0
      ? 'Continue shopping'
      : items.length > 0
      ? 'Start a new trip'
      : 'Build your list';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Greeting row */}
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.brandLabel}>SHOPMIND</Text>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.dateText}>{getDateString()}</Text>
          </View>
          <View style={styles.brandIconCircle}>
            <Ionicons name="cart" size={22} color={Colors.gradientGlow} />
          </View>
        </View>

        {/* Status hero card */}
        <View style={styles.hero}>
          <Constellation variant="dense" />
          <Text style={styles.heroEyebrow}>{heroEyebrow}</Text>
          <Text style={styles.heroTitle}>{heroTitle}</Text>

          {items.length > 0 && (
            <>
              <View style={styles.heroProgressTrack}>
                <View style={[styles.heroProgressFill, { width: `${progress}%` }]} />
              </View>
              <Text style={styles.heroProgressLabel}>
                {checked.length} of {items.length} done · {Math.round(progress)}%
              </Text>
            </>
          )}

          <TouchableOpacity
            style={styles.heroCta}
            onPress={() => navigation.navigate('List')}
            activeOpacity={0.85}
          >
            <Text style={styles.heroCtaText}>{heroCtaLabel}</Text>
            <Ionicons name="arrow-forward" size={18} color={Colors.primaryDark} />
          </TouchableOpacity>
        </View>

        {/* Stats row */}
        {(trips.length > 0 || streak > 0) && (
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: Colors.primaryLight }]}>
                <Ionicons name="checkmark-done" size={18} color={Colors.primary} />
              </View>
              <Text style={styles.statNum}>{trips.length}</Text>
              <Text style={styles.statLabel}>Trips</Text>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: Colors.accentLight }]}>
                <Ionicons name="flame" size={18} color={Colors.accent} />
              </View>
              <Text style={styles.statNum}>{streak}</Text>
              <Text style={styles.statLabel}>{streak === 1 ? 'Week streak' : 'Week streak'}</Text>
            </View>
            {spending.trips > 0 ? (
              <View style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: Colors.warningLight }]}>
                  <Ionicons name="wallet" size={18} color={Colors.warning} />
                </View>
                <Text style={styles.statNum}>{formatCurrency(spending.total)}</Text>
                <Text style={styles.statLabel}>Tracked</Text>
              </View>
            ) : (
              <View style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: Colors.primaryLight }]}>
                  <Ionicons name="basket" size={18} color={Colors.primary} />
                </View>
                <Text style={styles.statNum}>
                  {trips.reduce((acc, t) => acc + t.itemNames.length, 0)}
                </Text>
                <Text style={styles.statLabel}>Items</Text>
              </View>
            )}
          </View>
        )}

        {/* Quick actions */}
        <Text style={styles.sectionLabel}>QUICK START</Text>
        <View style={styles.quickGrid}>
          <TouchableOpacity
            style={styles.quickBtn}
            onPress={() => navigation.navigate('List')}
            activeOpacity={0.8}
          >
            <View style={[styles.quickIcon, { backgroundColor: Colors.primaryLight }]}>
              <Ionicons name="add-circle" size={26} color={Colors.primary} />
            </View>
            <Text style={styles.quickLabel}>Add items</Text>
            <Text style={styles.quickSubLabel}>Build your list</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickBtn}
            onPress={() => navigation.navigate('Map')}
            activeOpacity={0.8}
          >
            <View style={[styles.quickIcon, { backgroundColor: Colors.accentLight }]}>
              <Ionicons name="location" size={26} color={Colors.accent} />
            </View>
            <Text style={styles.quickLabel}>Find stores</Text>
            <Text style={styles.quickSubLabel}>Best stops nearby</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickBtn}
            onPress={() => navigation.navigate('History')}
            activeOpacity={0.8}
          >
            <View style={[styles.quickIcon, { backgroundColor: Colors.primaryLight }]}>
              <Ionicons name="bar-chart" size={26} color={Colors.primary} />
            </View>
            <Text style={styles.quickLabel}>My stats</Text>
            <Text style={styles.quickSubLabel}>Trips & savings</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickBtn}
            onPress={() => navigation.navigate('Settings')}
            activeOpacity={0.8}
          >
            <View style={[styles.quickIcon, { backgroundColor: Colors.accentLight }]}>
              <Ionicons name="options" size={26} color={Colors.accent} />
            </View>
            <Text style={styles.quickLabel}>Settings</Text>
            <Text style={styles.quickSubLabel}>Tracking & theme</Text>
          </TouchableOpacity>
        </View>

        {/* Running low — items the user typically buys but hasn't recently */}
        {runningLow.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>YOU MIGHT BE RUNNING LOW</Text>
            <View style={styles.lowList}>
              {runningLow.map((low) => (
                <View key={low.name} style={styles.lowRow}>
                  <Text style={styles.lowEmoji}>{getItemEmoji(low.name)}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.lowName}>{low.name}</Text>
                    <Text style={styles.lowMeta}>
                      Usually every {Math.round(low.avgIntervalDays)} days · {formatOverdue(low.overdueBy)}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.lowDismissBtn}
                    onPress={() => handleDismissRunningLow(low)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="close" size={16} color={Colors.textMuted} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.lowAddBtn}
                    onPress={() => handleAddRunningLow(low)}
                  >
                    <Ionicons name="add" size={16} color={Colors.textWhite} />
                    <Text style={styles.lowAddBtnText}>Add</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Recent activity */}
        {recentTrips.length > 0 && (
          <>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionLabel}>RECENT ACTIVITY</Text>
              <TouchableOpacity onPress={() => navigation.navigate('History')}>
                <Text style={styles.seeAll}>See all →</Text>
              </TouchableOpacity>
            </View>
            {recentTrips.map((trip) => (
              <TouchableOpacity
                key={trip.id}
                style={styles.activityRow}
                onPress={() => navigation.navigate('History')}
                activeOpacity={0.8}
              >
                <View style={styles.activityIconBox}>
                  <Ionicons name="checkmark" size={18} color={Colors.gradientGlow} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.activityTitle}>
                    {trip.itemNames.length} item{trip.itemNames.length !== 1 ? 's' : ''} bought
                  </Text>
                  <Text style={styles.activityMeta} numberOfLines={1}>
                    {new Date(trip.completedAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                    })}
                    {trip.storeName ? `  ·  ${trip.storeName}` : ''}
                  </Text>
                </View>
                {typeof trip.totalSpent === 'number' && (
                  <View style={styles.activityPricePill}>
                    <Text style={styles.activityPriceText}>{formatCurrency(trip.totalSpent)}</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </>
        )}

        {/* Empty state hint */}
        {items.length === 0 && trips.length === 0 && (
          <View style={styles.emptyHint}>
            <Ionicons name="sparkles" size={18} color={Colors.gradientGlow} />
            <Text style={styles.emptyHintText}>
              Tap <Text style={styles.emptyHintBold}>{heroCtaLabel}</Text> above to get going.
              Templates and Paste-Recipe can fill your list in seconds.
            </Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (Colors: Theme['Colors'], Shadow: Theme['Shadow']) => StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 30 },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    marginBottom: 18,
  },
  brandLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: Colors.accent,
    letterSpacing: 3,
    marginBottom: 2,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '900',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  dateText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
    marginTop: 2,
  },
  brandIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: Colors.primaryDark,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadow.card,
  },

  hero: {
    backgroundColor: Colors.primaryDark,
    borderRadius: 26,
    padding: 22,
    overflow: 'hidden',
    marginBottom: 18,
    ...Shadow.cardElevated,
  },
  heroEyebrow: {
    fontSize: 11,
    fontWeight: '900',
    color: Colors.gradientGlow,
    letterSpacing: 1.6,
    marginBottom: 6,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: Colors.textWhite,
    letterSpacing: -0.5,
    marginBottom: 16,
  },
  heroProgressTrack: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.18)',
    overflow: 'hidden',
    marginBottom: 6,
  },
  heroProgressFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: Colors.gradientGlow,
  },
  heroProgressLabel: {
    fontSize: 12,
    color: Colors.gradientGlow,
    fontWeight: '700',
    letterSpacing: 0.3,
    marginBottom: 16,
  },
  heroCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.gradientGlow,
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
  },
  heroCtaText: {
    fontSize: 15,
    fontWeight: '900',
    color: Colors.primaryDark,
    letterSpacing: 0.4,
  },

  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 22,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.cardBg,
    borderRadius: 18,
    padding: 14,
    alignItems: 'flex-start',
    ...Shadow.card,
  },
  statIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statNum: {
    fontSize: 20,
    fontWeight: '900',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '700',
    letterSpacing: 0.3,
    marginTop: 1,
  },

  sectionLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: Colors.textSecondary,
    letterSpacing: 1.4,
    marginBottom: 10,
    marginTop: 4,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: 18,
    marginBottom: 4,
  },
  seeAll: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '800',
    letterSpacing: 0.2,
  },

  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 6,
  },
  quickBtn: {
    width: '48%',
    backgroundColor: Colors.cardBg,
    borderRadius: 18,
    padding: 14,
    ...Shadow.card,
  },
  quickIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  quickLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  quickSubLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '600',
    marginTop: 1,
  },

  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardBg,
    borderRadius: 16,
    padding: 12,
    marginTop: 8,
    gap: 12,
    ...Shadow.card,
  },
  activityIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primaryDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  activityMeta: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '600',
    marginTop: 2,
  },
  activityPricePill: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  activityPriceText: {
    fontSize: 12,
    fontWeight: '900',
    color: Colors.primary,
  },

  // Running-low list
  lowList: {
    gap: 8,
    marginBottom: 6,
  },
  lowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.cardBg,
    borderRadius: 14,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: Colors.warning,
    ...Shadow.card,
  },
  lowEmoji: { fontSize: 24 },
  lowName: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  lowMeta: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '600',
    marginTop: 1,
  },
  lowDismissBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lowAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  lowAddBtnText: {
    fontSize: 12,
    fontWeight: '900',
    color: Colors.textWhite,
  },

  // Premium upsell
  upsellCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.primaryDark,
    borderRadius: 18,
    padding: 14,
    marginTop: 18,
    overflow: 'hidden',
    ...Shadow.cardElevated,
  },
  upsellIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.gradientGlow,
    justifyContent: 'center',
    alignItems: 'center',
  },
  upsellTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: Colors.textWhite,
    letterSpacing: 0.2,
  },
  upsellBody: {
    fontSize: 11,
    color: Colors.gradientGlow,
    fontWeight: '600',
    marginTop: 2,
    lineHeight: 15,
  },

  emptyHint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: Colors.cardBg,
    borderRadius: 14,
    padding: 14,
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: Colors.accent,
  },
  emptyHintText: {
    flex: 1,
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
    lineHeight: 18,
  },
  emptyHintBold: {
    color: Colors.accent,
    fontWeight: '900',
  },
});
