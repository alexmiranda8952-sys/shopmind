import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, Theme } from '../theme';

interface Props {
  title?: string;
  body?: string;
  onUpgrade: () => void;
  compact?: boolean;
}

/**
 * Visual placeholder shown in place of a premium feature when the user
 * doesn't have an active subscription. Tapping the CTA opens the paywall.
 */
export default function PremiumLock({
  title = 'Premium feature',
  body = 'Unlock with ShopMind Premium to use this.',
  onUpgrade,
  compact,
}: Props) {
  const { Colors, Shadow } = useTheme();
  const styles = useMemo(() => makeStyles(Colors, Shadow), [Colors, Shadow]);

  if (compact) {
    return (
      <TouchableOpacity style={styles.compactCard} onPress={onUpgrade} activeOpacity={0.85}>
        <Ionicons name="diamond" size={14} color={Colors.gradientGlow} />
        <Text style={styles.compactText}>{title}</Text>
        <Ionicons name="lock-closed" size={12} color={Colors.gradientGlow} />
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.iconBubble}>
        <Ionicons name="diamond" size={26} color={Colors.primaryDark} />
      </View>
      <Text style={styles.eyebrow}>PREMIUM</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
      <TouchableOpacity style={styles.cta} onPress={onUpgrade} activeOpacity={0.85}>
        <Ionicons name="sparkles" size={16} color={Colors.primaryDark} />
        <Text style={styles.ctaText}>Unlock Premium</Text>
      </TouchableOpacity>
    </View>
  );
}

const makeStyles = (Colors: Theme['Colors'], Shadow: Theme['Shadow']) =>
  StyleSheet.create({
    card: {
      backgroundColor: Colors.primaryDark,
      borderRadius: 20,
      padding: 18,
      alignItems: 'center',
      overflow: 'hidden',
      ...Shadow.cardElevated,
    },
    iconBubble: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: Colors.gradientGlow,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 12,
      shadowColor: Colors.gradientGlow,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.5,
      shadowRadius: 14,
      elevation: 8,
    },
    eyebrow: {
      fontSize: 10,
      fontWeight: '900',
      color: Colors.gradientGlow,
      letterSpacing: 2,
      marginBottom: 6,
    },
    title: {
      fontSize: 18,
      fontWeight: '900',
      color: Colors.textWhite,
      textAlign: 'center',
      marginBottom: 6,
    },
    body: {
      fontSize: 13,
      color: Colors.textInverse,
      textAlign: 'center',
      opacity: 0.85,
      lineHeight: 19,
      marginBottom: 16,
      paddingHorizontal: 10,
    },
    cta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: Colors.gradientGlow,
      paddingHorizontal: 18,
      paddingVertical: 12,
      borderRadius: 14,
    },
    ctaText: {
      fontSize: 14,
      fontWeight: '900',
      color: Colors.primaryDark,
      letterSpacing: 0.3,
    },

    compactCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: Colors.primaryDark,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 10,
    },
    compactText: {
      fontSize: 11,
      fontWeight: '800',
      color: Colors.gradientGlow,
      letterSpacing: 0.3,
    },
  });
