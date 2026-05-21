import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constellation from './Constellation';

/**
 * Full-screen branded splash. Renders during the brief AsyncStorage warm-up
 * before either OnboardingScreen or the main tabs mount.
 *
 * Uses literal hex values for the midnight aesthetic so it looks identical
 * regardless of the user's light/dark preference — a splash is its own moment.
 */
export default function BrandedLoadingScreen() {
  const logoScale = useRef(new Animated.Value(0.6)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const ringScale = useRef(new Animated.Value(1)).current;
  const ringOpacity = useRef(new Animated.Value(0.5)).current;
  const brandOpacity = useRef(new Animated.Value(0)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const dotAnims = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;

  useEffect(() => {
    // Logo bubble pops in
    Animated.parallel([
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 5,
        tension: 80,
        useNativeDriver: true,
      }),
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Brand wordmark fades in slightly after the logo
    Animated.timing(brandOpacity, {
      toValue: 1,
      duration: 500,
      delay: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    // Tagline fades in last
    Animated.timing(taglineOpacity, {
      toValue: 1,
      duration: 500,
      delay: 480,
      useNativeDriver: true,
    }).start();

    // Continuous radial pulse behind the logo
    const ringLoop = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(ringScale, {
            toValue: 1.5,
            duration: 1800,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(ringScale, {
            toValue: 1,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(ringOpacity, {
            toValue: 0,
            duration: 1800,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(ringOpacity, {
            toValue: 0.5,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      ])
    );
    ringLoop.start();

    // Three loading dots — staggered bounce
    const dotLoops = dotAnims.map((dot, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 180),
          Animated.timing(dot, {
            toValue: 1,
            duration: 450,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 450,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.delay(450),
        ])
      )
    );
    dotLoops.forEach((loop) => loop.start());

    return () => {
      ringLoop.stop();
      dotLoops.forEach((loop) => loop.stop());
    };
  }, [logoScale, logoOpacity, ringScale, ringOpacity, brandOpacity, taglineOpacity, dotAnims]);

  return (
    <View style={styles.container}>
      <Constellation variant="dense" color="#FCD34D" />

      <View style={styles.center}>
        {/* Pulsing radial ring behind the logo */}
        <Animated.View
          style={[
            styles.pulseRing,
            { transform: [{ scale: ringScale }], opacity: ringOpacity },
          ]}
        />

        {/* Amber logo bubble with cart icon */}
        <Animated.View
          style={[
            styles.logoBubble,
            { transform: [{ scale: logoScale }], opacity: logoOpacity },
          ]}
        >
          <Ionicons name="cart" size={60} color="#0F0C2C" />
        </Animated.View>

        {/* Brand wordmark */}
        <Animated.View style={[styles.brandWrap, { opacity: brandOpacity }]}>
          <Text style={styles.brandText}>SHOPMIND</Text>
          <View style={styles.brandUnderline} />
        </Animated.View>

        {/* Tagline */}
        <Animated.Text style={[styles.tagline, { opacity: taglineOpacity }]}>
          Your shopping list, intelligent
        </Animated.Text>
      </View>

      {/* Loading dots */}
      <View style={styles.dotsRow}>
        {dotAnims.map((anim, i) => {
          const translateY = anim.interpolate({
            inputRange: [0, 1],
            outputRange: [0, -10],
          });
          const opacity = anim.interpolate({
            inputRange: [0, 1],
            outputRange: [0.35, 1],
          });
          return (
            <Animated.View
              key={i}
              style={[styles.dot, { transform: [{ translateY }], opacity }]}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0C2C',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 2,
    borderColor: '#FCD34D',
  },
  logoBubble: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: '#FCD34D',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 28,
    shadowColor: '#FCD34D',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.65,
    shadowRadius: 32,
    elevation: 18,
  },
  brandWrap: {
    alignItems: 'center',
  },
  brandText: {
    fontSize: 36,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 8,
  },
  brandUnderline: {
    width: 70,
    height: 3,
    backgroundColor: '#FCD34D',
    borderRadius: 2,
    marginTop: 10,
  },
  tagline: {
    fontSize: 14,
    color: '#A5B4FC',
    fontWeight: '500',
    letterSpacing: 0.6,
    fontStyle: 'italic',
    marginTop: 18,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 10,
    alignSelf: 'center',
    marginBottom: 60,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FCD34D',
  },
});
