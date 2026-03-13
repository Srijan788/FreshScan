import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Dimensions, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width: W, height: H } = Dimensions.get('window');
interface Props { onFinish: () => void; }

function Particle({ delay, x }: { delay: number; x: number }) {
  const y  = useRef(new Animated.Value(0)).current;
  const op = useRef(new Animated.Value(0)).current;
  const size = 2 + Math.random() * 3;
  useEffect(() => {
    const loop = () => {
      y.setValue(0); op.setValue(0);
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(op, { toValue: 0.8, duration: 400, useNativeDriver: true }),
          Animated.timing(y,  { toValue: -H * 0.55, duration: 2800 + Math.random() * 1400, easing: Easing.linear, useNativeDriver: true }),
        ]),
        Animated.timing(op, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]).start(loop);
    };
    loop();
  }, []);
  return (
    <Animated.View style={{
      position: 'absolute', bottom: H * 0.15, left: x,
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: '#d4f576', opacity: op,
      transform: [{ translateY: y }],
    }} />
  );
}

function HexRing({ scale, spin, opacity }: { scale: Animated.Value; spin: Animated.Value; opacity: Animated.Value }) {
  const rot = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const SIDES = 8;
  return (
    <Animated.View style={{ width: 220, height: 220, alignItems: 'center', justifyContent: 'center', opacity, transform: [{ scale }, { rotate: rot }] }}>
      {Array.from({ length: SIDES }).map((_, i) => {
        const angle = (i / SIDES) * Math.PI * 2;
        const tx = Math.cos(angle) * 100;
        const ty = Math.sin(angle) * 100;
        return (
          <View key={i} style={{
            position: 'absolute', width: 10, height: 10, borderRadius: 2,
            backgroundColor: 'rgba(212,245,118,0.5)',
            transform: [{ translateX: tx }, { translateY: ty }],
          }} />
        );
      })}
      <View style={{ position: 'absolute', width: 200, height: 200, borderRadius: 100, borderWidth: 1, borderColor: 'rgba(212,245,118,0.2)', borderStyle: 'dashed' }} />
    </Animated.View>
  );
}

