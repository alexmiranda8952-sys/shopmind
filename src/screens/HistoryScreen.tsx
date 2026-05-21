import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Trip, PriceRecord } from '../types';
import { getTripHistory, clearTripHistory, getPriceLedger } from '../services/storageService';
import { useTheme, Theme } from '../theme';
import { getItemEmoji } from '../utils/itemIcons';
import { computeWeeklyStreak } from '../utils/streak';
import { computeCheapestStores, computeSpendingSummary, formatCurrency } from '../utils/priceInsights';
import Constellation from '../components/Constellation';

const DAY = 24 * 60 * 60 * 1000;

function formatRelative(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < DAY) return 'Today';
  if (diff < 2 * DAY) return 'Yesterday';
  if (diff < 7 * DAY) return `${Math.floor(diff / DAY)} days ago`;
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDuration(ms: number): string {
  if (ms < 60 * 1000) return 'just now';
  const minutes = Math.floor(ms / (60 * 1000));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export default function HistoryScreen() {
  const { Colors, Shadow } = useTheme();
  const styles = useMemo(() => makeStyles(Colors, Shadow), [Colors, Shadow]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [ledger, setLedger] = useState<PriceRecord[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [t, l] = await Promise.all([getTripHistory(), getPriceLedger()]);
    setTrips(t);
    setLedger(l);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const stats = useMemo(() => {
    const now = Date.now();
    const last30Days = trips.filter((t) => now - t.completedAt < 30 * DAY);
    const last7Days = trips.filter((t) => now - t.completedAt < 7 * DAY);
    const totalItemsAllTime = trips.reduce((acc, t) => acc + t.itemNames.length, 0);

    // Top items across history
    const counts: Record<string, number> = {};
    trips.forEach((t) => t.itemNames.forEach((n) => {
      const k = n.toLowerCase();
      counts[k] = (counts[k] || 0) + 1;
    }));
    const top = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, count]) => ({ name, count }));

    return {
      totalTrips: trips.length,
      tripsLast7Days: last7Days.length,
      tripsLast30Days: last30Days.length,
      totalItems: totalItemsAllTime,
      topItems: top,
      streak: computeWeeklyStreak(trips),
      spending: computeSpendingSummary(trips),
      cheapestStores: computeCheapestStores(ledger, 2, 3),
    };
  }, [trips, ledger]);

  const handleClear = () => {
    Alert.alert(
      'Clear all trip history?',
      'This permanently deletes every saved trip. Your current list is not affected.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await clearTripHistory();
            setTrips([]);
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Trips</Text>
            <Text style={styles.subtitle}>
              {trips.length === 0
                ? 'Your shopping history will appear here'
                : `${trips.length} trip${trips.length !== 1 ? 's' : ''} logged`}
            </Text>
          </View>
          {trips.length > 0 && (
            <TouchableOpacity style={styles.clearBtn} onPress={handleClear}>
              <Ionicons name="trash-outline" size={18} color={Colors.danger} />
            </TouchableOpacity>
          )}
        </View>

        {/* Hero stats grid */}
        {trips.length > 0 && (
          <>
            {/* Streak hero card */}
            {stats.streak > 0 && (
              <View style={styles.streakCard}>
                <Constellation variant="sparse" />
                <View style={styles.streakIconBox}>
                  <Ionicons name="flame" size={28} color={Colors.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.streakLabel}>WEEKLY STREAK</Text>
                  <Text style={styles.streakNum}>
                    {stats.streak}
                    <Text style={styles.streakUnit}>  week{stats.streak !== 1 ? 's' : ''}</Text>
                  </Text>
                  <Text style={styles.streakHint}>
                    {stats.streak >= 4 ? 'You\'re on fire — keep it going!' : 'Shop again this week to extend your streak'}
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.statsGrid}>
              <View style={[styles.statCard, styles.statCardPrimary]}>
                <Ionicons name="checkmark-done-outline" size={20} color={Colors.gradientGlow} />
                <Text style={styles.statNumberWhite}>{stats.totalTrips}</Text>
                <Text style={styles.statLabelWhite}>Total trips</Text>
              </View>
              <View style={styles.statCard}>
                <Ionicons name="calendar-outline" size={20} color={Colors.accent} />
                <Text style={styles.statNumber}>{stats.tripsLast7Days}</Text>
                <Text style={styles.statLabel}>This week</Text>
              </View>
              <View style={styles.statCard}>
                <Ionicons name="cart-outline" size={20} color={Colors.primary} />
                <Text style={styles.statNumber}>{stats.totalItems}</Text>
                <Text style={styles.statLabel}>Items bought</Text>
              </View>
            </View>

            {/* Spending summary */}
            {stats.spending.trips > 0 && (
              <View style={styles.spendingCard}>
                <Constellation variant="sparse" />
                <View style={styles.spendingHeader}>
                  <Ionicons name="wallet" size={18} color={Colors.gradientGlow} />
                  <Text style={styles.spendingTitle}>SPENDING</Text>
                </View>
                <View style={styles.spendingRow}>
                  <View style={styles.spendingStat}>
                    <Text style={styles.spendingNum}>{formatCurrency(stats.spending.total)}</Text>
                    <Text style={styles.spendingNumLabel}>Total tracked</Text>
                  </View>
                  <View style={styles.spendingDivider} />
                  <View style={styles.spendingStat}>
                    <Text style={styles.spendingNum}>{formatCurrency(stats.spending.avgPerTrip)}</Text>
                    <Text style={styles.spendingNumLabel}>Avg per trip</Text>
                  </View>
                </View>
                {stats.spending.topStore && (
                  <Text style={styles.spendingTopStore}>
                    Most-visited: <Text style={styles.spendingTopStoreName}>{stats.spending.topStore.name}</Text>
                  </Text>
                )}
              </View>
            )}

            {/* Cheapest store insights */}
            {stats.cheapestStores.length > 0 && (
              <View style={styles.cheapestCard}>
                <View style={styles.cheapestHeader}>
                  <Ionicons name="trending-down" size={16} color={Colors.accent} />
                  <Text style={styles.cardHeader}>Where to save</Text>
                </View>
                {stats.cheapestStores.map((ins) => (
                  <View key={ins.itemName} style={styles.cheapestRow}>
                    <Text style={styles.cheapestEmoji}>{getItemEmoji(ins.itemName)}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cheapestName}>{ins.itemName}</Text>
                      <Text style={styles.cheapestDetail}>
                        Cheapest at <Text style={styles.cheapestStoreName}>{ins.cheapestStore}</Text> ({formatCurrency(ins.cheapestPrice)})
                      </Text>
                    </View>
                    <View style={styles.cheapestSavings}>
                      <Text style={styles.cheapestSavingsNum}>{formatCurrency(ins.savings)}</Text>
                      <Text style={styles.cheapestSavingsLabel}>save</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Top items */}
            {stats.topItems.length > 0 && (
              <View style={styles.topItemsCard}>
                <Text style={styles.cardHeader}>★  Most frequent</Text>
                {stats.topItems.map((it) => (
                  <View key={it.name} style={styles.topItemRow}>
                    <Text style={styles.topItemEmoji}>{getItemEmoji(it.name)}</Text>
                    <Text style={styles.topItemName}>
                      {it.name.charAt(0).toUpperCase() + it.name.slice(1)}
                    </Text>
                    <View style={styles.topItemBadge}>
                      <Text style={styles.topItemCount}>{it.count}×</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </>
        )}

        {/* Trip list */}
        {trips.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🗓️</Text>
            <Text style={styles.emptyTitle}>No trips yet</Text>
            <Text style={styles.emptyText}>
              Every time you tap "New Trip" on your list,{'\n'}
              a snapshot is saved here so you can{'\n'}
              look back at what you've bought.
            </Text>
          </View>
        ) : (
          <>
            <Text style={styles.listHeader}>Recent trips</Text>
            {trips.map((trip) => {
              const isOpen = expanded === trip.id;
              const duration = trip.completedAt - trip.startedAt;
              return (
                <TouchableOpacity
                  key={trip.id}
                  style={styles.tripCard}
                  activeOpacity={0.85}
                  onPress={() => setExpanded(isOpen ? null : trip.id)}
                >
                  <View style={styles.tripHeader}>
                    <View style={styles.tripDateBox}>
                      <Text style={styles.tripDateNum}>
                        {new Date(trip.completedAt).getDate()}
                      </Text>
                      <Text style={styles.tripDateMonth}>
                        {new Date(trip.completedAt).toLocaleString(undefined, { month: 'short' }).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.tripTitle}>
                        {trip.itemNames.length} item{trip.itemNames.length !== 1 ? 's' : ''}
                        <Text style={styles.tripSubMute}>
                          {' '}of {trip.totalItemCount}
                        </Text>
                      </Text>
                      <Text style={styles.tripMeta}>
                        {formatRelative(trip.completedAt)}
                        {trip.storeName ? `  ·  ${trip.storeName}` : ''}
                        {duration > 0 ? `  ·  ${formatDuration(duration)} active` : ''}
                      </Text>
                    </View>
                    {typeof trip.totalSpent === 'number' && (
                      <View style={styles.tripPricePill}>
                        <Text style={styles.tripPriceText}>{formatCurrency(trip.totalSpent)}</Text>
                      </View>
                    )}
                    <Ionicons
                      name={isOpen ? 'chevron-up' : 'chevron-down'}
                      size={20}
                      color={Colors.textMuted}
                    />
                  </View>
                  {isOpen && (
                    <View style={styles.tripExpand}>
                      <View style={styles.tripDivider} />
                      <View style={styles.tripItemList}>
                        {trip.itemNames.map((n, idx) => (
                          <View key={`${trip.id}-${idx}`} style={styles.tripItemPill}>
                            <Text style={styles.tripItemEmoji}>{getItemEmoji(n)}</Text>
                            <Text style={styles.tripItemText}>{n}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (Colors: Theme['Colors'], Shadow: Theme['Shadow']) => StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: 20, paddingBottom: 80 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: Colors.primaryDark,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 3,
    fontWeight: '500',
  },
  clearBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.dangerLight,
    justifyContent: 'center',
    alignItems: 'center',
  },

  streakCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryDark,
    borderRadius: 22,
    padding: 18,
    marginBottom: 14,
    overflow: 'hidden',
    ...Shadow.cardElevated,
  },
  streakIconBox: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(251,146,60,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(251,146,60,0.4)',
  },
  streakLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: Colors.gradientGlow,
    letterSpacing: 2,
    marginBottom: 2,
  },
  streakNum: {
    fontSize: 32,
    fontWeight: '900',
    color: Colors.textWhite,
    letterSpacing: -1,
  },
  streakUnit: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.gradientGlow,
    letterSpacing: 0,
  },
  streakHint: {
    fontSize: 12,
    color: Colors.textInverse,
    opacity: 0.7,
    marginTop: 2,
    fontWeight: '500',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.cardBg,
    borderRadius: 18,
    padding: 14,
    ...Shadow.card,
  },
  statCardPrimary: {
    backgroundColor: Colors.primaryDark,
    overflow: 'hidden',
  },
  statNumber: {
    fontSize: 26,
    fontWeight: '900',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
    marginTop: 6,
  },
  statNumberWhite: {
    fontSize: 26,
    fontWeight: '900',
    color: Colors.textWhite,
    letterSpacing: -0.5,
    marginTop: 6,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  statLabelWhite: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.gradientGlow,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
  },

  // Spending card
  spendingCard: {
    backgroundColor: Colors.primaryDark,
    borderRadius: 22,
    padding: 18,
    marginBottom: 14,
    overflow: 'hidden',
    ...Shadow.cardElevated,
  },
  spendingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  spendingTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: Colors.gradientGlow,
    letterSpacing: 1.6,
  },
  spendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  spendingStat: { flex: 1, alignItems: 'center' },
  spendingNum: {
    fontSize: 22,
    fontWeight: '900',
    color: Colors.textWhite,
    letterSpacing: -0.5,
  },
  spendingNumLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.gradientGlow,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  spendingDivider: {
    width: 1,
    height: 36,
    backgroundColor: 'rgba(252,211,77,0.25)',
    marginHorizontal: 8,
  },
  spendingTopStore: {
    fontSize: 12,
    color: Colors.textInverse,
    opacity: 0.85,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 12,
  },
  spendingTopStoreName: {
    fontWeight: '800',
    color: Colors.gradientGlow,
    opacity: 1,
  },

  // Cheapest store card
  cheapestCard: {
    backgroundColor: Colors.cardBg,
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderLeftWidth: 3,
    borderLeftColor: Colors.accent,
    ...Shadow.card,
  },
  cheapestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  cheapestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  cheapestEmoji: { fontSize: 24 },
  cheapestName: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  cheapestDetail: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  cheapestStoreName: {
    fontWeight: '800',
    color: Colors.primary,
  },
  cheapestSavings: {
    alignItems: 'center',
    backgroundColor: Colors.accentLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    minWidth: 52,
  },
  cheapestSavingsNum: {
    fontSize: 13,
    fontWeight: '900',
    color: Colors.accent,
  },
  cheapestSavingsLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.accent,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginTop: -1,
  },

  topItemsCard: {
    backgroundColor: Colors.cardBg,
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    ...Shadow.card,
  },
  cardHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 1.1,
    marginBottom: 10,
  },
  topItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  topItemEmoji: { fontSize: 22, marginRight: 12 },
  topItemName: { flex: 1, fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  topItemBadge: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  topItemCount: { fontSize: 12, fontWeight: '800', color: Colors.primary },

  listHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 1.1,
    marginTop: 6,
    marginBottom: 10,
  },
  tripCard: {
    backgroundColor: Colors.cardBg,
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    ...Shadow.card,
  },
  tripHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tripDateBox: {
    width: 50,
    height: 56,
    borderRadius: 12,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  tripDateNum: {
    fontSize: 20,
    fontWeight: '900',
    color: Colors.primaryDark,
    letterSpacing: -0.5,
  },
  tripDateMonth: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: 0.5,
  },
  tripTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  tripPricePill: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    marginLeft: 8,
  },
  tripPriceText: {
    fontSize: 13,
    fontWeight: '900',
    color: Colors.primary,
    letterSpacing: -0.2,
  },
  tripSubMute: { fontSize: 13, color: Colors.textMuted, fontWeight: '500' },
  tripMeta: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  tripExpand: { marginTop: 12 },
  tripDivider: {
    height: 1,
    backgroundColor: Colors.separator,
    marginBottom: 12,
  },
  tripItemList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tripItemPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.inputBg,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 5,
    gap: 5,
  },
  tripItemEmoji: { fontSize: 14 },
  tripItemText: { fontSize: 13, color: Colors.textPrimary, fontWeight: '600' },

  empty: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 30,
  },
  emptyIcon: { fontSize: 60, marginBottom: 16 },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});
