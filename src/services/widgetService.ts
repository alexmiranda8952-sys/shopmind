import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GroceryItem } from '../types';
import { getItemEmoji } from '../utils/itemIcons';

/**
 * "Live Widget" service.
 *
 * Renders a persistent (sticky) notification in the system tray that
 * acts as a quick-glance widget for your shopping list. On Android the
 * notification is non-dismissable until disabled. On iOS the user sees
 * an update in Notification Center but the OS doesn't keep it sticky.
 *
 * A real home-screen widget on either platform requires native code
 * (WidgetKit / Glance) that isn't available in the Expo managed workflow.
 * This is the most "widget-like" thing achievable without leaving Expo Go.
 */

const WIDGET_NOTIFICATION_ID = 'shopmind-live-widget';
const WIDGET_CHANNEL_ID = 'shopmind-live-widget';
const WIDGET_ENABLED_KEY = '@shopmind_widget_enabled';

export async function isWidgetEnabled(): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem(WIDGET_ENABLED_KEY);
    return v === 'true';
  } catch {
    return false;
  }
}

export async function setWidgetEnabled(enabled: boolean, items?: GroceryItem[]): Promise<void> {
  await AsyncStorage.setItem(WIDGET_ENABLED_KEY, enabled ? 'true' : 'false');
  if (enabled && items) {
    await showLiveWidget(items);
  } else if (!enabled) {
    await hideLiveWidget();
  }
}

async function ensureChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(WIDGET_CHANNEL_ID, {
    name: 'Live List Widget',
    description: 'A persistent quick-glance widget showing your grocery list.',
    importance: Notifications.AndroidImportance.LOW, // no sound, no heads-up
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    enableVibrate: false,
    enableLights: false,
    sound: undefined,
    showBadge: false,
  });
}

interface WidgetContent {
  title: string;
  body: string;
}

function buildWidgetContent(items: GroceryItem[]): WidgetContent {
  if (items.length === 0) {
    return {
      title: '🛒  ShopMind  ·  Empty list',
      body: 'Tap to start building your shopping list',
    };
  }

  const unchecked = items.filter((i) => !i.checked);
  const checked = items.filter((i) => i.checked);
  const urgent = unchecked.filter((i) => i.priority);
  const progress = Math.round((checked.length / items.length) * 100);

  if (unchecked.length === 0) {
    return {
      title: `✨  All ${items.length} item${items.length !== 1 ? 's' : ''} picked up!`,
      body: 'Tap to finish your trip',
    };
  }

  // Sort: urgent first, then by oldest createdAt
  const ordered = [
    ...urgent,
    ...unchecked.filter((i) => !i.priority),
  ];

  const previewItems = ordered.slice(0, 3);
  const preview = previewItems
    .map((i) => {
      const emoji = getItemEmoji(i.name);
      const star = i.priority ? '★ ' : '';
      return `${emoji} ${star}${i.name}`;
    })
    .join('   •   ');
  const extra =
    ordered.length > 3 ? `   +${ordered.length - 3} more` : '';

  const urgentLabel = urgent.length > 0 ? ` · ${urgent.length} urgent` : '';
  const title = `🛒  ${unchecked.length} to grab  ·  ${progress}% done${urgentLabel}`;

  return {
    title,
    body: preview + extra,
  };
}

/**
 * Posts (or updates) the live widget notification. Safe to call repeatedly —
 * subsequent calls with the same identifier replace the existing notification
 * in place, so the widget appears to update live as items change.
 */
export async function showLiveWidget(items: GroceryItem[]): Promise<void> {
  await ensureChannel();
  const { title, body } = buildWidgetContent(items);

  const content: Notifications.NotificationContentInput = {
    title,
    body,
    sound: undefined,
    data: { source: 'live-widget' },
    // Android-only options — silently ignored on iOS
    sticky: true,
    autoDismiss: false,
    color: '#FCD34D',
    priority: Notifications.AndroidNotificationPriority.LOW,
  };

  await Notifications.scheduleNotificationAsync({
    identifier: WIDGET_NOTIFICATION_ID,
    content,
    trigger: null, // post immediately
  });
}

/**
 * Removes the live widget notification from the tray entirely.
 */
export async function hideLiveWidget(): Promise<void> {
  try {
    await Notifications.dismissNotificationAsync(WIDGET_NOTIFICATION_ID);
  } catch {
    /* no-op if not present */
  }
  try {
    await Notifications.cancelScheduledNotificationAsync(WIDGET_NOTIFICATION_ID);
  } catch {
    /* no-op */
  }
}

/**
 * Convenience wrapper — call after every list mutation. Only re-posts the
 * widget if the user has enabled it; otherwise it's a no-op.
 */
export async function refreshLiveWidget(items: GroceryItem[]): Promise<void> {
  if (!(await isWidgetEnabled())) return;
  await showLiveWidget(items);
}
