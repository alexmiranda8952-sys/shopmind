import React, { useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Animated,
  FlatList,
  ListRenderItemInfo,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, Theme } from '../theme';
import Constellation from '../components/Constellation';

const { width: SCREEN_W } = Dimensions.get('window');

interface Page {
  title: string;
  body: string;
  accent: string;
  iconName: React.ComponentProps<typeof Ionicons>['name'];
}

// Onboarding has its own permanent midnight aesthetic regardless of theme.
const PAGES: Page[] = [
  {
    title: 'Your shopping list,\nremembered forever',
    body: 'Build a master list once. ShopMind keeps it ready — every trip, every store, every time.',
    accent: '#FCD34D',
    iconName: 'bulb',
  },
  {
    title: 'Smart alerts when\nyou\'re near a store',
    body: 'Walk near a grocery store? You\'ll get a heads-up with the exact items they carry from your list — even with the app closed.',
    accent: '#FB923C',
    iconName: 'location',
  },
  {
    title: 'One-tap navigation\nto the best stop',
    body: 'See nearby stores ranked by how much of your list they cover. Plan a multi-stop route. Get door-to-door directions.',
    accent: '#818CF8',
    iconName: 'navigate',
  },
  {
    title: 'Built for the way\nyour brain works',
    body: 'Priority items, templates, voice add, swipe to delete, trip history, streaks. Less friction, more shopping.',
    accent: '#FDA4AF',
    iconName: 'sparkles',
  },
];

interface Props {
  onComplete: () => void;
}

export default function OnboardingScreen({ onComplete }: Props) {
  // Onboarding always uses the dark midnight aesthetic; we pull a fixed palette
  // from useTheme for the few cases where dark color values are needed at render time.
  const { Colors, Shadow } = useTheme();
  const styles = useMemo(() => makeStyles(Colors, Shadow), [Colors, Shadow]);
  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList<Page>>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const handleNext = () => {
    if (index < PAGES.length - 1) {
      const next = index + 1;
      listRef.current?.scrollToIndex({ index: next, animated: true });
      setIndex(next);
    } else {
      onComplete();
    }
  };

  const handleSkip = () => onComplete();

  const renderItem = ({ item, index: idx }: ListRenderItemInfo<Page>) => {
    const inputRange = [(idx - 1) * SCREEN_W, idx * SCREEN_W, (idx + 1) * SCREEN_W];
    const cardScale = scrollX.interpolate({
      inputRange,
      outputRange: [0.85, 1, 0.85],
      extrapolate: 'clamp',
    });
    const cardOpacity = scrollX.interpolate({
      inputRange,
      outputRange: [0.3, 1, 0.3],
      extrapolate: 'clamp',
    });
    const emojiRotate = scrollX.interpolate({
      inputRange,
      outputRange: ['-12deg', '0deg', '12deg'],
      extrapolate: 'clamp',
    });

    return (
      <View style={styles.page}>
        <Animated.View
          style={[
            styles.iconBubble,
            {
              backgroundColor: item.accent,
              transform: [{ scale: cardScale }, { rotate: emojiRotate }],
              opacity: cardOpacity,
            },
          ]}
        >
          <Ionicons name={item.iconName} size={88} color="#0F0C2C" />
        </Animated.View>

        <Animated.View
          style={[
            styles.textBlock,
            { opacity: cardOpacity, transform: [{ scale: cardScale }] },
          ]}
        >
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.body}>{item.body}</Text>
        </Animated.View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Constellation variant="dense" color="#FCD34D" />

      {/* Skip */}
      <TouchableOpacity style={styles.skipBtn} onPress={handleSkip} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      {/* Pages */}
      <FlatList
        ref={listRef}
        data={PAGES}
        keyExtractor={(_, i) => `page-${i}`}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        onMomentumScrollEnd={(e) => {
          const i = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
          setIndex(i);
        }}
        renderItem={renderItem}
      />

      {/* Footer */}
      <View style={styles.footer}>
        {/* Page dots */}
        <View style={styles.dotsRow}>
          {PAGES.map((_, i) => {
            const inputRange = [(i - 1) * SCREEN_W, i * SCREEN_W, (i + 1) * SCREEN_W];
            const dotWidth = scrollX.interpolate({
              inputRange,
              outputRange: [8, 28, 8],
              extrapolate: 'clamp',
            });
            const dotOpacity = scrollX.interpolate({
              inputRange,
              outputRange: [0.35, 1, 0.35],
              extrapolate: 'clamp',
            });
            return (
              <Animated.View
                key={`dot-${i}`}
                style={[styles.dot, { width: dotWidth, opacity: dotOpacity }]}
              />
            );
          })}
        </View>

        <TouchableOpacity
          style={styles.nextBtn}
          onPress={handleNext}
          activeOpacity={0.85}
        >
          <Text style={styles.nextText}>
            {index === PAGES.length - 1 ? "Let's start" : 'Next'}
          </Text>
          <Ionicons
            name={index === PAGES.length - 1 ? 'sparkles' : 'arrow-forward'}
            size={20}
            color="#0F0C2C"
          />
        </TouchableOpacity>
      </View>

      <View style={styles.brand}>
        <Text style={styles.brandText}>SHOPMIND</Text>
      </View>
    </View>
  );
}

const makeStyles = (Colors: Theme['Colors'], Shadow: Theme['Shadow']) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0C2C',
  },
  skipBtn: {
    position: 'absolute',
    top: 60,
    right: 24,
    zIndex: 10,
  },
  skipText: {
    color: '#FAF7F2',
    fontSize: 14,
    fontWeight: '700',
    opacity: 0.6,
    letterSpacing: 0.3,
  },
  page: {
    width: SCREEN_W,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingTop: 60,
  },
  iconBubble: {
    width: 180,
    height: 180,
    borderRadius: 90,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 50,
    ...Shadow.glow,
    shadowOpacity: 0.6,
    shadowRadius: 30,
  },
  textBlock: {
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: Colors.textWhite,
    letterSpacing: -0.6,
    textAlign: 'center',
    lineHeight: 34,
    marginBottom: 18,
  },
  body: {
    fontSize: 16,
    color: Colors.gradientGlow,
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: '500',
    maxWidth: 320,
  },
  footer: {
    paddingHorizontal: 32,
    paddingBottom: 56,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 28,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.gradientGlow,
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.gradientGlow,
    paddingVertical: 16,
    borderRadius: 32,
    gap: 10,
    ...Shadow.cardElevated,
    shadowColor: Colors.gradientGlow,
    shadowOpacity: 0.6,
    shadowRadius: 20,
  },
  nextText: {
    fontSize: 17,
    color: '#0F0C2C',
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  brand: {
    position: 'absolute',
    top: 60,
    left: 24,
  },
  brandText: {
    color: Colors.gradientGlow,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 4,
  },
});
