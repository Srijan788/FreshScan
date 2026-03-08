import SplashScreen from './SplashScreen';
import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image,
  ScrollView, ActivityIndicator, Alert, Platform,
  Animated, Dimensions, Easing, Linking,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const API_URL = 'https://freshscan-api-v38s.onrender.com/analyze';
const NUTRITION_URL = 'https://freshscan-api-v38s.onrender.com/nutrition';

const VERDICT_CONFIG: any = {
  fresh: {
    color: '#4ade80', bg: 'rgba(74,222,128,0.08)', border: 'rgba(74,222,128,0.25)',
    icon: '✦', label: 'FRESH', grade: 'A',
    gradient: ['rgba(74,222,128,0.10)', 'rgba(74,222,128,0.01)'],
  },
  okay: {
    color: '#fbbf24', bg: 'rgba(251,191,36,0.08)', border: 'rgba(251,191,36,0.25)',
    icon: '◈', label: 'OKAY', grade: 'B',
    gradient: ['rgba(251,191,36,0.10)', 'rgba(251,191,36,0.01)'],
  },
  avoid: {
    color: '#f87171', bg: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.25)',
    icon: '⊘', label: 'AVOID', grade: 'F',
    gradient: ['rgba(248,113,113,0.10)', 'rgba(248,113,113,0.01)'],
  },
};

// ── Nutrition bar ───────────────────────────────────────────────────────────
function NutritionBar({ value, max, color }: { value: number; max: number; color: string }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: Math.min(value / max, 1),
      duration: 800,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [value]);
  const width = anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  return (
    <View style={nStyles.barBg}>
      <Animated.View style={[nStyles.barFill, { width, backgroundColor: color }]} />
    </View>
  );
}

const nStyles = StyleSheet.create({
  barBg: { flex: 1, height: 4, backgroundColor: '#1a1c14', borderRadius: 2, overflow: 'hidden' },
  barFill: { height: 4, borderRadius: 2 },
});

// ── Animated scan line ──────────────────────────────────────────────────────
function ScanLine() {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();
  }, []);
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, 290] });
  return (
    <Animated.View style={[styles.scanLineWrap, { transform: [{ translateY }] }]} pointerEvents="none">
      <LinearGradient colors={['transparent', '#d4f576', '#d4f576', 'transparent']} style={styles.scanLine} />
    </Animated.View>
  );
}

// ── Fade-in wrapper ─────────────────────────────────────────────────────────
function FadeIn({ children, delay = 0 }: any) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(16)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 500, delay, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 500, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, []);
  return <Animated.View style={{ opacity, transform: [{ translateY }] }}>{children}</Animated.View>;
}

// ── Pulse dot ───────────────────────────────────────────────────────────────
function PulseDot() {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.6)).current;
  useEffect(() => {
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(scale, { toValue: 1.5, duration: 900, useNativeDriver: true }),
          Animated.timing(scale, { toValue: 1, duration: 900, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(opacity, { toValue: 1, duration: 900, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.4, duration: 900, useNativeDriver: true }),
        ]),
      ])
    ).start();
  }, []);
  return (
    <View style={styles.pulseDotWrap}>
      <Animated.View style={[styles.pulseDotOuter, { transform: [{ scale }], opacity }]} />
      <View style={styles.pulseDotInner} />
    </View>
  );
}

