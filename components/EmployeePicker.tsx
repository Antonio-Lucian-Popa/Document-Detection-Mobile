// src/components/EmployeePicker.tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Modal, View, TextInput, FlatList, Text, Pressable, StyleSheet, Image, ActivityIndicator,
} from 'react-native';
import { Employee, fetchEmployeesPage } from '../services/employees';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSelect: (e: Employee) => void;
};

export default function EmployeePicker({ visible, onClose, onSelect }: Props) {
  const [q, setQ] = useState('');
  const [items, setItems] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);

  const debTimer = useRef<NodeJS.Timeout | null>(null);
  const queryId = useRef(0); // ca să anulăm rezultate vechi după debounce

  const resetAndLoad = useCallback((search: string) => {
    setLoading(true);
    setItems([]);
    setHasMore(true);
    setOffset(0);
    const myId = ++queryId.current;

    fetchEmployeesPage({ search, offset: 0 })
      .then(({ items, hasMore, nextOffset }) => {
        if (queryId.current !== myId) return; // ignoră răspuns vechi
        setItems(items);
        setHasMore(hasMore);
        setOffset(nextOffset);
      })
      .catch(() => { /* poți seta un mesaj de eroare */ })
      .finally(() => {
        if (queryId.current === myId) setLoading(false);
      });
  }, []);

  // Când se deschide modalul → load initial
  useEffect(() => {
    if (!visible) return;
    resetAndLoad('');
    setQ('');
  }, [visible]);

  // Debounce pe search
  useEffect(() => {
    if (!visible) return;
    if (debTimer.current) clearTimeout(debTimer.current);
    debTimer.current = setTimeout(() => resetAndLoad(q.trim()), 250);
    return () => { if (debTimer.current) clearTimeout(debTimer.current); };
  }, [q, visible]);

  const loadMore = useCallback(() => {
    if (!visible || loading || loadingMore || !hasMore) return;
    setLoadingMore(true);
    const myId = queryId.current;

    fetchEmployeesPage({ search: q.trim(), offset })
      .then(({ items: next, hasMore: hm, nextOffset }) => {
        if (queryId.current !== myId) return;
        setItems(prev => [...prev, ...next]);
        setHasMore(hm);
        setOffset(nextOffset);
      })
      .finally(() => {
        if (queryId.current === myId) setLoadingMore(false);
      });
  }, [visible, loading, loadingMore, hasMore, q, offset]);

  const renderItem = ({ item }: { item: Employee }) => (
    <Pressable style={s.row} onPress={() => { onSelect(item); onClose(); }}>
      <View style={s.avatarWrap}>
        {item.imagine ? (
          <Image source={{ uri: item.imagine }} style={s.avatar} />
        ) : (
          <View style={[s.avatar, s.avatarFallback]} />
        )}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.name}>{item.name}</Text>
        <Text style={s.meta}>
          {item.marca ? `#${item.marca}` : '—'}
          {item.telefon ? `  ·  ${item.telefon}` : ''}
        </Text>
      </View>
    </Pressable>
  );

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={s.wrap}>
        <TextInput
          placeholder="Caută angajat…"
          value={q}
          onChangeText={setQ}
          style={s.input}
          autoFocus
          autoCorrect={false}
        />

        {loading ? (
          <View style={s.center}><ActivityIndicator /><Text style={s.loadingTxt}>Se încarcă…</Text></View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(it) => String(it.id)}
            renderItem={renderItem}
            ItemSeparatorComponent={() => <View style={s.sep} />}
            onEndReachedThreshold={0.3}
            onEndReached={loadMore}
            keyboardShouldPersistTaps="handled"
            ListFooterComponent={
              loadingMore ? <View style={s.more}><ActivityIndicator /></View> : null
            }
            ListEmptyComponent={<Text style={s.empty}>Nimic găsit</Text>}
          />
        )}

        <Pressable onPress={onClose} style={s.close}>
          <Text style={{ color: '#fff', fontWeight: '700' }}>Închide</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, padding: 16, backgroundColor: '#fff' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 12, marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 12 },
  avatarWrap: { width: 40, height: 40 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#eee' },
  avatarFallback: { backgroundColor: '#ddd' },
  name: { fontWeight: '600' },
  meta: { color: '#777', marginTop: 2 },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: '#eee' },
  center: { alignItems: 'center', justifyContent: 'center', paddingVertical: 16 },
  loadingTxt: { marginTop: 6 },
  more: { paddingVertical: 12 },
  empty: { textAlign: 'center', opacity: 0.6, marginTop: 12 },
  close: { marginTop: 8, backgroundColor: 'black', padding: 12, borderRadius: 10, alignItems: 'center' },
});
