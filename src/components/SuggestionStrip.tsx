import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Suggestion } from '../utils/suggestions';
import { useTheme, Theme } from '../theme';
import { getItemEmoji } from '../utils/itemIcons';

interface Props {
  suggestions: Suggestion[];
  onAdd: (name: string) => void;
  onDismiss: (name: string) => void;
}

export default function SuggestionStrip({ suggestions, onAdd, onDismiss }: Props) {
  const { Colors, Shadow } = useTheme();
  const styles = useMemo(() => makeStyles(Colors, Shadow), [Colors, Shadow]);
  if (suggestions.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <Ionicons name="bulb" size={14} color={Colors.gradientGlow} />
        <Text style={styles.header}>SMART SUGGESTIONS</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {suggestions.map((s) => (
          <View key={s.name} style={styles.pill}>
            <View style={styles.pillIconBox}>
              <Text style={styles.pillEmoji}>{getItemEmoji(s.name)}</Text>
            </View>
            <View style={styles.pillTextBox}>
              <Text style={styles.pillName} numberOfLines={1}>{s.name}</Text>
              <Text style={styles.pillReason} numberOfLines={1}>{s.reason}</Text>
            </View>
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => onAdd(s.name)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="add" size={18} color={Colors.textWhite} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.dismissBtn}
              onPress={() => onDismiss(s.name)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={13} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const makeStyles = (Colors: Theme['Colors'], Shadow: Theme['Shadow']) => StyleSheet.create({
  wrap: {
    paddingTop: 4,
    paddingBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    marginBottom: 6,
  },
  header: {
    fontSize: 11,
    fontWeight: '900',
    color: Colors.textPrimary,
    letterSpacing: 1.4,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardBg,
    borderRadius: 16,
    paddingLeft: 6,
    paddingRight: 4,
    paddingVertical: 6,
    marginRight: 8,
    ...Shadow.card,
    borderLeftWidth: 3,
    borderLeftColor: Colors.gradientGlow,
    minWidth: 240,
    maxWidth: 280,
  },
  pillIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.warningLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    marginLeft: 4,
  },
  pillEmoji: { fontSize: 18 },
  pillTextBox: { flex: 1 },
  pillName: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  pillReason: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 1,
    fontWeight: '500',
  },
  addBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  dismissBtn: {
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
});
