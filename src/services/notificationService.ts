import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { GroceryItem } from '../types';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('store-alerts', {
      name: 'Store Alerts',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    });
  }
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function sendStoreNearbyNotification(
  storeName: string,
  matchingItems: GroceryItem[]
): Promise<void> {
  const preview = matchingItems
    .slice(0, 3)
    .map((i) => i.name)
    .join(', ');
  const extra = matchingItems.length > 3 ? ` +${matchingItems.length - 3} more` : '';

  await Notifications.scheduleNotificationAsync({
    content: {
      title: `${storeName} is nearby!`,
      body: `Pick up: ${preview}${extra}`,
      sound: true,
      data: { type: 'store-nearby' },
    },
    trigger: null,
  });
}