// ── Nutrition Card Component ─────────────────────────────────────────────────
function NutritionCard({ nutrition, loading }: { nutrition: any; loading: boolean }) {
  if (loading) {
    return (
      <View style={styles.nutritionCard}>
        <View style={styles.nutritionHeader}>
          <Text style={styles.sectionLabel}>NUTRITION ESTIMATE</Text>
          <View style={styles.nutritionAiBadge}>
            <Text style={styles.nutritionAiBadgeText}>AI</Text>
          </View>
        </View>
        <View style={styles.nutritionLoading}>
          <ActivityIndicator color="#d4f576" size="small" />
          <Text style={styles.nutritionLoadingText}>Estimating nutrition…</Text>
        </View>
      </View>
    );
  }

  if (!nutrition) return null;

  const macros = [
    { label: 'Calories', value: nutrition.calories, unit: 'kcal', color: '#d4f576', max: 800 },
    { label: 'Protein',  value: nutrition.protein,  unit: 'g',    color: '#4ade80', max: 50  },
    { label: 'Carbs',    value: nutrition.carbs,     unit: 'g',    color: '#60a5fa', max: 100 },
    { label: 'Fat',      value: nutrition.fat,       unit: 'g',    color: '#fb923c', max: 50  },
    { label: 'Fiber',    value: nutrition.fiber,     unit: 'g',    color: '#a78bfa', max: 20  },
  ];

  return (
    <FadeIn delay={0}>
      <View style={styles.nutritionCard}>
        <View style={styles.nutritionHeader}>
          <View>
            <Text style={styles.sectionLabel}>NUTRITION ESTIMATE</Text>
            <Text style={styles.nutritionFoodName}>{nutrition.food_name}</Text>
          </View>
          <View style={styles.nutritionAiBadge}>
            <Text style={styles.nutritionAiBadgeText}>AI</Text>
          </View>
        </View>

        {/* Calorie highlight */}
        <View style={styles.calorieHighlight}>
          <LinearGradient colors={['rgba(212,245,118,0.08)', 'rgba(212,245,118,0.02)']} style={styles.calorieGrad}>
            <Text style={styles.calorieNum}>{nutrition.calories}</Text>
            <View>
              <Text style={styles.calorieUnit}>kcal</Text>
              <Text style={styles.calorieLabel}>per 100g</Text>
            </View>
          </LinearGradient>
        </View>

        {/* Macro bars */}
        <View style={styles.macroList}>
          {macros.slice(1).map((m, i) => (
            <View key={i} style={styles.macroRow}>
              <Text style={styles.macroLabel}>{m.label}</Text>
              <NutritionBar value={m.value} max={m.max} color={m.color} />
              <Text style={[styles.macroValue, { color: m.color }]}>{m.value}{m.unit}</Text>
            </View>
          ))}
        </View>

        {/* Vitamins / minerals */}
        {nutrition.highlights && nutrition.highlights.length > 0 && (
          <View style={styles.nutritionHighlights}>
            <Text style={styles.sectionLabel}>RICH IN</Text>
            <View style={styles.tagsWrap}>
              {nutrition.highlights.map((h: string, i: number) => (
                <View key={i} style={styles.nutritionTag}>
                  <Text style={styles.nutritionTagText}>✦ {h}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <Text style={styles.nutritionDisclaimer}>* Estimated values per 100g serving</Text>
      </View>
    </FadeIn>
  );
}

// ── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [imageUri, setImageUri]       = useState<string | null>(null);
  const [imageB64, setImageB64]       = useState<string | null>(null);
  const [result, setResult]           = useState<any>(null);
  const [loading, setLoading]         = useState(false);
  const [history, setHistory]         = useState<any[]>([]);
  const [nutrition, setNutrition]     = useState<any>(null);
  const [nutritionLoading, setNutritionLoading] = useState(false);
  const [splashDone, setSplashDone] = useState(false);
  const [kidsMode, setKidsMode] = useState(false);

  // Fetch nutrition from Claude API based on food summary
  const fetchNutrition = useCallback(async (summary: string, tags: string[]) => {
    setNutritionLoading(true);
    setNutrition(null);
    try {
      const res = await fetch(NUTRITION_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ summary, tags }),
      });

      if (!res.ok) throw new Error(`API error ${res.status}`);

      const data = await res.json();
      setNutrition(data);
    } catch (e: any) {
      console.error('Nutrition fetch failed:', e.message);
      setNutrition({
        food_name: 'Unavailable',
        calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0,
        highlights: ['Could not estimate nutrition'],
        error: true,
      });
    } finally {
      setNutritionLoading(false);
    }
  }, []);

  const pickImage = useCallback(async (source: string) => {
    const permFn = source === 'camera'
      ? ImagePicker.requestCameraPermissionsAsync
      : ImagePicker.requestMediaLibraryPermissionsAsync;
    const { status } = await permFn();
    if (status !== 'granted') {
      Alert.alert('Permission needed', `Please allow ${source} access in settings.`);
      return;
    }
    const launchFn = source === 'camera'
      ? ImagePicker.launchCameraAsync
      : ImagePicker.launchImageLibraryAsync;
    const picked = await launchFn({
      mediaTypes: ['images'],
      quality: 0.1,
      base64: false,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!picked.canceled && picked.assets[0]) {
      const uri = picked.assets[0].uri;
      const res = await fetch(uri);
      const blob = await res.blob();
      const base64: string = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(blob);
      });
      setImageUri(uri);
      setImageB64(base64);
      setResult(null);
      setNutrition(null);
    }
  }, []);

  const analyze = useCallback(async () => {
    if (!imageB64) return;
    setLoading(true);
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_base64: imageB64, media_type: 'image/jpeg' }),
      });
      if (!response.ok) throw new Error(`Server error ${response.status}`);
      const data = await response.json();
      setResult(data);
      setHistory((prev: any[]) => [
        { uri: imageUri, verdict: data.verdict, id: Date.now() }, ...prev.slice(0, 4)
      ]);
      // Fetch nutrition in parallel after result
      fetchNutrition(data.summary || '', data.tags || []);
    } catch (err: any) {
      Alert.alert('Analysis failed', err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }, [imageB64, imageUri, fetchNutrition]);

  const reset = useCallback(() => {
    setImageUri(null);
    setImageB64(null);
    setResult(null);
    setNutrition(null);
  }, []);

  const config = result ? VERDICT_CONFIG[result.verdict] : null;

  return (
    <View style={styles.root}>
      {!splashDone && <SplashScreen onFinish={() => setSplashDone(true)} />}
      <StatusBar style="light" />

      <View style={styles.bgGrid} pointerEvents="none">
        {Array.from({ length: 8 }).map((_, i) => (
          <View key={i} style={[styles.bgGridLine, { left: (SCREEN_WIDTH / 8) * i }]} />
        ))}
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>

        {/* ── HEADER ── */}
        <FadeIn delay={0}>
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <View style={styles.logoChip}>
                <PulseDot />
                <Text style={styles.logoChipText}>LIVE ANALYSIS</Text>
              </View>
              <View style={styles.versionChip}>
                <Text style={styles.versionText}>v2.0</Text>
              </View>
            <TouchableOpacity
               style={[styles.kidsModeBtn, kidsMode && styles.kidsModeBtnActive]}
               onPress={() => setKidsMode(!kidsMode)}
               activeOpacity={0.8}>
               <Text style={styles.kidsModeIcon}>👶</Text>
               <Text style={[styles.kidsModeTxt, kidsMode && styles.kidsModeTxtActive]}>
                 {kidsMode ? 'KIDS ON' : 'KIDS'}
               </Text>
             </TouchableOpacity>
            </View>
            <Text style={styles.title}>
              <Text style={styles.titleThin}>Fresh</Text>
              <Text style={styles.titleBold}>Scan</Text>
            </Text>
            <View style={styles.titleUnderline} />
            <Text style={styles.subtitle}>AI-powered food freshness{'\n'}detection in seconds</Text>
           
          </View>
        </FadeIn>

        {/* ── UPLOAD ZONE ── */}
        {!imageUri ? (
          <FadeIn delay={120}>
            <View style={styles.uploadZone}>
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />
              <View style={styles.uploadIconWrap}>
                <LinearGradient colors={['#1e2a14', '#111a0a']} style={styles.uploadIconGrad}>
                  <Text style={styles.uploadEmoji}>🥦</Text>
                </LinearGradient>
                <View style={styles.uploadIconRing} />
              </View>
              <Text style={styles.uploadTitle}>Drop a food photo</Text>
              <Text style={styles.uploadHint}>Camera · Library · Any format</Text>
              <View style={styles.dividerRow}>
                <View style={styles.divider} />
                <Text style={styles.dividerText}>SELECT SOURCE</Text>
                <View style={styles.divider} />
              </View>
              <View style={styles.pickRow}>
                <TouchableOpacity style={styles.pickBtn} onPress={() => pickImage('camera')} activeOpacity={0.75}>
                  <LinearGradient colors={['#1a2410', '#111808']} style={styles.pickBtnGrad}>
                    <View style={styles.pickBtnIcon}>
                      <Ionicons name="camera-outline" size={22} color="#d4f576" />
                    </View>
                    <Text style={styles.pickBtnText}>Camera</Text>
                    <Text style={styles.pickBtnSub}>Take photo</Text>
                  </LinearGradient>
                </TouchableOpacity>
                <TouchableOpacity style={styles.pickBtn} onPress={() => pickImage('library')} activeOpacity={0.75}>
                  <LinearGradient colors={['#1a2410', '#111808']} style={styles.pickBtnGrad}>
                    <View style={styles.pickBtnIcon}>
                      <Ionicons name="images-outline" size={22} color="#d4f576" />
                    </View>
                    <Text style={styles.pickBtnText}>Library</Text>
                    <Text style={styles.pickBtnSub}>Browse files</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </FadeIn>
        ) : (
          <FadeIn delay={0}>
            <View style={styles.previewWrap}>
              <Image source={{ uri: imageUri }} style={styles.previewImg} />
              <LinearGradient colors={['rgba(6,6,4,0)', 'rgba(6,6,4,0.7)']} style={styles.previewOverlay} />
              {loading && <ScanLine />}
              {loading && (
                <View style={styles.scanBadge}>
                  <View style={styles.scanBadgeDot} />
                  <Text style={styles.scanBadgeText}>ANALYZING</Text>
                </View>
              )}
              <TouchableOpacity style={styles.clearBtn} onPress={reset} activeOpacity={0.8}>
                <Ionicons name="close" size={16} color="#fff" />
              </TouchableOpacity>
              <View style={[styles.previewCorner, styles.previewCornerTL]} />
              <View style={[styles.previewCorner, styles.previewCornerTR]} />
            </View>
          </FadeIn>
        )}

        {/* ── ANALYZE BUTTON ── */}
        {imageUri && !result && (
          <FadeIn delay={80}>
            <TouchableOpacity
              style={[styles.analyzeBtn, loading && styles.analyzeBtnLoading]}
              onPress={analyze} disabled={loading} activeOpacity={0.85}>
              {loading ? (
                <LinearGradient colors={['#141c0e', '#0e1408']} style={styles.analyzeBtnInner}>
                  <ActivityIndicator color="#d4f576" size="small" />
                  <Text style={styles.analyzeBtnTextLoading}>Processing image…</Text>
                </LinearGradient>
              ) : (
                <LinearGradient colors={['#d4f576', '#b8df50']} style={styles.analyzeBtnInner}>
                  <Ionicons name="flash" size={18} color="#0a0f05" />
                  <Text style={styles.analyzeBtnText}>Analyze Freshness</Text>
                </LinearGradient>
              )}
            </TouchableOpacity>
          </FadeIn>
        )}

        {/* ── RESULT CARD ── */}
        {result && kidsMode && (
  <FadeIn delay={0}>
    <View style={styles.kidsCard}>
      <Text style={styles.kidsEmoji}>
        {result.verdict === 'fresh' ? '😋' : result.verdict === 'okay' ? '⚠️' : '🙅'}
      </Text>
      <Text style={styles.kidsVerdict}>
        {result.verdict === 'fresh' ? 'Yummy!' : result.verdict === 'okay' ? 'Be Careful!' : 'No No!'}
      </Text>
      <Text style={styles.kidsMsg}>
        {result.verdict === 'fresh'
          ? 'This food looks super fresh and healthy! Go ahead! 🌟'
          : result.verdict === 'okay'
          ? 'This food is okay but not the best. Eat a little! 🌈'
          : 'This food does not look good. Ask a grown-up! 🚫'}
      </Text>
      <View style={styles.kidsStars}>
        {Array.from({ length: result.verdict === 'fresh' ? 5 : result.verdict === 'okay' ? 3 : 1 }).map((_, i) => (
          <Text key={i} style={styles.kidsStar}>⭐</Text>
        ))}
      </View>
    </View>
  </FadeIn>
)}
        {result && config && (
          <FadeIn delay={0}>
            <View style={styles.resultCard}>
              <LinearGradient colors={config.gradient} style={StyleSheet.absoluteFillObject} />
              <View style={styles.resultTop}>
                <View style={[styles.gradeCircle, { borderColor: config.border }]}>
                  <Text style={[styles.gradeText, { color: config.color }]}>{config.grade}</Text>
                </View>
                <View style={styles.resultTopInfo}>
                  <View style={[styles.verdictChip, { backgroundColor: config.bg, borderColor: config.border }]}>
                    <Text style={[styles.verdictIcon, { color: config.color }]}>{config.icon}</Text>
                    <Text style={[styles.verdictLabel, { color: config.color }]}>{config.label}</Text>
                  </View>
                  <View style={styles.confidenceRow}>
                    <Text style={styles.confidenceNum}>{result.confidence}</Text>
                    <Text style={styles.confidencePct}>%</Text>
                    <Text style={styles.confidenceLabel}> confidence</Text>
                  </View>
                </View>
              </View>
              <View style={[styles.resultDivider, { backgroundColor: config.border }]} />
              <View style={styles.resultSection}>
                <Text style={styles.sectionLabel}>ANALYSIS</Text>
                <Text style={styles.resultSummary}>{result.summary}</Text>
              </View>
              {result.tags && result.tags.length > 0 && (
                <View style={styles.resultSection}>
                  <Text style={styles.sectionLabel}>DETECTED INDICATORS</Text>
                  <View style={styles.tagsWrap}>
                    {result.tags.map((tag: any, i: any) => (
                      <View key={i} style={[styles.tag, { borderColor: config.border }]}>
                        <Text style={[styles.tagText, { color: config.color }]}>◦ {tag}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>
          </FadeIn>
        )}

        {/* ── NUTRITION CARD ── */}
        {(nutritionLoading || nutrition) && (
          <NutritionCard nutrition={nutrition} loading={nutritionLoading} />
        )}

        {/* ── RESCAN BUTTON ── */}
        {result && (
          <FadeIn delay={0}>
            <TouchableOpacity style={styles.rescanBtn} onPress={reset} activeOpacity={0.75}>
              <Ionicons name="refresh-outline" size={15} color="#d4f576" />
              <Text style={styles.rescanBtnText}>Scan Another Item</Text>
            </TouchableOpacity>
          </FadeIn>
        )}

        {/* ── HISTORY ── */}
        {history.length > 0 && (
          <FadeIn delay={0}>
            <View style={styles.historySection}>
              <View style={styles.historySectionHeader}>
                <Text style={styles.sectionLabel}>RECENT SCANS</Text>
                <Text style={styles.historyCount}>{history.length} items</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.historyScroll}>
                {history.map((item: any) => {
                  const hc = VERDICT_CONFIG[item.verdict];
                  return (
                    <View key={item.id} style={styles.historyItem}>
                      <Image source={{ uri: item.uri }} style={styles.historyImg} />
                      <LinearGradient colors={['transparent', 'rgba(6,6,4,0.85)']} style={StyleSheet.absoluteFillObject} />
                      <View style={[styles.historyBadge, { backgroundColor: hc.bg, borderColor: hc.border }]}>
                        <Text style={[styles.historyBadgeText, { color: hc.color }]}>{hc.label}</Text>
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
            </View>
          </FadeIn>
        )}

       {/* ── FOOTER ── */}
        <FadeIn delay={200}>
          <View style={styles.footer}>
            <Text style={styles.footerText}>FreshScan © 2026</Text>
            <View style={styles.footerDot} />
            <TouchableOpacity
              onPress={() => Linking.openURL('https://instagram.com/webzenithh')}
              style={styles.instaBtn}
              activeOpacity={0.75}>
              <LinearGradient
                colors={['#f09433','#e6683c','#dc2743','#cc2366','#bc1888']}
                start={{ x: 0, y: 1 }} end={{ x: 1, y: 0 }}
                style={styles.instaBtnGrad}>
                <Ionicons name="logo-instagram" size={13} color="#fff" />
                <Text style={styles.instaBtnText}>@webzenithh</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </FadeIn>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#060604' },
  scroll: { flex: 1 },
  scrollContent: { paddingTop: Platform.OS === 'ios' ? 64 : 44, paddingHorizontal: 20, paddingBottom: 60 },

  bgGrid: { ...StyleSheet.absoluteFillObject, flexDirection: 'row' },
  bgGridLine: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: 'rgba(255,255,255,0.02)' },

  header: { alignItems: 'center', marginBottom: 40 },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 28 },
  logoChip: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(212,245,118,0.07)', borderWidth: 1, borderColor: 'rgba(212,245,118,0.18)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  logoChipText: { fontSize: 9, color: '#d4f576', letterSpacing: 2, fontWeight: '700' },
  versionChip: { backgroundColor: '#111', borderWidth: 1, borderColor: '#222', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  versionText: { fontSize: 10, color: '#555', letterSpacing: 1 },

  pulseDotWrap: { width: 10, height: 10, alignItems: 'center', justifyContent: 'center' },
  pulseDotOuter: { position: 'absolute', width: 10, height: 10, borderRadius: 5, backgroundColor: '#d4f576' },
  pulseDotInner: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#d4f576' },

  title: { fontSize: 58, letterSpacing: -2, marginBottom: 10, lineHeight: 64 },
  titleThin: { color: '#4a5040', fontWeight: '200' },
  titleBold: { color: '#d4f576', fontWeight: '800', fontStyle: 'italic' },
  titleUnderline: { width: 40, height: 2, backgroundColor: '#d4f576', marginBottom: 16, borderRadius: 1 },
  subtitle: { fontSize: 13, color: '#4a5040', textAlign: 'center', lineHeight: 22, letterSpacing: 0.3 },
  creatorChip: { flexDirection: 'row', alignItems: 'center', marginTop: 12, backgroundColor: 'rgba(212,245,118,0.05)', borderWidth: 1, borderColor: 'rgba(212,245,118,0.12)', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 5 },
  creatorBy: { fontSize: 11, color: '#3a4030', letterSpacing: 0.5 },
  creatorName: { fontSize: 11, color: '#d4f576', fontWeight: '800', letterSpacing: 1 },

  uploadZone: { borderWidth: 1, borderColor: '#1e2018', borderRadius: 24, backgroundColor: '#0c0c0a', padding: 36, alignItems: 'center', marginBottom: 16, position: 'relative' },
  corner: { position: 'absolute', width: 16, height: 16, borderColor: '#d4f576' },
  cornerTL: { top: -1, left: -1, borderTopWidth: 2, borderLeftWidth: 2, borderTopLeftRadius: 24 },
  cornerTR: { top: -1, right: -1, borderTopWidth: 2, borderRightWidth: 2, borderTopRightRadius: 24 },
  cornerBL: { bottom: -1, left: -1, borderBottomWidth: 2, borderLeftWidth: 2, borderBottomLeftRadius: 24 },
  cornerBR: { bottom: -1, right: -1, borderBottomWidth: 2, borderRightWidth: 2, borderBottomRightRadius: 24 },

  uploadIconWrap: { position: 'relative', marginBottom: 20, alignItems: 'center', justifyContent: 'center' },
  uploadIconGrad: { width: 72, height: 72, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#2a3520' },
  uploadIconRing: { position: 'absolute', width: 90, height: 90, borderRadius: 26, borderWidth: 1, borderColor: 'rgba(212,245,118,0.12)', borderStyle: 'dashed' },
  uploadEmoji: { fontSize: 30 },
  uploadTitle: { fontSize: 20, fontWeight: '700', color: '#e8e5dc', marginBottom: 6, letterSpacing: -0.3 },
  uploadHint: { fontSize: 11, color: '#3a3c34', marginBottom: 28, letterSpacing: 0.5 },

  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, width: '100%', marginBottom: 20 },
  divider: { flex: 1, height: 1, backgroundColor: '#1a1c14' },
  dividerText: { fontSize: 9, color: '#3a3c34', letterSpacing: 2 },

  pickRow: { flexDirection: 'row', gap: 12, width: '100%' },
  pickBtn: { flex: 1, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#2a3520' },
  pickBtnGrad: { padding: 18, alignItems: 'center', gap: 8 },
  pickBtnIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(212,245,118,0.08)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(212,245,118,0.15)' },
  pickBtnText: { fontSize: 14, fontWeight: '700', color: '#d4f576', letterSpacing: 0.3 },
  pickBtnSub: { fontSize: 10, color: '#3a4030', letterSpacing: 0.5 },

  previewWrap: { borderRadius: 20, overflow: 'hidden', marginBottom: 16, borderWidth: 1, borderColor: '#1e2018', position: 'relative' },
  previewImg: { width: '100%', height: 300, resizeMode: 'cover' },
  previewOverlay: { ...StyleSheet.absoluteFillObject },
  previewCorner: { position: 'absolute', width: 20, height: 20, borderColor: '#d4f576' },
  previewCornerTL: { top: 12, left: 12, borderTopWidth: 2, borderLeftWidth: 2 },
  previewCornerTR: { top: 12, right: 12, borderTopWidth: 2, borderRightWidth: 2 },

  scanLineWrap: { position: 'absolute', left: 0, right: 0, height: 3, zIndex: 10 },
  scanLine: { height: 3, width: '100%', opacity: 0.8 },

  scanBadge: { position: 'absolute', bottom: 16, left: 16, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(6,6,4,0.75)', borderWidth: 1, borderColor: 'rgba(212,245,118,0.3)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  scanBadgeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#d4f576' },
  scanBadgeText: { fontSize: 9, color: '#d4f576', letterSpacing: 2, fontWeight: '700' },

  clearBtn: { position: 'absolute', top: 12, right: 12, width: 30, height: 30, backgroundColor: 'rgba(6,6,4,0.7)', borderRadius: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },

  analyzeBtn: { borderRadius: 16, overflow: 'hidden', marginBottom: 24 },
  analyzeBtnLoading: { borderWidth: 1, borderColor: '#1e2018' },
  analyzeBtnInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 18 },
  analyzeBtnText: { color: '#0a0f05', fontSize: 16, fontWeight: '800', letterSpacing: 0.3 },
  analyzeBtnTextLoading: { color: '#4a5040', fontSize: 15, fontWeight: '500' },

  resultCard: { borderWidth: 1, borderColor: '#1e2018', borderRadius: 24, overflow: 'hidden', marginBottom: 16, position: 'relative' },
  resultTop: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 24 },
  gradeCircle: { width: 64, height: 64, borderRadius: 32, borderWidth: 2, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(6,6,4,0.6)' },
  gradeText: { fontSize: 28, fontWeight: '900', letterSpacing: -1 },
  resultTopInfo: { flex: 1, gap: 10 },
  verdictChip: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1 },
  verdictIcon: { fontSize: 12 },
  verdictLabel: { fontSize: 12, fontWeight: '800', letterSpacing: 2 },
  confidenceRow: { flexDirection: 'row', alignItems: 'baseline' },
  confidenceNum: { fontSize: 32, fontWeight: '900', color: '#e8e5dc', letterSpacing: -1 },
  confidencePct: { fontSize: 16, fontWeight: '700', color: '#4a5040' },
  confidenceLabel: { fontSize: 11, color: '#3a3c34', letterSpacing: 0.5 },
  resultDivider: { height: 1, marginHorizontal: 24, marginBottom: 20, opacity: 0.4 },
  resultSection: { paddingHorizontal: 24, paddingBottom: 20, gap: 10 },
  sectionLabel: { fontSize: 9, color: '#3a4030', letterSpacing: 2.5, fontWeight: '700' },
  resultSummary: { fontSize: 14, color: '#9a9888', lineHeight: 23, letterSpacing: 0.1 },
  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: 'rgba(6,6,4,0.4)' },
  tagText: { fontSize: 11, fontWeight: '500', letterSpacing: 0.3 },

  // Nutrition card styles
  nutritionCard: { borderWidth: 1, borderColor: '#1e2018', borderRadius: 24, backgroundColor: '#0c0c0a', marginBottom: 16, overflow: 'hidden' },
  nutritionHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', padding: 20, paddingBottom: 16 },
  nutritionFoodName: { fontSize: 18, fontWeight: '700', color: '#e8e5dc', marginTop: 6, letterSpacing: -0.3 },
  nutritionAiBadge: { backgroundColor: 'rgba(212,245,118,0.1)', borderWidth: 1, borderColor: 'rgba(212,245,118,0.2)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  nutritionAiBadgeText: { fontSize: 9, color: '#d4f576', fontWeight: '800', letterSpacing: 1 },
  nutritionLoading: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingBottom: 20 },
  nutritionLoadingText: { fontSize: 13, color: '#3a4030' },

  calorieHighlight: { marginHorizontal: 20, marginBottom: 20, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(212,245,118,0.15)' },
  calorieGrad: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  calorieNum: { fontSize: 48, fontWeight: '900', color: '#d4f576', letterSpacing: -2 },
  calorieUnit: { fontSize: 14, fontWeight: '700', color: '#d4f576', letterSpacing: 0.5 },
  calorieLabel: { fontSize: 10, color: '#3a4030', letterSpacing: 0.5, marginTop: 2 },

  macroList: { paddingHorizontal: 20, gap: 14, marginBottom: 20 },
  macroRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  macroLabel: { fontSize: 11, color: '#4a5040', width: 52, letterSpacing: 0.3 },
  macroValue: { fontSize: 11, fontWeight: '700', width: 40, textAlign: 'right', letterSpacing: 0.3 },

  nutritionHighlights: { paddingHorizontal: 20, paddingBottom: 20, gap: 10 },
  nutritionTag: { backgroundColor: '#111', borderWidth: 1, borderColor: '#1e2018', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  nutritionTagText: { fontSize: 11, color: '#d4f576', letterSpacing: 0.3 },
  nutritionDisclaimer: { fontSize: 9, color: '#2a2c24', textAlign: 'center', paddingBottom: 16, letterSpacing: 0.5 },

  rescanBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, marginBottom: 28, borderWidth: 1, borderColor: '#1e2018', borderRadius: 14, backgroundColor: '#0c0c0a' },
  rescanBtnText: { color: '#d4f576', fontWeight: '600', fontSize: 13, letterSpacing: 0.5 },

  historySection: { marginBottom: 32 },
  historySectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  historyCount: { fontSize: 10, color: '#3a3c34', letterSpacing: 1 },
  historyScroll: { marginHorizontal: -20, paddingHorizontal: 20 },
  historyItem: { width: 88, height: 88, borderRadius: 14, overflow: 'hidden', marginRight: 10, borderWidth: 1, borderColor: '#1e2018' },
  historyImg: { width: '100%', height: '100%' },
  historyBadge: { position: 'absolute', bottom: 6, left: 6, right: 6, borderWidth: 1, borderRadius: 6, paddingVertical: 3, alignItems: 'center' },
  historyBadgeText: { fontSize: 7, fontWeight: '800', letterSpacing: 1.5 },

  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingTop: 8 },
  footerText: { fontSize: 10, color: '#2a2c24', letterSpacing: 0.5 },
  footerName: { fontSize: 10, color: '#d4f576', letterSpacing: 0.5, fontWeight: '700' },
  footerDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#2a2c24' },
  instaBtn: { borderRadius: 999, overflow: 'hidden' },
  instaBtnGrad: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 5 },
  instaBtnText: { fontSize: 10, color: '#fff', fontWeight: '700', letterSpacing: 0.5 },
  kidsModeBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#1a1a14', borderWidth: 1, borderColor: '#2a2c24', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  kidsModeBtnActive: { backgroundColor: 'rgba(255,200,0,0.15)', borderColor: 'rgba(255,200,0,0.5)' },
  kidsModeIcon: { fontSize: 12 },
  kidsModeTxt: { fontSize: 9, color: '#555', letterSpacing: 1, fontWeight: '700' },
  kidsModeTxtActive: { color: '#ffd700' },
  kidsCard: { borderRadius: 24, backgroundColor: '#0f1a08', borderWidth: 2, borderColor: 'rgba(255,200,0,0.3)', padding: 32, alignItems: 'center', marginBottom: 16 },
  kidsEmoji: { fontSize: 80, marginBottom: 16 },
  kidsVerdict: { fontSize: 36, fontWeight: '900', color: '#ffd700', letterSpacing: -1, marginBottom: 12 },
  kidsMsg: { fontSize: 16, color: '#9a9888', textAlign: 'center', lineHeight: 26, marginBottom: 20 },
  kidsStars: { flexDirection: 'row', gap: 4 },
  kidsStar: { fontSize: 24 },  
});