import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  Switch,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { getSettings, saveSettings, getGroceryList } from '../services/storageService';
import { requestNotificationPermissions } from '../services/notificationService';
import {
  requestLocationPermissions,
  startBackgroundLocationTracking,
  stopBackgroundLocationTracking,
  isTrackingActive,
} from '../services/locationService';
import {
  isWidgetEnabled,
  setWidgetEnabled,
} from '../services/widgetService';
import { useTheme, Theme, ThemeMode } from '../theme';
import { useSubscription } from '../contexts/SubscriptionContext';
import { PREMIUM_PRICE_LABEL, PREMIUM_BILLING_LABEL } from '../services/subscriptionService';
import { getAnthropicApiKey, setAnthropicApiKey } from '../services/aiAssistantService';
import { GroceryItem } from '../types';
import WidgetPreview from '../components/WidgetPreview';
import { TextInput } from 'react-native';

const THEME_MODES: { value: ThemeMode; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
  { value: 'light', label: 'Light', icon: 'sunny-outline' },
  { value: 'auto',  label: 'Auto',  icon: 'phone-portrait-outline' },
  { value: 'dark',  label: 'Dark',  icon: 'moon-outline' },
];

export default function SettingsScreen() {
  const { Colors, Shadow, mode, setMode, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(Colors, Shadow), [Colors, Shadow]);
  const { state: subState, demoMode } = useSubscription();

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [trackingActive, setTrackingActive] = useState(false);
  const [widgetOn, setWidgetOn] = useState(false);
  const [previewItems, setPreviewItems] = useState<GroceryItem[]>([]);
  const [aiKey, setAiKey] = useState('');
  const [aiKeyEditing, setAiKeyEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadAll = useCallback(async () => {
    const [settings, listItems, widgetState, trackingState, key] = await Promise.all([
      getSettings(),
      getGroceryList(),
      isWidgetEnabled(),
      isTrackingActive(),
      getAnthropicApiKey(),
    ]);
    setNotificationsEnabled(settings.notificationsEnabled);
    setPreviewItems(listItems);
    setWidgetOn(widgetState);
    setTrackingActive(trackingState);
    setAiKey(key);
  }, []);

  const handleSaveAiKey = async () => {
    await setAnthropicApiKey(aiKey);
    setAiKeyEditing(false);
    Alert.alert('Saved', 'Your Claude API key is stored on this device only.');
  };

  const maskedKey = aiKey
    ? aiKey.length > 8
      ? `${aiKey.slice(0, 4)}…${aiKey.slice(-4)}`
      : '••••'
    : '';

  useEffect(() => { loadAll(); }, [loadAll]);
  useFocusEffect(useCallback(() => { loadAll(); }, [loadAll]));

  const handleToggleWidget = async (next: boolean) => {
    if (next) {
      const granted = await requestNotificationPermissions();
      if (!granted) {
        Alert.alert(
          'Notification permission needed',
          'The Live Widget shows up as a persistent notification. Allow notifications to enable it.'
        );
        return;
      }
    }
    setWidgetOn(next);
    await setWidgetEnabled(next, previewItems);
  };

  const handleSave = async () => {
    setSaving(true);
    await saveSettings({
      notificationsEnabled,
    });
    setSaving(false);
    Alert.alert('Saved', 'Your settings have been updated.');
  };

  const handleEnableTracking = async () => {
    const notifGranted = await requestNotificationPermissions();
    if (!notifGranted) {
      Alert.alert('Permission needed', 'Please allow notifications in your device Settings.');
      return;
    }
    const locGranted = await requestLocationPermissions();
    if (!locGranted) {
      Alert.alert(
        'Background location needed',
        'Go to Settings > Privacy > Location Services > ShopMind and choose "Always" to receive store alerts when the app is closed.'
      );
      return;
    }
    await startBackgroundLocationTracking();
    setTrackingActive(true);
    Alert.alert('Tracking Active', "ShopMind will alert you when you're near a grocery store, even when the app is closed.");
  };

  const handleDisableTracking = async () => {
    await stopBackgroundLocationTracking();
    setTrackingActive(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Settings</Text>

        {/* Subscription — always present once past the gate */}
        <View style={styles.section}>
          <View style={styles.premiumCard}>
            <View style={styles.premiumIconBox}>
              <Ionicons name="diamond" size={22} color={Colors.primaryDark} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.premiumLabel}>SHOPMIND SUBSCRIPTION</Text>
              <Text style={styles.premiumStatus}>Active · {PREMIUM_PRICE_LABEL}/{PREMIUM_BILLING_LABEL}</Text>
              {subState.renewsAt && (
                <Text style={styles.premiumRenew}>
                  {demoMode ? 'Demo ends ' : 'Renews '}
                  {new Date(subState.renewsAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </Text>
              )}
            </View>
          </View>
          <Text style={styles.subscriptionHint}>
            Manage or cancel your subscription anytime in your device's
            {Platform.OS === 'ios' ? ' App Store ' : ' Google Play '}
            account settings.
          </Text>
        </View>

        {/* Appearance */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Appearance</Text>
          <Text style={styles.sectionDesc}>
            Pick a theme. "Auto" follows your device's system setting.
          </Text>
          <View style={styles.themeGrid}>
            {THEME_MODES.map((m) => {
              const active = mode === m.value;
              return (
                <TouchableOpacity
                  key={m.value}
                  style={[styles.themeBtn, active && styles.themeBtnActive]}
                  onPress={() => setMode(m.value)}
                  activeOpacity={0.85}
                >
                  <Ionicons
                    name={m.icon}
                    size={22}
                    color={active ? Colors.textWhite : Colors.primary}
                  />
                  <Text style={[styles.themeLabel, active && styles.themeLabelActive]}>
                    {m.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {mode === 'auto' && (
            <View style={styles.autoHint}>
              <Ionicons name="information-circle-outline" size={14} color={Colors.textSecondary} />
              <Text style={styles.autoHintText}>
                Currently rendering in {isDark ? 'dark' : 'light'} mode
              </Text>
            </View>
          )}
        </View>

        {/* AI Assistant */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>AI Assistant</Text>
          <Text style={styles.sectionDesc}>
            Free to use. Get a Google Gemini API key at aistudio.google.com/app/apikey
            (free Google account, no card needed), then paste it below. Your key stays
            on this device and goes straight to Google — never to our servers.
          </Text>
          {aiKeyEditing || !aiKey ? (
            <>
              <TextInput
                style={styles.aiKeyInput}
                placeholder="AIza…"
                placeholderTextColor={Colors.textMuted}
                value={aiKey}
                onChangeText={setAiKey}
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry={!aiKeyEditing}
              />
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity
                  style={styles.aiKeyCancelBtn}
                  onPress={() => {
                    setAiKeyEditing(false);
                    loadAll();
                  }}
                >
                  <Text style={styles.aiKeyCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.aiKeySaveBtn} onPress={handleSaveAiKey}>
                  <Ionicons name="checkmark" size={16} color={Colors.textWhite} />
                  <Text style={styles.aiKeySaveText}>Save key</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <View style={styles.aiKeyRow}>
              <View style={styles.aiKeyIconBox}>
                <Ionicons name="key" size={18} color={Colors.gradientGlow} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.aiKeyLabel}>Key configured</Text>
                <Text style={styles.aiKeyMasked}>{maskedKey}</Text>
              </View>
              <TouchableOpacity
                style={styles.aiKeyEditBtn}
                onPress={() => setAiKeyEditing(true)}
              >
                <Text style={styles.aiKeyEditText}>Edit</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Notifications</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <Text style={styles.rowIcon}>🔔</Text>
                <Text style={styles.rowLabel}>Alert when near a store</Text>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{ false: Colors.separator, true: Colors.primaryLight }}
                thumbColor={notificationsEnabled ? Colors.primary : '#ccc'}
              />
            </View>
          </View>
        </View>

        {/* Live Widget */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Live Widget</Text>
          <Text style={styles.sectionDesc}>
            Pin a persistent notification with your list at a glance. Tap to jump
            back into ShopMind from anywhere.
            {Platform.OS === 'ios' ? '  (iOS shows it in Notification Center; Android pins it permanently.)' : ''}
          </Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <View style={styles.widgetIconBox}>
                  <Ionicons name="apps" size={18} color={Colors.gradientGlow} />
                </View>
                <View>
                  <Text style={styles.rowLabel}>Show live widget</Text>
                  <Text style={styles.rowSubLabel}>Updates as you check items</Text>
                </View>
              </View>
              <Switch
                value={widgetOn}
                onValueChange={handleToggleWidget}
                trackColor={{ false: Colors.separator, true: Colors.primaryLight }}
                thumbColor={widgetOn ? Colors.primary : '#ccc'}
              />
            </View>
          </View>

          {/* Live preview of what the widget looks like */}
          <Text style={styles.widgetPreviewLabel}>PREVIEW</Text>
          <WidgetPreview items={previewItems} />
        </View>

        {/* Background tracking */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Background Tracking</Text>
          <Text style={styles.sectionDesc}>
            Allows ShopMind to alert you even when the app is closed. Battery usage is minimal.
          </Text>
          {trackingActive ? (
            <View style={styles.card}>
              <View style={styles.trackingActiveRow}>
                <Text style={styles.trackingDot}>●</Text>
                <Text style={styles.trackingActiveText}>Tracking is active</Text>
              </View>
              <TouchableOpacity style={styles.stopBtn} onPress={handleDisableTracking}>
                <Text style={styles.stopBtnText}>Stop Background Tracking</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.startBtn} onPress={handleEnableTracking}>
              <Text style={styles.startBtnText}>Enable Background Tracking</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.disabledBtn]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save Settings'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (Colors: Theme['Colors'], Shadow: Theme['Shadow']) => StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: 20, paddingBottom: 50 },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
    marginBottom: 24,
  },
  section: { marginBottom: 8 },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginTop: 20,
    marginBottom: 6,
  },
  sectionDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 10,
  },
  card: {
    backgroundColor: Colors.cardBg,
    borderRadius: 16,
    padding: 14,
    ...Shadow.card,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  rowIcon: { fontSize: 20, marginRight: 10 },
  rowLabel: { fontSize: 16, color: Colors.textPrimary, fontWeight: '600' },
  rowSubLabel: { fontSize: 12, color: Colors.textSecondary, fontWeight: '500', marginTop: 1 },

  // Subscription card
  premiumCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.primaryDark,
    borderRadius: 18,
    padding: 16,
    overflow: 'hidden',
    ...Shadow.cardElevated,
  },
  premiumIconBox: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: Colors.gradientGlow,
    justifyContent: 'center',
    alignItems: 'center',
  },
  premiumLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: Colors.gradientGlow,
    letterSpacing: 1.6,
  },
  premiumStatus: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.textWhite,
    marginTop: 1,
  },
  premiumRenew: {
    fontSize: 11,
    color: Colors.textInverse,
    opacity: 0.75,
    fontWeight: '600',
    marginTop: 2,
  },
  cancelSubBtn: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  cancelSubBtnText: {
    fontSize: 11,
    color: Colors.textInverse,
    fontWeight: '700',
  },
  subscriptionHint: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    fontWeight: '500',
    marginTop: 8,
    paddingHorizontal: 4,
  },
  upgradeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.primaryDark,
    borderRadius: 18,
    padding: 16,
    ...Shadow.cardElevated,
  },
  upgradeIconBox: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: Colors.gradientGlow,
    justifyContent: 'center',
    alignItems: 'center',
  },
  upgradeLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: Colors.gradientGlow,
    letterSpacing: 1.6,
  },
  upgradeTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: Colors.textWhite,
    marginTop: 1,
  },
  upgradeBody: {
    fontSize: 11,
    color: Colors.gradientGlow,
    fontWeight: '600',
    marginTop: 2,
  },
  upgradePricePill: {
    backgroundColor: Colors.gradientGlow,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    alignItems: 'center',
  },
  upgradePrice: {
    fontSize: 14,
    fontWeight: '900',
    color: Colors.primaryDark,
  },
  upgradePriceLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.primaryDark,
    opacity: 0.8,
    marginTop: -2,
  },

  // AI key
  aiKeyInput: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: Colors.textPrimary,
    backgroundColor: Colors.inputBg,
    fontFamily: 'Menlo',
    marginBottom: 10,
  },
  aiKeyCancelBtn: {
    flex: 1, padding: 11, borderRadius: 12,
    borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center',
  },
  aiKeyCancelText: {
    fontSize: 13, color: Colors.textSecondary, fontWeight: '700',
  },
  aiKeySaveBtn: {
    flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    backgroundColor: Colors.primary, padding: 11, borderRadius: 12,
  },
  aiKeySaveText: { fontSize: 13, color: Colors.textWhite, fontWeight: '800' },

  aiKeyRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.cardBg, padding: 12, borderRadius: 14,
    ...Shadow.card,
  },
  aiKeyIconBox: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.primaryDark,
    justifyContent: 'center', alignItems: 'center',
  },
  aiKeyLabel: { fontSize: 13, color: Colors.textPrimary, fontWeight: '700' },
  aiKeyMasked: {
    fontSize: 11, color: Colors.textSecondary, fontFamily: 'Menlo', marginTop: 2,
  },
  aiKeyEditBtn: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
  },
  aiKeyEditText: { fontSize: 11, color: Colors.primary, fontWeight: '800' },

  widgetIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primaryDark,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  widgetPreviewLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: Colors.textSecondary,
    letterSpacing: 1.4,
    marginTop: 14,
    marginBottom: 8,
  },

  themeGrid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  themeBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: Colors.cardBg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    gap: 6,
    ...Shadow.card,
  },
  themeBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  themeLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: 0.3,
  },
  themeLabelActive: {
    color: Colors.textWhite,
  },
  autoHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingHorizontal: 4,
  },
  autoHintText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
    fontStyle: 'italic',
  },

  unitToggleRow: { flexDirection: 'row', gap: 10 },
  unitBtn: {
    flex: 1, paddingVertical: 13, borderRadius: 12,
    backgroundColor: Colors.cardBg, borderWidth: 1.5,
    borderColor: Colors.border, alignItems: 'center', ...Shadow.card,
  },
  unitBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  unitBtnText: { fontSize: 14, fontWeight: '700', color: Colors.textSecondary },
  unitBtnTextActive: { color: Colors.textWhite },
  radiusOptions: { flexDirection: 'row', gap: 10 },
  radiusBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: Colors.cardBg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    ...Shadow.card,
  },
  radiusActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  radiusBtnText: { fontSize: 14, color: Colors.textSecondary, fontWeight: '700' },
  radiusActiveText: { color: Colors.textWhite },
  trackingActiveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  trackingDot: { color: Colors.primary, fontSize: 14, marginRight: 8 },
  trackingActiveText: { fontSize: 15, color: Colors.textPrimary, fontWeight: '600' },
  startBtn: {
    backgroundColor: Colors.primary,
    padding: 15,
    borderRadius: 14,
    alignItems: 'center',
    ...Shadow.card,
  },
  startBtnText: { color: Colors.textWhite, fontWeight: '700', fontSize: 16 },
  stopBtn: {
    backgroundColor: Colors.dangerLight,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  stopBtnText: { color: Colors.danger, fontWeight: '600', fontSize: 15 },
  saveBtn: {
    backgroundColor: Colors.primary,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 32,
    ...Shadow.card,
  },
  disabledBtn: { opacity: 0.4 },
  saveBtnText: { color: Colors.textWhite, fontSize: 16, fontWeight: '800' },
});
