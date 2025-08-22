import React from 'react';
import { View, Pressable, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DocumentScanner, { ScanDocumentResponse } from 'react-native-document-scanner-plugin';
import * as Sharing from 'expo-sharing';
import { useDocs } from '../context/DocsContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function FloatingScanButton() {
  const { addFromImages } = useDocs();

  const insets = useSafeAreaInsets();

  const onScan = async () => {
    try {
      const { scannedImages }: ScanDocumentResponse = await DocumentScanner.scanDocument();

      if (!scannedImages?.length) return;

      const doc = await addFromImages(scannedImages); // ← generează PDF automat

      Alert.alert('PDF creat', 'Vrei să îl trimiți acum?', [
        { text: 'Nu' },
        { text: 'Share', onPress: async () => {
            if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(doc.pdfUri);
            else Alert.alert('Share', `Fișier: ${doc.pdfUri}`);
          }
        },
      ]);
    } catch (e: any) {
      Alert.alert('Eroare scanare', String(e?.message || e));
    }
  };

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom: 24 + insets.bottom }]}>
      <Pressable onPress={onScan} style={styles.button}>
        <Ionicons name="camera" size={28} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  button: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
  },
});
