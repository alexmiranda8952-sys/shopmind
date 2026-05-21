import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, Theme } from '../theme';
import { useSubscription } from '../contexts/SubscriptionContext';
import {
  PREMIUM_PRICE_LABEL,
  PREMIUM_BILLING_LABEL,
} from '../services/subscriptionService';
import { PRIVACY_POLICY_URL, TERMS_OF_SERVICE_URL } from '../config';
import Constellation from '../components/Constellation';

interface Props {
  onClose?: () => void;
  /**
   * When `true`, the close button is hidden and the paywall must be
   * resolved by purchasing or restoring. Used at the app-launch gate.
   */
  required?: boolean;
}

interface PerkRow {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  body: string;
}

const PERKS: PerkRow[] = [
  {
    icon: 'sparkles',
    title: 'AI shopping assistant',
    body: '"Add ingredients for tacos for 4" → done. Plan meals, get suggestions, chat with your list.',
  },
  {
    icon: 'scan',
    title: 'Barcode & receipt scanning',
    body: 'Snap a can or a receipt — items extract themselves. No more typing.',
  },
  {
    icon: 'albums',
    title: 'Unlimited lists & items',
    body: 'Separate weekly groceries, Costco runs, pharmacy stops — keep them all organized.',
  },
  {
    icon: 'git-network',
    title: 'Multi-stop route planner',
    body: 'The optimal path through 3 stores that together cover your entire list.',
  },
  {
    icon: 'archive',
    title: 'Pantry tracking',
    body: 'Track what you already have. Get expiration alerts before milk goes bad.',
  },
  {
    icon: 'trending-down',
    title: 'Price history & savings',
    body: 'See where you save the most. Charts show price trends per item per store.',
  },
  {
    icon: 'trophy',
    title: 'Achievements & streaks',
    body: 'Badges for milestones — every trip, every dollar saved.',
  },
];

