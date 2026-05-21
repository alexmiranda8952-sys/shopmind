import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import {
  SubscriptionState,
  getSubscriptionState,
  purchasePremium,
  restorePurchases,
  cancelDemoSubscription,
  isDemoMode,
} from '../services/subscriptionService';

/**
 * Premium feature flags. Used to gate features behind the subscription.
 * Add new keys here when you introduce a new premium feature.
 */
export type PremiumFeature =
  | 'multipleLists'      // Multiple named lists (free tier: 1 list, 50 items)
  | 'unlimitedItems'     // No 50-item cap on the free list
  | 'multiStopRoute'     // Optimal multi-stop route planner on the Map screen
  | 'aiAssistant'        // Natural-language list builder
  | 'barcodeScanner'     // Scan to add
  | 'receiptOCR'         // Receipt-photo import
  | 'pantryTracking'     // Pantry inventory + expiration alerts
  | 'priceCharts'        // Price-history line charts
  | 'achievements'       // Badges & gamification
  | 'fullHistory';       // Trip history beyond the last 30 days

interface SubscriptionContextValue {
  state: SubscriptionState;
  isPremium: boolean;
  isLoading: boolean;
  has: (feature: PremiumFeature) => boolean;
  purchase: () => Promise<{ ok: boolean; error?: string }>;
  restore: () => Promise<{ ok: boolean; restored: boolean }>;
  cancel: () => Promise<void>;
  refresh: () => Promise<void>;
  demoMode: boolean;
  // Global paywall visibility — call openPaywall() from any screen
  paywallVisible: boolean;
  openPaywall: () => void;
  closePaywall: () => void;
}

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SubscriptionState>({
    active: false,
    source: 'free',
    startedAt: null,
    renewsAt: null,
    verifiedAt: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [paywallVisible, setPaywallVisible] = useState(false);

  const openPaywall = useCallback(() => setPaywallVisible(true), []);
  const closePaywall = useCallback(() => setPaywallVisible(false), []);

  const refresh = useCallback(async () => {
    const fresh = await getSubscriptionState();
    setState(fresh);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const purchase = useCallback(async () => {
    const result = await purchasePremium();
    if (result.ok) await refresh();
    return result;
  }, [refresh]);

  const restore = useCallback(async () => {
    const result = await restorePurchases();
    if (result.ok) await refresh();
    return result;
  }, [refresh]);

  const cancel = useCallback(async () => {
    await cancelDemoSubscription();
    await refresh();
  }, [refresh]);

  const isPremium = state.active;

  const has = useCallback(
    (_feature: PremiumFeature): boolean => {
      // Subscription-required model: anyone past the gate is a subscriber,
      // so every feature is unlocked. Kept as a hook for forward compat
      // in case we ever introduce free-trial limits or feature flags.
      return isPremium;
    },
    [isPremium]
  );

  const value: SubscriptionContextValue = {
    state,
    isPremium,
    isLoading,
    has,
    purchase,
    restore,
    cancel,
    refresh,
    demoMode: isDemoMode(),
    paywallVisible,
    openPaywall,
    closePaywall,
  };

  return (
    <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>
  );
}

export function useSubscription(): SubscriptionContextValue {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) throw new Error('useSubscription must be used within SubscriptionProvider');
  return ctx;
}
