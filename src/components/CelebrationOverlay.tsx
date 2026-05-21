import React, { useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  Pressable,
} from 'react-native';
import { useTheme, Theme } from '../theme';

interface Props {
  visible: boolean;
  itemCount: number;
  onDismiss: () => void;
}

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const PARTICLE_EMOJIS = ['✨', '⭐', '🎉', '🌟', '💫', '🪩'];

interface ParticleSpec {
  emoji: string;
  startX: number;
  endX: number;
  endY: number;
  delay: number;
  rotateEnd: number;
  size: number;
}

function buildParticles(count: number): ParticleSpec[] {
  return Array.from({ length: count }, (_, i) => ({
    emoji: PARTICLE_EMOJIS[i % PARTICLE_EMOJIS.length],
    startX: SCREEN_W / 2 + (Math.random() - 0.5) * 60,
    endX: Math.random() * SCREEN_W,
    endY: SCREEN_H * 0.2 + Math.random() * SCREEN_H * 0.45,
    delay: Math.random() * 250,
    rotateEnd: (Math.random() - 0.5) * 720,
    size: 22 + Math.random() * 16,
  }));
}

function Particle({ spec, particleStyle }: { spec: ParticleSpec; particleStyle: any }) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: 1400,
      delay: spec.delay,
      useNativeDriver: true,
    }).start();
  }, [progress, spec.delay]);

  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, spec.endX - spec.startX],
  });
  const translateY = progress.interpolate({
    inputRange: [0, 0.6, 1],
    outputRange: [SCREEN_H * 0.5, -50, spec.endY - SCREEN_H * 0.5],
  });
  const opacity = progress.interpolate({
    inputRange: [0, 0.1, 0.85, 1],
    outputRange: [0, 1, 1, 0],
  });
  const rotate = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', `${spec.rotateEnd}deg`],
  });
  const scale = progress.interpolate({
    inputRange: [0, 0.2, 1],
    outputRange: [0.3, 1.1, 0.8],
  });

  return (
    <Animated.Text
      style={[
        particleStyle,
        {
          left: spec.startX,
          fontSize: spec.size,
          opacity,
          transform: [{ translateX }, { translateY }, { rotate }, { scale }],
        },
      ]}
    >
      {spec.emoji}
    </Animated.Text>
  );
}

export default function CelebrationOverlay({ visible, itemCount, onDismiss }: Props) {
  const { Colors, Shadow } = useTheme();
  const styles = useMemo(() => makeStyles(Colors, Shadow), [Colors, Shadow]);
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(0.7)).current;
  const particles = useRef<ParticleSpec[]>(buildParticles(24));

  useEffect(() => {
    if (visible) {
      particles.current = buildParticles(24);
      Animated.parallel([
        Animated.timing(cardOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(cardScale, {
          toValue: 1,
          friction: 5,
          tension: 80,
          useNativeDriver: true,
        }),
      ]).start();
      // Auto-dismiss after 3s
      const t = setTimeout(handleDismiss, 3000);
      return () => clearTimeout(t);
    } else {
      cardOpacity.setValue(0);
      cardScale.setValue(0.7);
    }
  }, [visible]);

  const handleDismiss = () => {
    Animated.timing(cardOpacity, {
      toValue: 0,
      duration: 220,
      useNativeDriver: true,
    }).start(() => onDismiss());
  };

  if (!visible) return null;

  return (
    <Pressable style={styles.overlay} onPress={handleDismiss}>
      {/* Particle field */}
      {particles.current.map((p, idx) => (
        <Particle key={idx} spec={p} particleStyle={styles.particle} />
      ))}

      {/* Hero card */}
      <Animated.View
        style={[
          styles.card,
          { opacity: cardOpacity, transform: [{ scale: cardScale }] },
        ]}
      >
        <Text style={styles.bigEmoji}>🎉</Text>
        <Text style={styles.title}>Trip Complete!</Text>
        <Text style={styles.subtitle}>
          You picked up all {itemCount} item{itemCount !== 1 ? 's' : ''}
        </Text>
        <View style={styles.divider} />
        <Text style={styles.hint}>Tap anywhere to dismiss</Text>
      </Animated.View>
    </Pressable>
  );
}

const makeStyles = (Colors: Theme['Colors'], Shadow: Theme['Shadow']) => StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,12,44,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  particle: {
    position: 'absolute',
    top: 0,
  },
  card: {
    backgroundColor: Colors.primaryDark,
    borderRadius: 26,
    paddingHorizontal: 36,
    paddingVertical: 28,
    alignItems: 'center',
    ...Shadow.cardElevated,
    borderWidth: 2,
    borderColor: Colors.gradientGlow,
    minWidth: 280,
  },
  bigEmoji: {
    fontSize: 64,
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: Colors.textWhite,
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.gradientGlow,
    fontWeight: '600',
    textAlign: 'center',
  },
  divider: {
    height: 1,
    width: 80,
    backgroundColor: 'rgba(252,211,77,0.3)',
    marginVertical: 14,
  },
  hint: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});