export default function SplashScreen({ onFinish }: Props) {
  const [percent, setPercent] = useState(0);

  const masterOp   = useRef(new Animated.Value(1)).current;
  const bgOp       = useRef(new Animated.Value(0)).current;
  const orbScale   = useRef(new Animated.Value(0)).current;
  const orbOp      = useRef(new Animated.Value(0)).current;
  const orbPulse   = useRef(new Animated.Value(1)).current;
  const orbGlow    = useRef(new Animated.Value(0)).current;
  const ring1Scale = useRef(new Animated.Value(0)).current;
  const ring1Op    = useRef(new Animated.Value(0)).current;
  const ring2Scale = useRef(new Animated.Value(0)).current;
  const ring2Op    = useRef(new Animated.Value(0)).current;
  const hexScale   = useRef(new Animated.Value(0)).current;
  const hexOp      = useRef(new Animated.Value(0)).current;
  const hexSpin    = useRef(new Animated.Value(0)).current;
  const titleOp    = useRef(new Animated.Value(0)).current;
  const titleY     = useRef(new Animated.Value(30)).current;
  const tagOp      = useRef(new Animated.Value(0)).current;
  const barOp      = useRef(new Animated.Value(0)).current;
  const barW       = useRef(new Animated.Value(0)).current;
  const scanY      = useRef(new Animated.Value(-80)).current;
  const scanOp     = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let pct = 0;
    const pctInterval = setInterval(() => {
      pct += 1; setPercent(pct);
      if (pct >= 100) clearInterval(pctInterval);
    }, 28);

    Animated.loop(
      Animated.timing(hexSpin, { toValue: 1, duration: 8000, easing: Easing.linear, useNativeDriver: true })
    ).start();

    const orbPulseLoop = Animated.loop(Animated.sequence([
      Animated.timing(orbPulse, { toValue: 1.06, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(orbPulse, { toValue: 1,    duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));

    const scanLoop = Animated.loop(Animated.sequence([
      Animated.timing(scanY, { toValue: 80,  duration: 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(scanY, { toValue: -80, duration: 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));

    Animated.sequence([
      Animated.timing(bgOp, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.parallel([
        Animated.spring(orbScale, { toValue: 1, tension: 100, friction: 7, useNativeDriver: true }),
        Animated.timing(orbOp,   { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(orbGlow, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(scanOp,  { toValue: 1, duration: 300, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(ring1Scale, { toValue: 1, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(ring1Op,    { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(ring2Scale, { toValue: 1, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(ring2Op,    { toValue: 1, duration: 400, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.spring(hexScale, { toValue: 1, tension: 80, friction: 8, useNativeDriver: true }),
        Animated.timing(hexOp,   { toValue: 1, duration: 400, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(titleOp, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(titleY,  { toValue: 0, duration: 400, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(tagOp, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(barOp, { toValue: 1, duration: 200, useNativeDriver: false }),
      ]),
      Animated.timing(barW, { toValue: 1, duration: 2200, easing: Easing.inOut(Easing.cubic), useNativeDriver: false }),
      Animated.delay(200),
      Animated.timing(masterOp, { toValue: 0, duration: 500, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
    ]).start(() => {
      clearInterval(pctInterval);
      orbPulseLoop.stop(); scanLoop.stop();
      onFinish();
    });

    orbPulseLoop.start();
    scanLoop.start();

    return () => { clearInterval(pctInterval); };
  }, []);

  const loadBarW = barW.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  const particles = Array.from({ length: 18 }).map((_, i) => ({
    x: (W / 18) * i + Math.random() * 20 - 10,
    delay: Math.random() * 2000,
  }));

  return (
    <Animated.View style={[styles.root, { opacity: masterOp }]}>
      <Animated.View style={[StyleSheet.absoluteFillObject, { opacity: bgOp }]}>
        <LinearGradient colors={['#030403', '#060a04', '#030403']} style={StyleSheet.absoluteFillObject} />
        {Array.from({ length: 12 }).map((_, i) => (
          <View key={`v${i}`} style={[styles.gridV, { left: (W / 12) * i }]} />
        ))}
        {Array.from({ length: 18 }).map((_, i) => (
          <View key={`h${i}`} style={[styles.gridH, { top: (H / 18) * i }]} />
        ))}
      </Animated.View>

      {particles.map((p, i) => <Particle key={i} x={p.x} delay={p.delay} />)}

      <View style={styles.stage}>
        <Animated.View style={[styles.ringOuter, { transform: [{ scale: ring2Scale }], opacity: ring2Op }]} />
        <Animated.View style={[styles.ringMid,   { transform: [{ scale: ring1Scale }], opacity: ring1Op }]} />
        <HexRing scale={hexScale} spin={hexSpin} opacity={hexOp} />

        <Animated.View style={[styles.orbWrap, { opacity: orbOp, transform: [{ scale: Animated.multiply(orbScale, orbPulse) }] }]}>
          <Animated.View style={[styles.orbGlow3, { opacity: orbGlow }]} />
          <Animated.View style={[styles.orbGlow2, { opacity: orbGlow }]} />
          <Animated.View style={[styles.orbGlow1, { opacity: orbGlow }]} />
          <View style={styles.orb}>
            <LinearGradient
              colors={['rgba(212,245,118,0.22)', 'rgba(212,245,118,0.06)', 'rgba(212,245,118,0.16)']}
              style={[StyleSheet.absoluteFillObject, { borderRadius: 90 }]}
            />
            <View style={styles.orbShineTop} />
            <Animated.View style={[styles.orbScanLine, { opacity: scanOp, transform: [{ translateY: scanY }] }]}>
              <LinearGradient colors={['transparent', 'rgba(212,245,118,0.9)', 'transparent']} style={{ height: 2, width: '100%' }} />
            </Animated.View>
            <Text style={styles.orbEmoji}>🥦</Text>
            <View style={[styles.brk, styles.brkTL]} />
            <View style={[styles.brk, styles.brkTR]} />
            <View style={[styles.brk, styles.brkBL]} />
            <View style={[styles.brk, styles.brkBR]} />
          </View>
        </Animated.View>
      </View>

      <View style={styles.textSection}>
        <Animated.View style={{ opacity: titleOp, transform: [{ translateY: titleY }], alignItems: 'center' }}>
          <Text style={styles.title}>
            <Text style={styles.titleThin}>Fresh</Text>
            <Text style={styles.titleBold}>Scan</Text>
          </Text>
          <View style={styles.titleUnderline} />
        </Animated.View>
        <Animated.View style={{ opacity: tagOp, alignItems: 'center' }}>
          <Text style={styles.tagline}>AI · FRESHNESS · NUTRITION · SAFETY</Text>
        </Animated.View>
      </View>

      <Animated.View style={[styles.loadWrap, { opacity: barOp }]}>
        <View style={styles.loadTop}>
          <Text style={styles.loadLabel}>INITIALIZING AI ENGINE</Text>
          <Text style={styles.loadPct}>{percent}%</Text>
        </View>
        <View style={styles.loadTrack}>
          <Animated.View style={[styles.loadFill, { width: loadBarW }]}>
            <LinearGradient colors={['#5a9a00', '#d4f576', '#a0d040']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFillObject} />
            <View style={styles.loadShimmer} />
          </Animated.View>
        </View>
        <View style={styles.statusRow}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>Groq Vision · Neural Engine · Live</Text>
        </View>
      </Animated.View>

      <Animated.View style={[styles.versionWrap, { opacity: tagOp }]}>
        <Text style={styles.versionText}>v2.1</Text>
      </Animated.View>
    </Animated.View>
  );
}

const ORB = 160;
const RING1 = 210;
const RING2 = 290;

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFillObject, backgroundColor: '#030403', zIndex: 999, alignItems: 'center', justifyContent: 'center' },
  gridV: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: 'rgba(255,255,255,0.015)' },
  gridH: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: 'rgba(255,255,255,0.015)' },
  stage: { width: RING2 + 20, height: RING2 + 20, alignItems: 'center', justifyContent: 'center', marginBottom: 32 },
  ringOuter: { position: 'absolute', width: RING2, height: RING2, borderRadius: RING2 / 2, borderWidth: 1, borderColor: 'rgba(212,245,118,0.08)', borderStyle: 'dashed' },
  ringMid: { position: 'absolute', width: RING1, height: RING1, borderRadius: RING1 / 2, borderWidth: 1, borderColor: 'rgba(212,245,118,0.25)' },
  orbWrap: { alignItems: 'center', justifyContent: 'center' },
  orbGlow3: { position: 'absolute', width: ORB + 80, height: ORB + 80, borderRadius: (ORB + 80) / 2, backgroundColor: 'rgba(212,245,118,0.03)' },
  orbGlow2: { position: 'absolute', width: ORB + 44, height: ORB + 44, borderRadius: (ORB + 44) / 2, backgroundColor: 'rgba(212,245,118,0.05)' },
  orbGlow1: { position: 'absolute', width: ORB + 18, height: ORB + 18, borderRadius: (ORB + 18) / 2, backgroundColor: 'rgba(212,245,118,0.09)' },
  orb: { width: ORB, height: ORB, borderRadius: ORB / 2, borderWidth: 1.5, borderColor: 'rgba(212,245,118,0.45)', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: 'rgba(8,14,4,0.7)' },
  orbShineTop: { position: 'absolute', top: 8, left: 24, right: 24, height: 30, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.07)' },
  orbScanLine: { position: 'absolute', left: 0, right: 0 },
  orbEmoji: { fontSize: 52, zIndex: 5 },
  brk: { position: 'absolute', width: 14, height: 14, borderColor: '#d4f576' },
  brkTL: { top: 10, left: 10, borderTopWidth: 2, borderLeftWidth: 2 },
  brkTR: { top: 10, right: 10, borderTopWidth: 2, borderRightWidth: 2 },
  brkBL: { bottom: 10, left: 10, borderBottomWidth: 2, borderLeftWidth: 2 },
  brkBR: { bottom: 10, right: 10, borderBottomWidth: 2, borderRightWidth: 2 },
  textSection: { alignItems: 'center', gap: 12, marginBottom: 52 },
  title: { fontSize: 54, letterSpacing: -2, lineHeight: 58, textAlign: 'center' },
  titleThin: { color: '#2e3828', fontWeight: '200' },
  titleBold: { color: '#d4f576', fontWeight: '900', fontStyle: 'italic' },
  titleUnderline: { width: 36, height: 2, backgroundColor: '#d4f576', borderRadius: 1, marginTop: 8, marginBottom: 4 },
  tagline: { fontSize: 9, color: '#2e3828', letterSpacing: 3, fontWeight: '700' },
  loadWrap: { position: 'absolute', bottom: Platform.OS === 'ios' ? 56 : 44, left: 36, right: 36, gap: 10 },
  loadTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  loadLabel: { fontSize: 8, color: '#2e3828', letterSpacing: 2, fontWeight: '700' },
  loadPct: { fontSize: 11, color: '#d4f576', fontWeight: '900', letterSpacing: 1 },
  loadTrack: { height: 3, backgroundColor: '#141610', borderRadius: 2, overflow: 'hidden' },
  loadFill: { height: 3, borderRadius: 2, overflow: 'hidden', position: 'relative' },
  loadShimmer: { position: 'absolute', top: 0, right: 0, width: 20, height: 3, backgroundColor: 'rgba(255,255,255,0.5)' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#d4f576' },
  statusText: { fontSize: 9, color: '#2e3828', letterSpacing: 1.5 },
  versionWrap: { position: 'absolute', bottom: Platform.OS === 'ios' ? 26 : 18, right: 22 },
  versionText: { fontSize: 9, color: '#1e2018', letterSpacing: 1 },
});