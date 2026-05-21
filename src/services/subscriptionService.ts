import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

/**
 * ShopMind Premium — $9.99/month subscription.
 *
 * Real in-app purchases require:
 *   1. `expo-iap` installed (`npx expo install expo-iap`)
 *   2. A dev client build (not Expo Go)
 *   3. Product IDs configured in App Store Connect / Google Play Console
 *
 * For local development & UI testing, set DEMO_MODE = true. Purchase calls
 * flip a stored flag instead of hitting the real store. Switch to false for
 * production builds.
 */
const DEMO_MODE = true;

const SUBSCRIPTION_KEY = '@shopmind_subscription_state';
const PRODUCT_ID_IOS = 'com.shopmind.app.premium_monthly';
const PRODUCT_ID_ANDROID = 'shopmind_premium_monthly';

export const PREMIUM_PRICE_USD = 9.99;
export const PREMIUM_PRICE_LABEL = '$9.99';
export const PREMIUM_BILLING_LABEL = 'month';

export interface SubscriptionState {
  active: boolean;
  source: 'free' | 'premium-monthly' | 'demo';
  startedAt: number | null;
  renewsAt: number | null;
  // Whether the entitlement was last verified online; in DEMO it's always local.
  verifiedAt: number | null;
}

const DEFAULT_STATE: SubscriptionState = {
  active: false,
  source: 'free',
  startedAt: null,
  renewsAt: null,
  verifiedAt: null,
};

export function getProductId(): string {
  return Platform.OS === 'ios' ? PRODUCT_ID_IOS : PRODUCT_ID_ANDROID;
}

export async function getSubscriptionState(): Promise<SubscriptionState> {
  try {
    const raw = await AsyncStorage.getItem(SUBSCRIPTION_KEY);
    if (!raw) return DEFAULT_STATE;
    const stored = JSON.parse(raw) as SubscriptionState;
    // If renewal date has passed in demo mode, mark as expired
    if (stored.active && stored.renewsAt && stored.renewsAt < Date.now()) {
      const expired = { ...stored, active: false };
      await AsyncStorage.setItem(SUBSCRIPTION_KEY, JSON.stringify(expired));
      return expired;
    }
    return { ...DEFAULT_STATE, ...stored };
  } catch {
    return DEFAULT_STATE;
  }
}

async function saveSubscriptionState(state: SubscriptionState): Promise<void> {
  await AsyncStorage.setItem(SUBSCRIPTION_KEY, JSON.stringify(state));
}

/**
 * Initiates the purchase flow. In DEMO_MODE this just flips the flag locally.
 * In production, swap this body for an `expo-iap` requestSubscription call
 * and validate the receipt before granting entitlement.
 */
export async function purchasePremium(): Promise<{ ok: boolean; error?: string }> {
  if (DEMO_MODE) {
    // Simulate a brief processing delay
    await new Promise((r) => setTimeout(r, 800));
    const now = Date.now();
    const state: SubscriptionState = {
      active: true,
      source: 'demo',
      startedAt: now,
      // 14-day demo window. After this, getSubscriptionState() auto-expires it.
      renewsAt: now + 14 * 24 * 60 * 60 * 1000,
      verifiedAt: now,
    };
    await saveSubscriptionState(state);
    return { ok: true };
  }

  // ─── PRODUCTION PATH (uncomment after installing expo-iap) ──────────────
  // try {
  //   const { initConnection, endConnection, requestSubscription, finishTransaction } =
  //     await import('expo-iap');
  //   await initConnection();
  //   const purchase = await requestSubscription({ sku: getProductId() });
  //   await finishTransaction({ purchase, isConsumable: false });
  //   await endConnection();
  //   const now = Date.now();
  //   await saveSubscriptionState({
  //     active: true,
  //     source: 'premium-monthly',
  //     startedAt: now,
  //     // Real monthly billing — 30 days. Demo windows are 14.
  //     renewsAt: now + 30 * 24 * 60 * 60 * 1000,
  //     verifiedAt: now,
  //   });
  //   return { ok: true };
  // } catch (e: any) {
  //   return { ok: false, error: e.message || 'Purchase failed' };
  // }

  return { ok: false, error: 'IAP not configured. Install expo-iap and set DEMO_MODE=false.' };
}

/**
 * Restores prior purchases. In production this would call expo-iap's
 * getAvailablePurchases() to re-verify entitlements with the store.
 */
export async function restorePurchases(): Promise<{ ok: boolean; restored: boolean }> {
  if (DEMO_MODE) {
    const state = await getSubscriptionState();
    return { ok: true, restored: state.active };
  }
  // Production: call expo-iap.getAvailablePurchases() and re-grant entitlement
  return { ok: true, restored: false };
}

/**
 * Cancels in demo mode (real cancellation must happen in App Store /
 * Play Store settings — apps cannot cancel subscriptions programmatically).
 */
export async function cancelDemoSubscription(): Promise<void> {
  if (!DEMO_MODE) return;
  await saveSubscriptionState(DEFAULT_STATE);
}

export function isDemoMode(): boolean {
  return DEMO_MODE;
}