export default function PaywallScreen({ onClose, required }: Props) {
  const { Colors, Shadow } = useTheme();
  const styles = useMemo(() => makeStyles(Colors, Shadow), [Colors, Shadow]);
  const { purchase, restore, demoMode } = useSubscription();
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const handlePurchase = async () => {
    setPurchasing(true);
    const result = await purchase();
    setPurchasing(false);
    if (result.ok) {
      Alert.alert(
        '🎉 Welcome to ShopMind!',
        demoMode
          ? 'Demo subscription active for 2 weeks. Enjoy the app!'
          : 'Your subscription is active. Thanks for supporting ShopMind!',
        // In required mode, no onClose — the subscription state change will
        // automatically navigate the user out of the paywall.
        [{ text: 'Get started', onPress: onClose }]
      );
    } else {
      Alert.alert('Purchase failed', result.error || 'Please try again.');
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    const result = await restore();
    setRestoring(false);
    if (result.restored) {
      Alert.alert('Restored', 'Your subscription has been restored.', [
        { text: 'OK', onPress: onClose },
      ]);
    } else {
      Alert.alert('No purchase found', 'No prior subscription was found on this account.');
    }
  };

  return (
    <View style={styles.container}>
      <Constellation variant="dense" color="#FCD34D" />

      {!required && onClose && (
        <TouchableOpacity
          style={styles.closeBtn}
          onPress={onClose}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="close" size={26} color="#FAF7F2" />
        </TouchableOpacity>
      )}

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.crownCircle}>
            <Ionicons name="diamond" size={42} color="#0F0C2C" />
          </View>
          <Text style={styles.eyebrow}>SHOPMIND PREMIUM</Text>
          <Text style={styles.heroTitle}>Unlock the full experience</Text>
          <Text style={styles.heroSub}>
            One subscription. Every smart feature.{'\n'}Built to make grocery runs effortless.
          </Text>
        </View>

        {/* Perks */}
        <View style={styles.perks}>
          {PERKS.map((perk, idx) => (
            <View key={idx} style={styles.perkRow}>
              <View style={styles.perkIcon}>
                <Ionicons name={perk.icon} size={20} color="#0F0C2C" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.perkTitle}>{perk.title}</Text>
                <Text style={styles.perkBody}>{perk.body}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Price card */}
        <View style={styles.priceCard}>
          <Text style={styles.priceEyebrow}>MONTHLY</Text>
          <View style={styles.priceRow}>
            <Text style={styles.priceAmount}>{PREMIUM_PRICE_LABEL}</Text>
            <Text style={styles.priceBilling}>/ {PREMIUM_BILLING_LABEL}</Text>
          </View>
          <Text style={styles.priceCaption}>
            Cancel any time from your device's subscription settings. No long-term commitment.
          </Text>
        </View>

        {/* CTA */}
        <TouchableOpacity
          style={[styles.subscribeBtn, purchasing && styles.subscribeBtnLoading]}
          onPress={handlePurchase}
          disabled={purchasing}
          activeOpacity={0.85}
        >
          {purchasing ? (
            <ActivityIndicator color="#0F0C2C" />
          ) : (
            <>
              <Ionicons name="sparkles" size={18} color="#0F0C2C" />
              <Text style={styles.subscribeText}>
                Start Premium — {PREMIUM_PRICE_LABEL}/{PREMIUM_BILLING_LABEL}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {demoMode && (
          <View style={styles.demoBadge}>
            <Ionicons name="information-circle" size={14} color="#FCD34D" />
            <Text style={styles.demoText}>
              Demo mode — no real charge. The subscription will activate locally for 2 weeks.
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.restoreBtn}
          onPress={handleRestore}
          disabled={restoring}
        >
          <Text style={styles.restoreText}>
            {restoring ? 'Restoring…' : 'Restore purchases'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.fineprint}>
          Payment is charged to your account at confirmation. Subscription auto-renews monthly
          unless canceled at least 24 hours before the end of the current period. Manage and
          cancel in your device's account settings.
        </Text>

        <View style={styles.legalRow}>
          <TouchableOpacity onPress={() => Linking.openURL(TERMS_OF_SERVICE_URL)}>
            <Text style={styles.legalLink}>Terms of Use</Text>
          </TouchableOpacity>
          <Text style={styles.legalDot}>·</Text>
          <TouchableOpacity onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}>
            <Text style={styles.legalLink}>Privacy Policy</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const makeStyles = (Colors: Theme['Colors'], Shadow: Theme['Shadow']) => StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0C2C' },
  closeBtn: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scroll: {
    paddingTop: 70,
    paddingHorizontal: 22,
    paddingBottom: 50,
  },

  hero: {
    alignItems: 'center',
    marginBottom: 24,
  },
  crownCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#FCD34D',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
    shadowColor: '#FCD34D',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 14,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '900',
    color: '#FCD34D',
    letterSpacing: 2,
    marginBottom: 8,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 10,
  },
  heroSub: {
    fontSize: 14,
    color: '#A5B4FC',
    textAlign: 'center',
    lineHeight: 21,
    fontWeight: '500',
  },

  perks: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 22,
    padding: 6,
    marginBottom: 18,
  },
  perkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
  },
  perkIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FCD34D',
    justifyContent: 'center',
    alignItems: 'center',
  },
  perkTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  perkBody: {
    fontSize: 12,
    color: '#A5B4FC',
    fontWeight: '500',
    lineHeight: 17,
  },

  priceCard: {
    backgroundColor: 'rgba(252,211,77,0.08)',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(252,211,77,0.4)',
    alignItems: 'center',
    marginBottom: 16,
  },
  priceEyebrow: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FCD34D',
    letterSpacing: 2,
    marginBottom: 6,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginBottom: 8,
  },
  priceAmount: {
    fontSize: 44,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -1.5,
  },
  priceBilling: {
    fontSize: 16,
    fontWeight: '700',
    color: '#A5B4FC',
  },
  priceCaption: {
    fontSize: 11,
    color: '#A5B4FC',
    textAlign: 'center',
    lineHeight: 16,
  },

  subscribeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FCD34D',
    paddingVertical: 18,
    borderRadius: 16,
    marginBottom: 14,
    shadowColor: '#FCD34D',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 20,
    elevation: 12,
  },
  subscribeBtnLoading: { opacity: 0.7 },
  subscribeText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F0C2C',
    letterSpacing: 0.3,
  },

  demoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(252,211,77,0.12)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 14,
  },
  demoText: {
    fontSize: 11,
    color: '#FCD34D',
    fontWeight: '700',
    flex: 1,
  },

  restoreBtn: {
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 18,
  },
  restoreText: {
    fontSize: 13,
    color: '#A5B4FC',
    fontWeight: '700',
    textDecorationLine: 'underline',
  },

  fineprint: {
    fontSize: 10,
    color: '#6B7280',
    lineHeight: 15,
    textAlign: 'center',
  },
  legalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
  },
  legalLink: {
    fontSize: 11,
    color: '#A5B4FC',
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  legalDot: {
    fontSize: 11,
    color: '#6B7280',
  },
});
