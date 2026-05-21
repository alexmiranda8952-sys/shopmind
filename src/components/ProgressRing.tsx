import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Colors } from '../theme';

interface Props {
  size?: number;
  dotSize?: number;
  dotCount?: number;
  progress: number; // 0..1
  color?: string;
  trackColor?: string;
  children?: React.ReactNode;
}

/**
 * A distinctive dotted-ring progress indicator.
 * Renders `dotCount` dots evenly around a circle; "lit" proportion = progress.
 * No SVG needed — pure React Native primitives, glitch-free.
 */
export default function ProgressRing({
  size = 140,
  dotSize = 9,
  dotCount = 20,
  progress,
  color = Colors.primary,
  trackColor = Colors.primaryLight,
  children,
}: Props) {
  const clamped = Math.max(0, Math.min(1, progress));
  const lit = Math.round(clamped * dotCount);
  const radius = size / 2 - dotSize;
  const center = size / 2;

  const dots = [];
  for (let i = 0; i < dotCount; i++) {
    // Start at top, sweep clockwise
    const angle = (i / dotCount) * 2 * Math.PI - Math.PI / 2;
    const x = center + Math.cos(angle) * radius - dotSize / 2;
    const y = center + Math.sin(angle) * radius - dotSize / 2;
    const isLit = i < lit;
    dots.push(
      <View
        key={i}
        style={{
          position: 'absolute',
          left: x,
          top: y,
          width: dotSize,
          height: dotSize,
          borderRadius: dotSize / 2,
          backgroundColor: isLit ? color : trackColor,
          // Lit dots get a small glow effect
          shadowColor: color,
          shadowOpacity: isLit ? 0.6 : 0,
          shadowRadius: isLit ? 4 : 0,
          elevation: isLit ? 2 : 0,
        }}
      />
    );
  }

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      {dots}
      <View style={styles.center}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
