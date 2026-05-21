import React, { useMemo, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Swipeable, RectButton } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { GroceryItem as GroceryItemType } from '../types';
import { useTheme, Theme } from '../theme';
import { getItemEmoji } from '../utils/itemIcons';
import { getCategoryKey } from '../utils/categoryStyle';

interface Props {
  item: GroceryItemType;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onTogglePriority: (id: string) => void;
  onEdit: (item: GroceryItemType) => void;
}

export default function GroceryItem({ item, onToggle, onDelete, onTogglePriority, onEdit }: Props) {
  const { Colors, Shadow, CategoryColors } = useTheme();
  const styles = useMemo(() => makeStyles(Colors, Shadow), [Colors, Shadow]);

  const emoji = getItemEmoji(item.name);
  const catKey = getCategoryKey(item.name);
  const cat = CategoryColors[catKey] || CategoryColors.pantry;
  const isUrgent = !!item.priority && !item.checked;
  const swipeableRef = useRef<Swipeable>(null);

  const renderRightActions = (
    progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>
  ) => {
    const translateX = dragX.interpolate({
      inputRange: [-120, 0],
      outputRange: [0, 80],
      extrapolate: 'clamp',
    });
    const scale = dragX.interpolate({
      inputRange: [-120, -60, 0],
      outputRange: [1, 0.8, 0.6],
      extrapolate: 'clamp',
    });
    return (
      <View style={styles.swipeActionContainer}>
        <RectButton
          style={styles.deleteAction}
          onPress={() => {
            swipeableRef.current?.close();
            setTimeout(() => onDelete(item.id), 120);
          }}
        >
          <Animated.View style={[styles.deleteActionInner, { transform: [{ translateX }, { scale }] }]}>
            <Ionicons name="trash" size={24} color={Colors.textWhite} />
            <Text style={styles.deleteActionText}>Delete</Text>
          </Animated.View>
        </RectButton>
      </View>
    );
  };

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      rightThreshold={48}
      overshootRight={false}
      friction={1.6}
      containerStyle={styles.swipeWrap}
    >
      <TouchableOpacity
        style={[
          styles.container,
          item.checked && styles.containerChecked,
          isUrgent && styles.containerUrgent,
        ]}
        onPress={() => onToggle(item.id)}
        onLongPress={() => onEdit(item)}
        delayLongPress={350}
        activeOpacity={0.8}
      >
        {/* Category color stripe */}
        <View style={[styles.stripe, { backgroundColor: isUrgent ? Colors.urgent : cat.color }]} />

        {/* Emoji icon */}
        <View
          style={[
            styles.iconCircle,
            { backgroundColor: item.checked ? Colors.iconBgChecked : cat.tint },
            isUrgent && { backgroundColor: Colors.urgentLight },
          ]}
        >
          <Text style={styles.emoji}>{emoji}</Text>
        </View>

        {/* Text */}
        <View style={styles.textArea}>
          <View style={styles.nameRow}>
            <Text
              style={[styles.name, item.checked && styles.nameChecked]}
              numberOfLines={1}
            >
              {item.name}
            </Text>
            {(item.boughtCount ?? 0) >= 3 && !item.checked && (
              <View style={styles.frequentBadge}>
                <Text style={styles.frequentText}>★ Frequent</Text>
              </View>
            )}
          </View>
          <View style={styles.metaRow}>
            <Text style={[styles.categoryLabel, { color: isUrgent ? Colors.urgentDark : cat.color }]}>
              {cat.label}
            </Text>
            {!!item.quantity && (
              <>
                <Text style={styles.metaDot}>·</Text>
                <Text style={[styles.quantity, item.checked && styles.quantityChecked]} numberOfLines={1}>
                  {item.quantity}
                </Text>
              </>
            )}
          </View>
        </View>

        {/* Priority star */}
        <TouchableOpacity
          onPress={() => onTogglePriority(item.id)}
          style={styles.starBtn}
          hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
        >
          <Ionicons
            name={item.priority ? 'star' : 'star-outline'}
            size={20}
            color={item.priority ? Colors.urgent : Colors.textMuted}
          />
        </TouchableOpacity>

        {/* Checkbox */}
        <View style={[styles.checkbox, item.checked && styles.checkboxChecked]}>
          {item.checked && <Ionicons name="checkmark" size={16} color={Colors.textWhite} />}
        </View>
      </TouchableOpacity>
    </Swipeable>
  );
}

const makeStyles = (Colors: Theme['Colors'], Shadow: Theme['Shadow']) => StyleSheet.create({
  swipeWrap: {
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 18,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardBg,
    borderRadius: 18,
    paddingVertical: 12,
    paddingRight: 12,
    paddingLeft: 0,
    overflow: 'hidden',
    ...Shadow.card,
  },
  containerChecked: {
    backgroundColor: Colors.cardBgChecked,
    opacity: 0.78,
  },
  containerUrgent: {
    backgroundColor: Colors.cardBgUrgent,
    ...Shadow.cardElevated,
    shadowColor: Colors.urgent,
  },

  stripe: {
    width: 5,
    alignSelf: 'stretch',
    marginRight: 10,
    borderTopRightRadius: 3,
    borderBottomRightRadius: 3,
  },

  iconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  emoji: { fontSize: 24 },

  textArea: {
    flex: 1,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    flexShrink: 1,
  },
  nameChecked: {
    textDecorationLine: 'line-through',
    color: Colors.textChecked,
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  categoryLabel: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metaDot: { fontSize: 12, color: Colors.textMuted, marginHorizontal: 6 },
  quantity: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
    flexShrink: 1,
  },
  quantityChecked: {
    color: Colors.textChecked,
  },
  frequentBadge: {
    backgroundColor: Colors.warningLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  frequentText: {
    fontSize: 9,
    color: Colors.warning,
    fontWeight: '800',
    letterSpacing: 0.3,
  },

  starBtn: { paddingHorizontal: 6 },

  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  checkboxChecked: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },

  swipeActionContainer: {
    width: 100,
    justifyContent: 'center',
    alignItems: 'stretch',
    marginVertical: 4,
    marginRight: 16,
  },
  deleteAction: {
    flex: 1,
    backgroundColor: Colors.urgent,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadow.card,
    shadowColor: Colors.urgent,
  },
  deleteActionInner: {
    alignItems: 'center',
    gap: 2,
  },
  deleteActionText: {
    color: Colors.textWhite,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
