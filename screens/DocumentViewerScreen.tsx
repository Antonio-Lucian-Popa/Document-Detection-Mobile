// src/screens/DocumentViewerScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Image, StyleSheet, Pressable, ActivityIndicator, Dimensions, Alert } from 'react-native';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import * as Sharing from 'expo-sharing';
import { useDocs } from '../context/DocsContext';

type Params = { id: string };

export default function DocumentViewerScreen() {
  const route = useRoute<RouteProp<Record<string, Params>, string>>();
  const navigation = useNavigation<any>();
  const { docs, removeDoc } = useDocs();
  const doc = docs.find(d => d.id === route.params.id);

  const [ratios, setRatios] = useState<Record<string, number>>({});
  const screenW = Dimensions.get('window').width;

  useEffect(() => {
    if (!doc) return;
    navigation.setOptions({
      title: doc.meta?.type ?? (doc.kind === 'pdf' ? 'Document' : 'Imagine'),
    });
    doc.pages.forEach((uri) => {
      Image.getSize(
        uri,
        (w, h) => setRatios((prev) => ({ ...prev, [uri]: w / h })),
        () => {}
      );
    });
  }, [doc]);

  if (!doc) {
    return (
      <View style={styles.center}>
        <Text>Documentul nu mai există.</Text>
      </View>
    );
  }

  const sharePdf = async () => {
    if (!doc.pdfUri) return;
    if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(doc.pdfUri);
    else Alert.alert('Share', doc.pdfUri);
  };
  const shareImage = async (uri: string) => {
    if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri);
    else Alert.alert('Share', uri);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <ScrollView contentContainerStyle={{ padding: 12 }}>
        {doc.pages.map((uri) => {
          const ratio = ratios[uri];
          const height = ratio ? Math.round(screenW / ratio) : 400;
          return (
            <View key={uri} style={styles.pageWrap}>
              <Image source={{ uri }} style={{ width: '100%', height }} resizeMode="contain" />
              <View style={styles.pageActions}>
                <Pressable style={styles.btn} onPress={() => shareImage(uri)}>
                  <Text style={styles.btnTxt}>Share imagine</Text>
                </Pressable>
              </View>
            </View>
          );
        })}
        {doc.pages.length === 0 && (
          <View style={styles.center}><ActivityIndicator /><Text style={{ marginTop: 6 }}>Se încarcă…</Text></View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        {doc.pdfUri ? (
          <Pressable style={styles.btn} onPress={sharePdf}>
            <Text style={styles.btnTxt}>Share PDF</Text>
          </Pressable>
        ) : null}
        <Pressable
          style={[styles.btn, { backgroundColor: '#b71c1c' }]}
          onPress={async () => { await removeDoc(doc.id); navigation.goBack(); }}
        >
          <Text style={styles.btnTxt}>Șterge</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pageWrap: { marginBottom: 12, borderRadius: 8, overflow: 'hidden', backgroundColor: '#fafafa', borderWidth: StyleSheet.hairlineWidth, borderColor: '#eee' },
  pageActions: { padding: 8, alignItems: 'flex-end' },
  footer: {
    padding: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#ddd',
    backgroundColor: '#fff',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  btn: { backgroundColor: 'black', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10 },
  btnTxt: { color: '#fff', fontWeight: '700' },
});
