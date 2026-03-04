import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Animated, Easing,
  Dimensions, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width: W, height: H } = Dimensions.get('window');

interface Props {
  onFinish: () => void;
}

export default function SplashScreen({ onFinish }: Props) {
  // Animation values
  const bgOpacity    = useRef(new Animated.Value(0)).current;
  const ringScale1   = useRef(new Animated.Value(0.3)).current;
  const ringOpacity1 = useRef(new Animated.Value(0)).current;
  const ringScale2   = useRef(new Animated.Value(0.3)).current;
  const ringOpacity2 = useRef(new Animated.Value(0)).current;
  const ringScale3   = useRef(new Animated.Value(0.3)).current;
  const ringOpacity3 = useRef(new Animated.Value(0)).current;
  const iconScale    = useRef(new Animated.Value(0)).current;
  const iconOpacity  = useRef(new Animated.Value(0)).current;
  const iconRotate   = useRef(new Animated.Value(-0.1)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleY       = useRef(new Animated.Value(20)).current;
  const tagOpacity   = useRef(new Animated.Value(0)).current;
  const tagY         = useRef(new Animated.Value(12)).current;
  const barWidth     = useRef(new Animated.Value(0)).current;
  const barOpacity   = useRef(new Animated.Value(0)).current;
  const dotOpacity1  = useRef(new Animated.Value(0)).current;
  const dotOpacity2  = useRef(new Animated.Value(0)).current;
  const dotOpacity3  = useRef(new Animated.Value(0)).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;
  const byOpacity    = useRef(new Animated.Value(0)).current;
  const byY          = useRef(new Animated.Value(8)).current;

  useEffect(() => {
    const seq = Animated.sequence([
      // 1. Fade in background
      Animated.timing(bgOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),

      // 2. Rings expand outward staggered
      Animated.parallel([
        Animated.timing(ringScale1, { toValue: 1, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(ringOpacity1, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(ringScale2, { toValue: 1, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(ringOpacity2, { toValue: 0.6, duration: 400, useNativeDriver: true }),
        Animated.timing(ringScale3, { toValue: 1, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(ringOpacity3, { toValue: 0.3, duration: 400, useNativeDriver: true }),
      ]),

      // 3. Icon pops in
      Animated.parallel([
        Animated.spring(iconScale, { toValue: 1, tension: 120, friction: 8, useNativeDriver: true }),
        Animated.timing(iconOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(iconRotate, { toValue: 0, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),

      // 4. Title slides up
      Animated.parallel([
        Animated.timing(titleOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(titleY, { toValue: 0, duration: 400, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),

      // 5. Tagline + by Srijan
      Animated.parallel([
        Animated.timing(tagOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.timing(tagY, { toValue: 0, duration: 350, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(byOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.timing(byY, { toValue: 0, duration: 350, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),

      // 6. Loading bar appears and fills
      Animated.timing(barOpacity, { toValue: 1, duration: 200, useNativeDriver: false }),
      Animated.timing(barWidth, { toValue: 1, duration: 1000, easing: Easing.inOut(Easing.cubic), useNativeDriver: false }),

      // 7. Dots pulse in
      Animated.stagger(120, [
        Animated.timing(dotOpacity1, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(dotOpacity2, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(dotOpacity3, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]),

      // 8. Hold
      Animated.delay(300),

      // 9. Fade out entire screen
      Animated.timing(screenOpacity, { toValue: 0, duration: 500, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
    ]);

    seq.start(() => onFinish());
  }, []);

  const spin = iconRotate.interpolate({ inputRange: [-0.1, 0], outputRange: ['-20deg', '0deg'] });
  const loadBarW = barWidth.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <Animated.View style={[styles.root, { opacity: screenOpacity }]}>
      <Animated.View style={[StyleSheet.absoluteFillObject, { opacity: bgOpacity }]}>
        <LinearGradient
          colors={['#060604', '#0a0f05', '#060604']}
          locations={[0, 0.5, 1]}
          style={StyleSheet.absoluteFillObject}
        />
        {/* Subtle grid */}
        {Array.from({ length: 10 }).map((_, i) => (
          <View key={`v${i}`} style={[styles.gridV, { left: (W / 10) * i }]} />
        ))}
        {Array.from({ length: 16 }).map((_, i) => (
          <View key={`h${i}`} style={[styles.gridH, { top: (H / 16) * i }]} />
        ))}
      </Animated.View>

      {/* Rings */}
      <View style={styles.ringCenter} pointerEvents="none">
        <Animated.View style={[styles.ring, styles.ring3, { transform: [{ scale: ringScale3 }], opacity: ringOpacity3 }]} />
        <Animated.View style={[styles.ring, styles.ring2, { transform: [{ scale: ringScale2 }], opacity: ringOpacity2 }]} />
        <Animated.View style={[styles.ring, styles.ring1, { transform: [{ scale: ringScale1 }], opacity: ringOpacity1 }]} />
      </View>

      {/* Center content */}
      <View style={styles.center}>
        {/* Icon */}
        <Animated.View style={[styles.iconWrap, {
          opacity: iconOpacity,
          transform: [{ scale: iconScale }, { rotate: spin }],
        }]}>
          <LinearGradient colors={['#1e2a14', '#0e1a08']} style={styles.iconGrad}>
            <Text style={styles.iconEmoji}>🥦</Text>
          </LinearGradient>
          <View style={styles.iconGlow} />
        </Animated.View>

        {/* Title */}
        <Animated.View style={{ opacity: titleOpacity, transform: [{ translateY: titleY }] }}>
          <Text style={styles.title}>
            <Text style={styles.titleThin}>Fresh</Text>
            <Text style={styles.titleBold}>Scan</Text>
          </Text>
        </Animated.View>

        {/* Tagline */}
        <Animated.View style={{ opacity: tagOpacity, transform: [{ translateY: tagY }], alignItems: 'center' }}>
          <Text style={styles.tagline}>AI Food Freshness Detection</Text>
        </Animated.View>

        {/* By Srijan */}
        <Animated.View style={[styles.byWrap, { opacity: byOpacity, transform: [{ translateY: byY }] }]}>
          
        </Animated.View>
      </View>

      {/* Bottom loading bar */}
      <Animated.View style={[styles.loadBarWrap, { opacity: barOpacity }]}>
        <View style={styles.loadBarTrack}>
          <Animated.View style={[styles.loadBarFill, { width: loadBarW }]}>
            <LinearGradient colors={['#8acc20', '#d4f576', '#8acc20']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFillObject} />
          </Animated.View>
        </View>

        {/* Dots */}
        <View style={styles.dotsRow}>
          <Animated.View style={[styles.dot, { opacity: dotOpacity1 }]} />
          <Animated.View style={[styles.dot, { opacity: dotOpacity2 }]} />
          <Animated.View style={[styles.dot, { opacity: dotOpacity3 }]} />
          <Text style={styles.loadingText}>Initializing AI engine…</Text>
        </View>
      </Animated.View>

      {/* Version bottom right */}
      <Animated.View style={[styles.versionWrap, { opacity: tagOpacity }]}>
        <Text style={styles.versionText}>v2.0</Text>
      </Animated.View>
    </Animated.View>
  );
}

const RING_BASE = 180;
const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFillObject, backgroundColor: '#060604', zIndex: 999, alignItems: 'center', justifyContent: 'center' },

  gridV: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: 'rgba(255,255,255,0.018)' },
  gridH: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: 'rgba(255,255,255,0.018)' },

  ringCenter: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', borderRadius: 999, borderWidth: 1 },
  ring1: { width: RING_BASE, height: RING_BASE, borderColor: 'rgba(212,245,118,0.35)' },
  ring2: { width: RING_BASE * 1.7, height: RING_BASE * 1.7, borderColor: 'rgba(212,245,118,0.18)', borderStyle: 'dashed' },
  ring3: { width: RING_BASE * 2.6, height: RING_BASE * 2.6, borderColor: 'rgba(212,245,118,0.07)' },

  center: { alignItems: 'center', gap: 12 },

  iconWrap: { position: 'relative', marginBottom: 8 },
  iconGrad: { width: 90, height: 90, borderRadius: 26, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'rgba(212,245,118,0.3)' },
  iconEmoji: { fontSize: 40 },
  iconGlow: { position: 'absolute', inset: -12, width: 114, height: 114, borderRadius: 38, backgroundColor: 'rgba(212,245,118,0.06)' },

  title: { fontSize: 52, letterSpacing: -2, lineHeight: 56, textAlign: 'center' },
  titleThin: { color: '#3a4030', fontWeight: '200' },
  titleBold: { color: '#d4f576', fontWeight: '800', fontStyle: 'italic' },

  tagline: { fontSize: 12, color: '#3a4030', letterSpacing: 2, textTransform: 'uppercase' },

  byWrap: { marginTop: 4 },
  byChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(212,245,118,0.05)', borderWidth: 1, borderColor: 'rgba(212,245,118,0.1)', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 5 },
  byText: { fontSize: 11, color: '#3a4030', letterSpacing: 0.5 },
  byName: { fontSize: 11, color: '#d4f576', fontWeight: '800', letterSpacing: 1 },

  loadBarWrap: { position: 'absolute', bottom: Platform.OS === 'ios' ? 60 : 48, left: 40, right: 40, gap: 12 },
  loadBarTrack: { height: 2, backgroundColor: '#1a1c14', borderRadius: 1, overflow: 'hidden' },
  loadBarFill: { height: 2, borderRadius: 1, overflow: 'hidden' },
  dotsRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#d4f576' },
  loadingText: { fontSize: 10, color: '#3a4030', letterSpacing: 1.5 },

  versionWrap: { position: 'absolute', bottom: Platform.OS === 'ios' ? 28 : 20, right: 24 },
  versionText: { fontSize: 9, color: '#2a2c24', letterSpacing: 1 },
});