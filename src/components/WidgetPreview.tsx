import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, Theme } from '../theme';
import { GroceryItem } from '../types';
import { getItemEmoji } from '../utils/itemIcons';

interface Props {
  items: GroceryItem[];
}

/**
 * Visual preview of the live-widget notification as it appears in the
 * system tray. Renders as a fake notification card so the user can see
 * exactly what they're enabling.
 */
export default function WidgetPreview({ items }: Props) {
  const { Colors, Shadow } = useTheme();
  const styles = useMemo(() => makeStyles(Colors, Shadow), [Colors, Shadow]);

  const unchecked = items.filter((i) => !i.checked);
  const checked = items.filter((i) => i.checked);
  const urgent = unchecked.filter((i) => i.priority);
  const progress =
    items.length > 0 ? Math.round((checked.length / items.length) * 100) : 0;

  const empty = items.length === 0;
  const allDone = !empty && unchecked.length === 0;

  const ordered = [...urgent, ...unchecked.filter((i) => !i.priority)];
  const previewItems = ordered.slice(0, 3);

  return (
    <View style={styles.notifShell}>
      <View style={styles.topBar}>
        <View style={styles.appIcon}>
          <Ionicons name="cart" size={12} color={Colors.primaryDark} />
        </View>
        <Text style={styles.appName}>SHOPMIND</Text>
        <Text style={styles.appNow}>· now</Text>
      </View>

      <Text style={styles.notifTitle}>
        {empty
          ? '🛒  Empty list'
          : allDone
          ? `✨  All ${items.length} picked up!`
          : `🛒  ${unchecked.length} to grab  ·  ${progress}% done${urgent.length > 0 ? `  ·  ${urgent.length} urgent` : ''}`}
      </Text>

      <Text style={styles.notifBody} numberOfLines={2}>
        {empty
          ? 'Tap to start building your shopping list'
          : allDone
          ? 'Tap to finish your trip'
          : previewItems
              .map((i) => `${getItemEmoji(i.name)} ${i.priority ? '★ ' : ''}${i.name}`)
              .join('   •   ') +
            (ordered.length > 3 ? `   +${ordered.length - 3} more` : '')}
      </Text>

      <View style={styles.notifFooter}>
        <Ionicons name="lock-closed" size={10} color={Colors.textMuted} />
        <Text style={styles.notifFooterText}>Persistent · tap to open ShopMind</Text>
      </View>
    </View>
  );
}

const makeStyles = (Colors: Theme['Colors'], Shadow: Theme['Shadow']) =>
  StyleSheet.create({
    notifShell: {
      backgroundColor: Colors.cardBg,
      borderRadius: 16,
      padding: 14,
      borderLeftWidth: 3,
      borderLeftColor: Colors.gradientGlow,
      ...Shadow.card,
    },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 6,
    },
    appIcon: {
      width: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: Colors.gradientGlow,
      justifyContent: 'center',
      alignItems: 'center',
    },
    appName: {
      fontSize: 10,
      fontWeight: '900',
      color: Colors.textSecondary,
      letterSpacing: 1.4,
    },
    appNow: {
      fontSize: 10,
      color: Colors.textMuted,
      fontWeight: '600',
    },
    notifTitle: {
      fontSize: 14,
      fontWeight: '800',
      color: Colors.textPrimary,
      marginBottom: 4,
    },
    notifBody: {
      fontSize: 12,
      color: Colors.textSecondary,
      fontWeight: '600',
      lineHeight: 17,
      marginBottom: 8,
    },
    notifFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: 4,
    },
    notifFooterText: {
      fontSize: 10,
      color: Colors.textMuted,
      fontWeight: '600',
      letterSpacing: 0.3,
    },
  });
