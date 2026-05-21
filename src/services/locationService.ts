import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { getGroceryList, getSettings, getApiKey, saveSettings } from './storageService';
import { sendStoreNearbyNotification } from './notificationService';
import { getMatchingItems } from '../utils/storeItemMatching';

export const BACKGROUND_LOCATION_TASK = 'shopmind-background-location';

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

async function fetchNearbyStores(
  lat: number,
  lng: number,
  radius: number,
  apiKey: string
): Promise<any[]> {
  const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&type=supermarket&key=${apiKey}`;
  const response = await fetch(url);
  const data = await response.json();
  return data.results || [];
}

TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }: any) => {
  if (error || !data) return;

  const { locations } = data;
  const location = locations?.[0];
  if (!location) return;

  const { latitude, longitude } = location.coords;
  const settings = await getSettings();

  const apiKey = await getApiKey();
  if (!settings.notificationsEnabled || !apiKey) return;

  // Only check once every 5 minutes to conserve battery
  const now = Date.now();
  if (now - settings.lastNotifiedAt < 5 * 60 * 1000) return;

  const groceryList = await getGroceryList();
  const uncheckedItems = groceryList.filter((item) => !item.checked);
  if (uncheckedItems.length === 0) return;

  const stores = await fetchNearbyStores(
    latitude,
    longitude,
    settings.alertRadiusMeters,
    apiKey
  );

  for (const store of stores) {
    const distance = getDistanceMeters(
      latitude,
      longitude,
      store.geometry.location.lat,
      store.geometry.location.lng
    );

    if (distance > settings.alertRadiusMeters) continue;
    if (store.place_id === settings.lastNotifiedStoreId) continue;

    // Only notify for items this specific store type actually carries
    const matchingItems = getMatchingItems(uncheckedItems, store);
    if (matchingItems.length === 0) continue;

    await sendStoreNearbyNotification(store.name, matchingItems);
    await saveSettings({ lastNotifiedStoreId: store.place_id, lastNotifiedAt: now });
    break;
  }
});

export async function requestLocationPermissions(): Promise<boolean> {
  const { status: fg } = await Location.requestForegroundPermissionsAsync();
  if (fg !== 'granted') return false;
  const { status: bg } = await Location.requestBackgroundPermissionsAsync();
  return bg === 'granted';
}

export async function startBackgroundLocationTracking(): Promise<void> {
  const already = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
  if (already) return;
  await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
    accuracy: Location.Accuracy.Balanced,
    distanceInterval: 150,
    timeInterval: 60000,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: 'ShopMind',
      notificationBody: 'Watching for nearby grocery stores...',
      notificationColor: '#1E1B4B',
    },
  });
}

export async function stopBackgroundLocationTracking(): Promise<void> {
  const registered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
  if (registered) {
    await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
  }
}

export async function getCurrentLocation(): Promise<Location.LocationObject | null> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') return null;
  return Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
}

export async function isTrackingActive(): Promise<boolean> {
  return TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
}
