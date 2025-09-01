// src/screens/DocumentListScreen.tsx
import React from 'react';
import { View, Text, FlatList, Image, StyleSheet, Button, Alert, Pressable } from 'react-native';
import * as Sharing from 'expo-sharing';
import { useDocs } from '../context/DocsContext';
import { useNavigation } from '@react-navigation/native';

export default function DocumentListScreen() {
  const { docs, removeDoc } = useDocs();
  const nav = useNavigation<any>();

  const share = async (uri?: string) => {
    if (!uri) return;
    if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri);
    else Alert.alert('Share', uri);
  };

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <FlatList
        data={docs}
        keyExtractor={(d) => d.id}
        ListEmptyComponent={<Text style={{ opacity: 0.6 }}>Apasă butonul din mijloc pentru a scana.</Text>}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => nav.navigate('DocViewer', { id: item.id })}
            style={({ pressed }) => [styles.card, pressed && { opacity: 0.7 }]}
          >
            <Image source={{ uri: item.pages[0] }} style={styles.thumb} />
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>
                {item.meta?.type ?? (item.kind === 'pdf' ? 'Document' : 'Imagine')} ·{' '}
                {new Date(item.createdAt).toLocaleString()}
              </Text>
              <Text style={styles.subtitle}>{item.pages.length} pagini</Text>
              <View style={styles.row}>
                <Button
                  title={item.pdfUri ? 'Share PDF' : 'Share'}
                  onPress={() => share(item.pdfUri ?? item.pages[0])}
                />
                <View style={{ width: 8 }} />
                <Button title="Șterge" color="#b71c1c" onPress={() => removeDoc(item.id)} />
              </View>
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', gap: 12, marginBottom: 12, alignItems: 'center' },
  thumb: { width: 80, height: 110, borderRadius: 8, backgroundColor: '#eee' },
  title: { fontWeight: '700' },
  subtitle: { color: '#666', marginBottom: 8 },
  row: { flexDirection: 'row', marginTop: 4 },
});
