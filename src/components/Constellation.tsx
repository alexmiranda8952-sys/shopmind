import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Colors } from '../theme';

interface Props {
  variant?: 'dense' | 'sparse';
  // Optional override of color for star dots
  color?: string;
}

// Hand-tuned star positions (% based) for a decorative night-sky feel
// behind hero cards. Pure absolute Views — zero perf cost.
const DENSE_STARS = [
  { left: '8%',  top: '14%', size: 2.5 },
  { left: '18%', top: '62%', size: 1.5 },
  { left: '28%', top: '30%', size: 2.5 },
  { left: '40%', top: '78%', size: 1.8 },
  { left: '52%', top: '20%', size: 2.5 },
  { left: '63%', top: '55%', size: 1.8 },
  { left: '75%', top: '12%', size: 2.5 },
  { left: '82%', top: '40%', size: 1.5 },
  { left: '90%', top: '70%', size: 2 },
  { left: '95%', top: '22%', size: 1.5 },
  { left: '35%', top: '50%', size: 1.5 },
  { left: '70%', top: '85%', size: 2 },
];

const SPARSE_STARS = [
  { left: '10%', top: '20%', size: 2.5 },
  { left: '32%', top: '70%', size: 1.8 },
  { left: '55%', top: '30%', size: 2 },
  { left: '78%', top: '60%', size: 1.5 },
  { left: '90%', top: '18%', size: 2.5 },
];

export default function Constellation({ variant = 'dense', color }: Props) {
  const stars = variant === 'dense' ? DENSE_STARS : SPARSE_STARS;
  const dotColor = color || Colors.gradientGlow;

  return (
    <View pointerEvents="none" style={styles.layer}>
      {stars.map((s, idx) => (
        <View
          key={idx}
          style={{
            position: 'absolute',
            left: s.left as any,
            top: s.top as any,
            width: s.size * 2,
            height: s.size * 2,
            borderRadius: s.size,
            backgroundColor: dotColor,
            opacity: 0.55,
            shadowColor: dotColor,
            shadowOpacity: 0.8,
            shadowRadius: s.size * 1.5,
            elevation: 2,
          }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    borderRadius: 28,
  },
});
