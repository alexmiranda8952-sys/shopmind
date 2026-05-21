import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Platform,
  Alert,
} from 'react-native';
import MapView, { Marker, Circle } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { getCurrentLocation } from '../services/locationService';
import { getSettings, getGroceryList, getApiKey } from '../services/storageService';
import { getMatchingItems, getStoreIcon } from '../utils/storeItemMatching';
import { formatDistance } from '../utils/distance';
import { MidnightMapStyle, MidnightMapStyleDark } from '../utils/mapStyle';
import { planRoute, RoutePlan } from '../utils/routePlanner';
import { useTheme, Theme } from '../theme';
import { NearbyStore, GroceryItem } from '../types';
import Constellation from '../components/Constellation';

async function navigateToStore(lat: number, lng: number, name: string) {
  const encodedName = encodeURIComponent(name);
  const nativeUrl = Platform.OS === 'ios'
    ? `maps://app?daddr=${lat},${lng}&dirflg=d`
    : `google.navigation:q=${lat},${lng}`;
  const fallbackUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&destination_place_name=${encodedName}&travelmode=driving`;

  const nativeSupported = await Linking.canOpenURL(nativeUrl);
  if (nativeSupported) {
    Linking.openURL(nativeUrl);
  } else {
    const webSupported = await Linking.canOpenURL(fallbackUrl);
    if (webSupported) {
      Linking.openURL(fallbackUrl);
    } else {
      Alert.alert('Cannot open Maps', 'No maps app was found on this device.');
    }
  }
}

function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

interface StoreWithMatch extends NearbyStore {
  matchingItems: GroceryItem[];
  distanceMeters: number;
}

export default function MapScreen() {
  const { Colors, Shadow, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(Colors, Shadow), [Colors, Shadow]);

  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [stores, setStores] = useState<StoreWithMatch[]>([]);
  const [totalUnchecked, setTotalUnchecked] = useState(0);
  const [route, setRoute] = useState<RoutePlan | null>(null);
  const [showRoute, setShowRoute] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [radius, setRadius] = useState(500);
  const [distanceUnit, setDistanceUnit] = useState<'km' | 'miles'>('km');
  const [selectedStore, setSelectedStore] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const loc = await getCurrentLocation();
      if (!loc) {
        setError('Location permission is required to find nearby stores.');
        setLoading(false);
        return;
      }
      const { latitude, longitude } = loc.coords;
      setUserLocation({ latitude, longitude });

      const settings = await getSettings();
      setRadius(settings.alertRadiusMeters);
      setDistanceUnit(settings.distanceUnit);

      const apiKey = await getApiKey();
      if (!apiKey) {
        setError('Add your Google Maps API key in Settings to see nearby stores.');
        setLoading(false);
        return;
      }

      const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude},${longitude}&radius=${settings.alertRadiusMeters}&type=supermarket&key=${apiKey}`;
      const res = await fetch(url);
      const data = await res.json();
      const rawStores: NearbyStore[] = data.results || [];

      const groceryList = await getGroceryList();
      const unchecked = groceryList.filter((i) => !i.checked);
      setTotalUnchecked(unchecked.length);

      const withMatches: StoreWithMatch[] = rawStores.map((store) => ({
        ...store,
        matchingItems: getMatchingItems(unchecked, store),
        distanceMeters: getDistanceMeters(
          latitude,
          longitude,
          store.geometry.location.lat,
          store.geometry.location.lng
        ),
      }));

      // Sort by matching item count, then by proximity
      withMatches.sort((a, b) => {
        if (b.matchingItems.length !== a.matchingItems.length) {
          return b.matchingItems.length - a.matchingItems.length;
        }
        return a.distanceMeters - b.distanceMeters;
      });
      setStores(withMatches);

      // Compute optimal multi-store route
      if (unchecked.length > 0) {
        const plan = planRoute(unchecked, rawStores, latitude, longitude, 3);
        setRoute(plan);
      } else {
        setRoute(null);
      }
    } catch {
      setError('Failed to load nearby stores. Check your connection and API key.');
    }
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Nearby Stores</Text>
        </View>
        <View style={styles.centered}>
          <ActivityIndicator size={36} color={Colors.primary} />
          <Text style={styles.loadingText}>Finding stores near you...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const activeStore = stores.find((s) => s.place_id === selectedStore);
  const matchingStores = stores.filter((s) => s.matchingItems.length > 0);
  const bestStore = matchingStores[0];
  const coverage = bestStore && totalUnchecked > 0
    ? Math.round((bestStore.matchingItems.length / totalUnchecked) * 100)
    : 0;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Nearby Stores</Text>
          {!error && (
            <Text style={styles.subtitle}>
              {matchingStores.length} store{matchingStores.length !== 1 ? 's' : ''} within {formatDistance(radius, distanceUnit)} have your items
            </Text>
          )}
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={load}>
          <Ionicons name="refresh-outline" size={22} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {error ? (
        <View style={styles.centered}>
          <Text style={styles.errorIcon}>🗺️</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={load}>
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {/* Best Stop — hero recommendation */}
          {bestStore && (
            <TouchableOpacity
              style={styles.bestCard}
              activeOpacity={0.9}
              onPress={() => setSelectedStore(bestStore.place_id)}
            >
              <Constellation variant="sparse" />
              <View style={styles.bestRibbon}>
                <Ionicons name="sparkles" size={11} color={Colors.gradientGlow} />
                <Text style={styles.bestRibbonText}>BEST STOP FOR YOUR LIST</Text>
              </View>
              <View style={styles.bestHeader}>
                <Text style={styles.bestStoreEmoji}>{getStoreIcon(bestStore)}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.bestStoreName} numberOfLines={1}>{bestStore.name}</Text>
                  <Text style={styles.bestStoreDist}>
                    {formatDistance(bestStore.distanceMeters, distanceUnit)} away
                  </Text>
                </View>
                <View style={styles.bestCoverage}>
                  <Text style={styles.bestCoverageNum}>{coverage}%</Text>
                  <Text style={styles.bestCoverageLabel}>covered</Text>
                </View>
              </View>
              <View style={styles.bestDivider} />
              <Text style={styles.bestPickupLabel}>
                You can grab {bestStore.matchingItems.length} of your {totalUnchecked} item{totalUnchecked !== 1 ? 's' : ''}
              </Text>
              <Text style={styles.bestPickupItems} numberOfLines={2}>
                {bestStore.matchingItems.slice(0, 6).map((i) => i.name).join('  ·  ')}
                {bestStore.matchingItems.length > 6 ? `  +${bestStore.matchingItems.length - 6} more` : ''}
              </Text>
              <TouchableOpacity
                style={styles.bestNavBtn}
                onPress={() => navigateToStore(
                  bestStore.geometry.location.lat,
                  bestStore.geometry.location.lng,
                  bestStore.name
                )}
              >
                <Ionicons name="navigate" size={18} color={Colors.primaryDark} />
                <Text style={styles.bestNavBtnText}>Take me there</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          )}

          {/* Multi-Stop Route Plan — only show if 2+ stops needed */}
          {route && route.stops.length >= 2 && (
            <View style={styles.routeCard}>
              <TouchableOpacity
                style={styles.routeHeader}
                onPress={() => setShowRoute((s) => !s)}
                activeOpacity={0.7}
              >
                <View style={styles.routeIconBox}>
                  <Ionicons name="git-network" size={20} color={Colors.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.routeLabel}>OPTIMAL MULTI-STOP ROUTE</Text>
                  <Text style={styles.routeTitle}>
                    {route.stops.length} stops cover {route.totalItemsCovered} of {route.totalItemsRequested}
                  </Text>
                </View>
                <Ionicons
                  name={showRoute ? 'chevron-up' : 'chevron-down'}
                  size={22}
                  color={Colors.textMuted}
                />
              </TouchableOpacity>

              {showRoute && (
                <View style={styles.routeBody}>
                  <View style={styles.routeMetaRow}>
                    <View style={styles.routeMetaPill}>
                      <Ionicons name="walk-outline" size={11} color={Colors.primary} />
                      <Text style={styles.routeMetaText}>
                        {formatDistance(route.totalDistanceMeters, distanceUnit)} total
                      </Text>
                    </View>
                    {route.uncoveredItems.length > 0 && (
                      <View style={[styles.routeMetaPill, styles.routeMetaPillWarn]}>
                        <Ionicons name="warning-outline" size={11} color={Colors.warning} />
                        <Text style={[styles.routeMetaText, { color: Colors.warning }]}>
                          {route.uncoveredItems.length} item{route.uncoveredItems.length !== 1 ? 's' : ''} not nearby
                        </Text>
                      </View>
                    )}
                  </View>

                  {route.stops.map((stop, idx) => (
                    <View key={stop.store.place_id} style={styles.routeStop}>
                      <View style={styles.routeStopLeft}>
                        <View style={styles.routeStopNumBox}>
                          <Text style={styles.routeStopNum}>{idx + 1}</Text>
                        </View>
                        {idx < route.stops.length - 1 && (
                          <View style={styles.routeStopLine} />
                        )}
                      </View>
                      <View style={styles.routeStopBody}>
                        <View style={styles.routeStopHeader}>
                          <Text style={styles.routeStopEmoji}>{getStoreIcon(stop.store)}</Text>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.routeStopName} numberOfLines={1}>
                              {stop.store.name}
                            </Text>
                            <Text style={styles.routeStopDist}>
                              {formatDistance(stop.distanceMeters, distanceUnit)}
                              {idx === 0 ? ' away' : ' from prev'}
                              {'  ·  '}
                              {stop.items.length} item{stop.items.length !== 1 ? 's' : ''}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.routeStopItems} numberOfLines={2}>
                          {stop.items.map((i) => i.name).join('  ·  ')}
                        </Text>
                        <TouchableOpacity
                          style={styles.routeStopNavBtn}
                          onPress={() =>
                            navigateToStore(
                              stop.store.geometry.location.lat,
                              stop.store.geometry.location.lng,
                              stop.store.name
                            )
                          }
                        >
                          <Ionicons name="navigate-outline" size={14} color={Colors.primary} />
                          <Text style={styles.routeStopNavText}>Navigate</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}

                  {route.uncoveredItems.length > 0 && (
                    <View style={styles.uncoveredBox}>
                      <Text style={styles.uncoveredLabel}>NO NEARBY STORE FOR:</Text>
                      <Text style={styles.uncoveredItems}>
                        {route.uncoveredItems.map((i) => i.name).join('  ·  ')}
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          )}

          {userLocation && (
            <MapView
              style={styles.map}
              customMapStyle={isDark ? MidnightMapStyleDark : MidnightMapStyle}
              initialRegion={{
                latitude: userLocation.latitude,
                longitude: userLocation.longitude,
                latitudeDelta: 0.025,
                longitudeDelta: 0.025,
              }}
              showsUserLocation
            >
              <Circle
                center={userLocation}
                radius={radius}
                fillColor={Colors.primaryLight}
                strokeColor={Colors.primary}
                strokeWidth={2}
              />
              {stores.map((store) => (
                <Marker
                  key={store.place_id}
                  coordinate={{
                    latitude: store.geometry.location.lat,
                    longitude: store.geometry.location.lng,
                  }}
                  pinColor={store.matchingItems.length > 0 ? Colors.primary : Colors.textMuted}
                  onPress={() => setSelectedStore(
                    selectedStore === store.place_id ? null : store.place_id
                  )}
                />
              ))}
            </MapView>
          )}

          {/* Selected store detail card */}
          {activeStore && (
            <View style={styles.detailCard}>
              <View style={styles.detailHeader}>
                <Text style={styles.detailEmoji}>{getStoreIcon(activeStore)}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.detailName}>{activeStore.name}</Text>
                  <Text style={styles.detailAddress}>{activeStore.vicinity}</Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedStore(null)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                  <Ionicons name="close" size={20} color={Colors.textMuted} />
                </TouchableOpacity>
              </View>
              {activeStore.matchingItems.length > 0 ? (
                <>
                  <Text style={styles.detailMatchLabel}>
                    Available here ({activeStore.matchingItems.length} item{activeStore.matchingItems.length !== 1 ? 's' : ''}):
                  </Text>
                  <Text style={styles.detailMatchItems}>
                    {activeStore.matchingItems.map((i) => i.name).join('  ·  ')}
                  </Text>
                </>
              ) : (
                <Text style={styles.detailNoMatch}>None of your list items are sold here.</Text>
              )}
              <TouchableOpacity
                style={styles.navigateBtn}
                onPress={() => navigateToStore(
                  activeStore.geometry.location.lat,
                  activeStore.geometry.location.lng,
                  activeStore.name
                )}
              >
                <Ionicons name="navigate-outline" size={20} color="#FFFFFF" />
                <Text style={styles.navigateBtnText}>Navigate Here</Text>
              </TouchableOpacity>
            </View>
          )}

          <Text style={styles.listHeader}>All Stores Near You</Text>
          {stores.length === 0 ? (
            <View style={styles.noStoresBox}>
              <Text style={styles.noStoresIcon}>🏪</Text>
              <Text style={styles.noStores}>
                No stores found nearby.{'\n'}Try increasing your alert radius in Settings.
              </Text>
            </View>
          ) : (
            stores.map((store, idx) => (
              <TouchableOpacity
                key={store.place_id}
                style={[
                  styles.storeCard,
                  selectedStore === store.place_id && styles.storeCardActive,
                ]}
                onPress={() => setSelectedStore(
                  selectedStore === store.place_id ? null : store.place_id
                )}
                activeOpacity={0.8}
              >
                <View style={styles.storeLeft}>
                  <View style={[
                    styles.storeIconCircle,
                    store.matchingItems.length > 0 && styles.storeIconCircleMatch,
                  ]}>
                    <Text style={styles.storeIconEmoji}>{getStoreIcon(store)}</Text>
                  </View>
                  <View style={styles.storeInfo}>
                    <View style={styles.storeNameRow}>
                      <Text style={styles.storeName} numberOfLines={1}>{store.name}</Text>
                      {idx === 0 && store.matchingItems.length > 0 && (
                        <View style={styles.bestPill}>
                          <Text style={styles.bestPillText}>BEST</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.storeAddress} numberOfLines={1}>
                      {formatDistance(store.distanceMeters, distanceUnit)}  ·  {store.vicinity}
                    </Text>
                  </View>
                </View>
                {store.matchingItems.length > 0 ? (
                  <View style={styles.matchBadge}>
                    <Text style={styles.matchBadgeText}>{store.matchingItems.length}</Text>
                    <Text style={styles.matchBadgeLabel}>items</Text>
                  </View>
                ) : (
                  <Text style={styles.noMatchLabel}>0 items</Text>
                )}
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const makeStyles = (Colors: Theme['Colors'], Shadow: Theme['Shadow']) => StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
  },
  title: { fontSize: 32, fontWeight: '900', color: Colors.primaryDark, letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: Colors.textSecondary, marginTop: 3, fontWeight: '500' },
  refreshBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center', alignItems: 'center',
  },

  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 40 },

  // Best Stop hero card
  bestCard: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 10,
    padding: 16,
    borderRadius: 24,
    backgroundColor: Colors.primaryDark,
    overflow: 'hidden',
    ...Shadow.cardElevated,
  },
  bestRibbon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(252,211,77,0.15)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 12,
  },
  bestRibbonText: {
    fontSize: 10,
    fontWeight: '900',
    color: Colors.gradientGlow,
    letterSpacing: 1.2,
  },
  bestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bestStoreEmoji: {
    fontSize: 32,
    marginRight: 12,
  },
  bestStoreName: {
    fontSize: 19,
    fontWeight: '900',
    color: Colors.textWhite,
    letterSpacing: -0.3,
  },
  bestStoreDist: {
    fontSize: 12,
    color: Colors.gradientGlow,
    fontWeight: '600',
    marginTop: 2,
  },
  bestCoverage: {
    alignItems: 'center',
    marginLeft: 8,
  },
  bestCoverageNum: {
    fontSize: 26,
    fontWeight: '900',
    color: Colors.textWhite,
    letterSpacing: -0.5,
  },
  bestCoverageLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.gradientGlow,
    letterSpacing: 0.8,
    marginTop: -3,
  },
  bestDivider: {
    height: 1,
    backgroundColor: 'rgba(252,211,77,0.20)',
    marginVertical: 12,
  },
  bestPickupLabel: {
    fontSize: 11,
    color: Colors.gradientGlow,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  bestPickupItems: {
    fontSize: 14,
    color: Colors.textWhite,
    lineHeight: 20,
    fontWeight: '500',
  },
  bestNavBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.gradientGlow,
    borderRadius: 14,
    paddingVertical: 12,
    marginTop: 14,
    gap: 8,
  },
  bestNavBtnText: {
    color: Colors.primaryDark,
    fontWeight: '900',
    fontSize: 15,
    letterSpacing: 0.3,
  },

  // Route plan card
  routeCard: {
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: Colors.cardBg,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: Colors.accentLight,
    ...Shadow.card,
  },
  routeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  routeIconBox: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.accentLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  routeLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: Colors.accent,
    letterSpacing: 1.4,
  },
  routeTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginTop: 2,
  },
  routeBody: {
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  routeMetaRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
    flexWrap: 'wrap',
  },
  routeMetaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  routeMetaPillWarn: {
    backgroundColor: Colors.warningLight,
  },
  routeMetaText: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: 0.2,
  },
  routeStop: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginBottom: 4,
  },
  routeStopLeft: {
    alignItems: 'center',
    marginRight: 10,
  },
  routeStopNumBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadow.fab,
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  routeStopNum: {
    color: Colors.textWhite,
    fontSize: 13,
    fontWeight: '900',
  },
  routeStopLine: {
    width: 2,
    flex: 1,
    backgroundColor: Colors.accentLight,
    marginTop: 4,
  },
  routeStopBody: {
    flex: 1,
    backgroundColor: Colors.inputBg,
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
  },
  routeStopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  routeStopEmoji: { fontSize: 22 },
  routeStopName: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  routeStopDist: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '500',
    marginTop: 1,
  },
  routeStopItems: {
    fontSize: 12,
    color: Colors.textPrimary,
    lineHeight: 17,
    marginBottom: 8,
  },
  routeStopNavBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    backgroundColor: Colors.cardBg,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
  },
  routeStopNavText: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: 0.2,
  },
  uncoveredBox: {
    backgroundColor: Colors.warningLight,
    padding: 10,
    borderRadius: 12,
    marginTop: 4,
    borderLeftWidth: 3,
    borderLeftColor: Colors.warning,
  },
  uncoveredLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: Colors.warning,
    letterSpacing: 1,
    marginBottom: 2,
  },
  uncoveredItems: {
    fontSize: 12,
    color: Colors.textPrimary,
    fontWeight: '600',
  },

  map: {
    height: 200,
    marginHorizontal: 16,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 10,
    ...Shadow.card,
  },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  loadingText: { marginTop: 14, color: Colors.textSecondary, fontSize: 15, fontWeight: '500' },
  errorIcon: { fontSize: 52, marginBottom: 14 },
  errorText: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center', lineHeight: 23, marginBottom: 20 },
  retryBtn: { backgroundColor: Colors.primary, paddingHorizontal: 28, paddingVertical: 13, borderRadius: 14 },
  retryText: { color: Colors.textWhite, fontWeight: '700', fontSize: 15 },

  detailCard: {
    marginHorizontal: 16, marginBottom: 10,
    backgroundColor: Colors.cardBg,
    borderRadius: 18, padding: 14, ...Shadow.card,
    borderLeftWidth: 4, borderLeftColor: Colors.primary,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 10,
  },
  detailEmoji: { fontSize: 28 },
  detailName: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  detailAddress: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  detailMatchLabel: { fontSize: 11, fontWeight: '800', color: Colors.primary, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  detailMatchItems: { fontSize: 14, color: Colors.textPrimary, lineHeight: 21 },
  detailNoMatch: { fontSize: 14, color: Colors.textMuted, fontStyle: 'italic' },
  navigateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 11,
    marginTop: 12,
    gap: 8,
  },
  navigateBtnText: { color: Colors.textWhite, fontWeight: '700', fontSize: 15 },

  listHeader: {
    fontSize: 12, fontWeight: '800', color: Colors.primary,
    textTransform: 'uppercase', letterSpacing: 1, marginHorizontal: 20, marginTop: 6, marginBottom: 8,
  },
  storeCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.cardBg, padding: 12,
    marginHorizontal: 16, marginBottom: 8,
    borderRadius: 16, ...Shadow.card,
  },
  storeCardActive: { borderWidth: 1.5, borderColor: Colors.primary },
  storeLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  storeIconCircle: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.separator,
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  storeIconCircleMatch: { backgroundColor: Colors.primaryLight },
  storeIconEmoji: { fontSize: 22 },
  storeInfo: { flex: 1 },
  storeNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  storeName: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, flexShrink: 1 },
  bestPill: {
    backgroundColor: Colors.accent,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  bestPillText: {
    fontSize: 9,
    fontWeight: '900',
    color: Colors.textWhite,
    letterSpacing: 0.8,
  },
  storeAddress: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  matchBadge: {
    alignItems: 'center', backgroundColor: Colors.primaryLight,
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, minWidth: 48,
  },
  matchBadgeText: { fontSize: 18, fontWeight: '800', color: Colors.primary },
  matchBadgeLabel: { fontSize: 10, color: Colors.primary, fontWeight: '600' },
  noMatchLabel: { fontSize: 13, color: Colors.textMuted, fontWeight: '500' },
  noStoresBox: { alignItems: 'center', paddingTop: 30, paddingHorizontal: 20 },
  noStoresIcon: { fontSize: 48, marginBottom: 12 },
  noStores: { textAlign: 'center', color: Colors.textSecondary, fontSize: 15, lineHeight: 23 },
});
