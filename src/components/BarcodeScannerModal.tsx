import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Easing,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, Theme } from '../theme';
import { lookupBarcode, ProductLookup } from '../utils/openFoodFacts';
import { getItemEmoji } from '../utils/itemIcons';

// expo-camera is loaded lazily so the rest of the app doesn't crash if it
// isn't installed yet. Run: npx expo install expo-camera
let CameraView: any = null;
let useCameraPermissions: any = null;
try {
  const mod = require('expo-camera');
  CameraView = mod.CameraView;
  useCameraPermissions = mod.useCameraPermissions;
} catch {
  /* not installed — render fallback */
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onAdd: (name: string, quantity: string) => void;
}

const { width: SCREEN_W } = Dimensions.get('window');
const FRAME_SIZE = Math.min(SCREEN_W * 0.75, 320);

export default function BarcodeScannerModal({ visible, onClose, onAdd }: Props) {
  const { Colors, Shadow } = useTheme();
  const styles = useMemo(() => makeStyles(Colors, Shadow), [Colors, Shadow]);

  const cameraAvailable = !!CameraView && !!useCameraPermissions;
  const [permission, requestPermission] = cameraAvailable ? useCameraPermissions() : [null, null];
  const [scanned, setScanned] = useState<string | null>(null);
  const [lookup, setLookup] = useState<ProductLookup | null>(null);
  const [looking, setLooking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scanLine = useRef(new Animated.Value(0)).current;
  const inFlight = useRef(false);

  useEffect(() => {
    if (visible && cameraAvailable && permission && !permission.granted) {
      requestPermission?.();
    }
    if (visible) {
      // Loop the scanline animation while open
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(scanLine, {
            toValue: 1, duration: 1800, easing: Easing.inOut(Easing.quad), useNativeDriver: true,
          }),
          Animated.timing(scanLine, {
            toValue: 0, duration: 1800, easing: Easing.inOut(Easing.quad), useNativeDriver: true,
          }),
        ])
      );
      loop.start();
      return () => loop.stop();
    } else {
      setScanned(null);
      setLookup(null);
      setError(null);
      inFlight.current = false;
    }
  }, [visible, permission, cameraAvailable]);

  const handleScanned = async ({ data }: { data: string }) => {
    if (inFlight.current || scanned) return;
    inFlight.current = true;
    setScanned(data);
    setLooking(true);
    const result = await lookupBarcode(data);
    setLooking(false);
    if (!result) {
      setError("Couldn't identify that product. Try again or add it manually.");
      inFlight.current = false;
      return;
    }
    setLookup(result);
  };

  const handleAddToList = () => {
    if (!lookup) return;
    const fullName = lookup.brand && !lookup.name.toLowerCase().includes(lookup.brand.toLowerCase())
      ? `${lookup.brand} ${lookup.name}`
      : lookup.name;
    onAdd(fullName, '');
    onClose();
  };

  const handleRescan = () => {
    setScanned(null);
    setLookup(null);
    setError(null);
    inFlight.current = false;
  };

  const lineTranslate = scanLine.interpolate({
    inputRange: [0, 1],
    outputRange: [-FRAME_SIZE / 2 + 8, FRAME_SIZE / 2 - 8],
  });

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.container}>
        {/* Camera or fallback */}
        {cameraAvailable && permission?.granted ? (
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            barcodeScannerSettings={{
              barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'qr', 'code128', 'code39'],
            }}
            onBarcodeScanned={scanned ? undefined : handleScanned}
          />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.fallback]}>
            {!cameraAvailable ? (
              <>
                <Ionicons name="camera-reverse" size={48} color="#FCD34D" />
                <Text style={styles.fallbackTitle}>Camera not installed</Text>
                <Text style={styles.fallbackBody}>
                  Run this in your terminal then restart:{'\n'}
                  <Text style={styles.fallbackCode}>npx expo install expo-camera</Text>
                </Text>
              </>
            ) : !permission ? (
              <ActivityIndicator color="#FCD34D" size="large" />
            ) : (
              <>
                <Ionicons name="lock-closed" size={48} color="#FCD34D" />
                <Text style={styles.fallbackTitle}>Camera access needed</Text>
                <Text style={styles.fallbackBody}>
                  Allow camera permission to scan barcodes.
                </Text>
                <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
                  <Text style={styles.permBtnText}>Grant access</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}

        {/* Dim corners + scan frame overlay */}
        {cameraAvailable && permission?.granted && (
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <View style={styles.overlayTop} />
            <View style={styles.overlayMiddle}>
              <View style={styles.overlaySide} />
              <View style={styles.scanFrame}>
                {/* Four corner brackets */}
                <View style={[styles.corner, styles.cornerTL]} />
                <View style={[styles.corner, styles.cornerTR]} />
                <View style={[styles.corner, styles.cornerBL]} />
                <View style={[styles.corner, styles.cornerBR]} />
                {/* Pulsing scan line */}
                <Animated.View
                  style={[
                    styles.scanLine,
                    { transform: [{ translateY: lineTranslate }] },
                  ]}
                />
              </View>
              <View style={styles.overlaySide} />
            </View>
            <View style={styles.overlayBottom} />
          </View>
        )}

        {/* Close */}
        <TouchableOpacity
          style={styles.closeBtn}
          onPress={onClose}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="close" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Bottom result panel */}
        <View style={styles.resultPanel}>
          {!scanned ? (
            <>
              <Text style={styles.label}>POINT AT A BARCODE</Text>
              <Text style={styles.hint}>Hold steady — we'll catch it</Text>
            </>
          ) : looking ? (
            <View style={styles.resultRow}>
              <ActivityIndicator color="#FCD34D" />
              <Text style={styles.resultText}>Looking up product…</Text>
            </View>
          ) : error ? (
            <>
              <View style={styles.resultRow}>
                <Ionicons name="alert-circle" size={20} color="#FB7185" />
                <Text style={[styles.resultText, { color: '#FB7185' }]}>{error}</Text>
              </View>
              <TouchableOpacity style={styles.rescanBtn} onPress={handleRescan}>
                <Ionicons name="refresh" size={16} color="#0F0C2C" />
                <Text style={styles.rescanText}>Scan another</Text>
              </TouchableOpacity>
            </>
          ) : lookup ? (
            <>
              <View style={styles.foundRow}>
                <Text style={styles.foundEmoji}>{getItemEmoji(lookup.name)}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.foundName} numberOfLines={1}>{lookup.name}</Text>
                  {lookup.brand && (
                    <Text style={styles.foundBrand} numberOfLines={1}>{lookup.brand}</Text>
                  )}
                </View>
              </View>
              <View style={styles.btnRow}>
                <TouchableOpacity style={styles.rescanBtn} onPress={handleRescan}>
                  <Ionicons name="refresh" size={16} color="#0F0C2C" />
                  <Text style={styles.rescanText}>Scan another</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.addBtn} onPress={handleAddToList}>
                  <Ionicons name="add-circle" size={18} color="#0F0C2C" />
                  <Text style={styles.addText}>Add to list</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (Colors: Theme['Colors'], Shadow: Theme['Shadow']) => StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  fallback: {
    backgroundColor: '#0F0C2C',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  fallbackTitle: {
    fontSize: 20, fontWeight: '900', color: '#FFFFFF', marginTop: 12, marginBottom: 8,
  },
  fallbackBody: {
    fontSize: 14, color: '#A5B4FC', textAlign: 'center',
    lineHeight: 21, marginBottom: 18,
  },
  fallbackCode: { color: '#FCD34D', fontFamily: 'Menlo', fontWeight: '700' },
  permBtn: {
    backgroundColor: '#FCD34D',
    paddingHorizontal: 22, paddingVertical: 12, borderRadius: 12,
  },
  permBtnText: { fontSize: 14, color: '#0F0C2C', fontWeight: '900' },

  overlayTop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  overlayMiddle: { flexDirection: 'row', height: FRAME_SIZE },
  overlaySide: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  overlayBottom: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  scanFrame: {
    width: FRAME_SIZE,
    height: FRAME_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  corner: {
    position: 'absolute',
    width: 32, height: 32,
    borderColor: '#FCD34D',
  },
  cornerTL: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 12 },
  cornerTR: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 12 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 12 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 12 },
  scanLine: {
    width: '85%', height: 2,
    backgroundColor: '#FCD34D',
    shadowColor: '#FCD34D',
    shadowOpacity: 0.8,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },

  closeBtn: {
    position: 'absolute', top: 56, left: 20,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center', alignItems: 'center',
  },

  resultPanel: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#0F0C2C',
    paddingTop: 18, paddingBottom: 40, paddingHorizontal: 22,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
  },
  label: {
    fontSize: 10, fontWeight: '900', color: '#FCD34D',
    letterSpacing: 1.8, marginBottom: 4, textAlign: 'center',
  },
  hint: { fontSize: 14, color: '#A5B4FC', textAlign: 'center', fontWeight: '600' },

  resultRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  resultText: { fontSize: 14, color: '#FFFFFF', fontWeight: '700', flex: 1 },

  foundRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    padding: 12, borderRadius: 14, marginBottom: 12,
  },
  foundEmoji: { fontSize: 32 },
  foundName: { fontSize: 16, color: '#FFFFFF', fontWeight: '800' },
  foundBrand: { fontSize: 12, color: '#A5B4FC', fontWeight: '600', marginTop: 2 },

  btnRow: { flexDirection: 'row', gap: 10 },
  rescanBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12,
  },
  rescanText: { fontSize: 13, color: '#FCD34D', fontWeight: '800' },
  addBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#FCD34D', padding: 12, borderRadius: 12,
  },
  addText: { fontSize: 14, color: '#0F0C2C', fontWeight: '900' },
});
