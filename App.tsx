import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image,
  ScrollView, ActivityIndicator, Alert, Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

const API_URL = 'https://freshscan-api-v38s.onrender.com/analyze';

const VERDICT_CONFIG: any = {
  fresh: { color: '#7ece8a', bg: 'rgba(126,206,138,0.15)', border: 'rgba(126,206,138,0.3)', icon: '✅', label: 'FRESH' },
  okay:  { color: '#e8c96a', bg: 'rgba(232,201,106,0.15)', border: 'rgba(232,201,106,0.3)', icon: '⚠️', label: 'OKAY'  },
  avoid: { color: '#e87a6a', bg: 'rgba(232,122,106,0.15)', border: 'rgba(232,122,106,0.3)', icon: '🚫', label: 'AVOID' },
};

export default function App() {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageB64, setImageB64] = useState<string | null>(null);
  const [result, setResult]     = useState<any>(null);
  const [loading, setLoading]   = useState(false);
  const [history, setHistory]   = useState<any[]>([]);

  const pickImage = useCallback(async (source: string) => {
    const permFn = source === 'camera'
      ? ImagePicker.requestCameraPermissionsAsync
      : ImagePicker.requestMediaLibraryPermissionsAsync;

    const { status } = await permFn();
    if (status !== 'granted') {
      Alert.alert('Permission needed', `Please allow ${source} access in your settings.`);
      return;
    }

    const launchFn = source === 'camera'
      ? ImagePicker.launchCameraAsync
      : ImagePicker.launchImageLibraryAsync;

    const picked = await launchFn({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.1,
      base64: false,
      allowsEditing: true,
      aspect: [1, 1],
    });

    if (!picked.canceled && picked.assets[0]) {
      const uri = picked.assets[0].uri;

      // Convert image to base64 manually
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
    }
  }, []);

  const analyze = useCallback(async () => {
    if (!imageB64) return;
    setLoading(true);
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_base64: imageB64,
          media_type: 'image/jpeg',
        }),
      });
      if (!response.ok) throw new Error(`Server error ${response.status}`);
      const data = await response.json();
      setResult(data);
      setHistory((prev: any[]) => [{ uri: imageUri, verdict: data.verdict, id: Date.now() }, ...prev.slice(0, 5)]);
    } catch (err: any) {
      Alert.alert('Analysis failed', err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }, [imageB64, imageUri]);

  const reset = useCallback(() => {
    setImageUri(null);
    setImageB64(null);
    setResult(null);
  }, []);

  const config = result ? VERDICT_CONFIG[result.verdict] : null;

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        <View style={styles.header}>
          <View style={styles.logoTag}>
            <View style={styles.logoDot} />
            <Text style={styles.logoTagText}>AI VISION · FOOD ANALYSIS</Text>
          </View>
          <Text style={styles.title}>Fresh<Text style={styles.titleAccent}>Scan</Text></Text>
          <Text style={styles.subtitle}>Snap or upload food — get instant{'\n'}freshness & quality assessment</Text>
        </View>

        {!imageUri ? (
          <View style={styles.uploadZone}>
            <View style={styles.uploadIcon}>
              <Text style={styles.uploadEmoji}>🥦</Text>
            </View>
            <Text style={styles.uploadTitle}>Choose a food photo</Text>
            <Text style={styles.uploadHint}>camera or photo library</Text>
            <View style={styles.pickRow}>
              <TouchableOpacity style={styles.pickBtn} onPress={() => pickImage('camera')}>
                <Ionicons name="camera" size={20} color="#c8f060" />
                <Text style={styles.pickBtnText}>Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.pickBtn} onPress={() => pickImage('library')}>
                <Ionicons name="images" size={20} color="#c8f060" />
                <Text style={styles.pickBtnText}>Library</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.previewWrap}>
            {loading && (
              <View style={styles.scanLineWrap}>
                <LinearGradient colors={['transparent', '#c8f060', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.scanLine} />
              </View>
            )}
            <Image source={{ uri: imageUri }} style={styles.previewImg} />
            <LinearGradient colors={['transparent', 'rgba(0,0,0,0.6)']} style={styles.previewOverlay} />
            <TouchableOpacity style={styles.clearBtn} onPress={reset}>
              <Text style={styles.clearBtnText}>✕</Text>
            </TouchableOpacity>
          </View>
        )}

        {imageUri && !result && (
          <TouchableOpacity style={[styles.analyzeBtn, loading && styles.analyzeBtnLoading]} onPress={analyze} disabled={loading}>
            {loading ? (
              <><ActivityIndicator color="#7a7870" size="small" /><Text style={styles.analyzeBtnTextLoading}> Scanning…</Text></>
            ) : (
              <Text style={styles.analyzeBtnText}>⚡ Analyze Freshness</Text>
            )}
          </TouchableOpacity>
        )}

        {result && (
          <TouchableOpacity style={styles.rescanBtn} onPress={reset}>
            <Ionicons name="refresh" size={16} color="#c8f060" />
            <Text style={styles.rescanBtnText}>Scan Another</Text>
          </TouchableOpacity>
        )}

        {result && config && (
          <View style={styles.resultCard}>
            <View style={styles.resultHeader}>
              <View style={[styles.verdictBadge, { backgroundColor: config.bg, borderColor: config.border }]}>
                <Text style={styles.verdictEmoji}>{config.icon}</Text>
                <Text style={[styles.verdictText, { color: config.color }]}>{config.label}</Text>
              </View>
              <View style={styles.confidenceWrap}>
                <Text style={styles.confidenceNum}>{result.confidence}%</Text>
                <Text style={styles.confidenceLabel}>confidence</Text>
              </View>
            </View>
            <View style={styles.resultBody}>
              <Text style={styles.resultLabel}>ANALYSIS</Text>
              <Text style={styles.resultSummary}>{result.summary}</Text>
              <Text style={styles.resultLabel}>DETECTED</Text>
              <View style={styles.tagsWrap}>
                {(result.tags || []).map((tag: any, i: any) => (
                  <View key={i} style={styles.tag}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        {history.length > 0 && (
          <View style={styles.historySection}>
            <Text style={styles.sectionLabel}>RECENT SCANS</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {history.map((item: any) => (
                <View key={item.id} style={styles.historyItem}>
                  <Image source={{ uri: item.uri }} style={styles.historyImg} />
                  <View style={[styles.historyBadge, { backgroundColor: VERDICT_CONFIG[item.verdict].color }]}>
                    <Text style={styles.historyBadgeText}>{item.verdict}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0a0a08' },
  scroll: { flex: 1 },
  scrollContent: { paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingHorizontal: 20, paddingBottom: 60 },
  header: { alignItems: 'center', marginBottom: 36 },
  logoTag: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(200,240,96,0.08)', borderWidth: 1, borderColor: 'rgba(200,240,96,0.2)', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6, marginBottom: 16 },
  logoDot: { width: 6, height: 6, backgroundColor: '#c8f060', borderRadius: 3 },
  logoTagText: { fontSize: 10, color: '#c8f060', letterSpacing: 1.5 },
  title: { fontSize: 56, fontWeight: '900', color: '#f0ede8', letterSpacing: -1.5, marginBottom: 10 },
  titleAccent: { color: '#c8f060', fontStyle: 'italic' },
  subtitle: { fontSize: 12, color: '#7a7870', textAlign: 'center', lineHeight: 20 },
  uploadZone: { borderWidth: 1.5, borderColor: '#2a2a28', borderStyle: 'dashed', borderRadius: 20, backgroundColor: '#111110', padding: 40, alignItems: 'center', marginBottom: 16 },
  uploadIcon: { width: 64, height: 64, backgroundColor: '#1a1a18', borderWidth: 1, borderColor: '#2a2a28', borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  uploadEmoji: { fontSize: 28 },
  uploadTitle: { fontSize: 18, fontWeight: '700', color: '#f0ede8', marginBottom: 6 },
  uploadHint: { fontSize: 11, color: '#7a7870', marginBottom: 28 },
  pickRow: { flexDirection: 'row', gap: 12 },
  pickBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#1a1a18', borderWidth: 1, borderColor: 'rgba(200,240,96,0.2)', borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12 },
  pickBtnText: { color: '#c8f060', fontWeight: '600', fontSize: 14 },
  previewWrap: { borderRadius: 16, overflow: 'hidden', marginBottom: 16, borderWidth: 1, borderColor: '#2a2a28', position: 'relative' },
  previewImg: { width: '100%', height: 300, resizeMode: 'cover' },
  previewOverlay: { ...StyleSheet.absoluteFillObject },
  clearBtn: { position: 'absolute', top: 12, right: 12, width: 32, height: 32, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  clearBtnText: { color: 'white', fontSize: 13 },
  scanLineWrap: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, height: 2 },
  scanLine: { height: 2, width: '100%' },
  analyzeBtn: { backgroundColor: '#c8f060', borderRadius: 14, padding: 18, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, marginBottom: 24 },
  analyzeBtnLoading: { backgroundColor: '#1a1a18', borderWidth: 1, borderColor: '#2a2a28' },
  analyzeBtnText: { color: '#0a0a08', fontSize: 16, fontWeight: '700' },
  analyzeBtnTextLoading: { color: '#7a7870', fontSize: 16 },
  rescanBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(200,240,96,0.2)', borderRadius: 12, backgroundColor: 'rgba(200,240,96,0.05)' },
  rescanBtnText: { color: '#c8f060', fontWeight: '600', fontSize: 14 },
  resultCard: { backgroundColor: '#111110', borderWidth: 1, borderColor: '#2a2a28', borderRadius: 20, overflow: 'hidden', marginBottom: 32 },
  resultHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: '#2a2a28' },
  verdictBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999, borderWidth: 1 },
  verdictEmoji: { fontSize: 18 },
  verdictText: { fontSize: 15, fontWeight: '700', letterSpacing: 1 },
  confidenceWrap: { alignItems: 'flex-end' },
  confidenceNum: { fontSize: 28, fontWeight: '800', color: '#c8f060' },
  confidenceLabel: { fontSize: 10, color: '#7a7870', letterSpacing: 1 },
  resultBody: { padding: 20 },
  resultLabel: { fontSize: 10, color: '#7a7870', letterSpacing: 2, marginBottom: 8 },
  resultSummary: { fontSize: 14, color: '#f0ede8', lineHeight: 22, marginBottom: 20 },
  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { backgroundColor: '#1a1a18', borderWidth: 1, borderColor: '#2a2a28', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 },
  tagText: { fontSize: 11, color: '#7a7870' },
  historySection: { marginBottom: 24 },
  sectionLabel: { fontSize: 10, color: '#7a7870', letterSpacing: 2, marginBottom: 12 },
  historyItem: { width: 90, height: 90, borderRadius: 12, overflow: 'hidden', marginRight: 10, borderWidth: 1, borderColor: '#2a2a28' },
  historyImg: { width: '100%', height: '100%' },
  historyBadge: { position: 'absolute', bottom: 5, left: 5, borderRadius: 999, paddingHorizontal: 6, paddingVertical: 2 },
  historyBadgeText: { fontSize: 8, fontWeight: '700', color: '#0a0a08', textTransform: 'uppercase' },
});
