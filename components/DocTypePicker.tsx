import React, { useState } from 'react';
import { Modal, View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { DOCUMENTE_TYPES, IMAGINI_TYPES, DocCategory } from '../constants/docTypes';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSelect: (cat: DocCategory, type: string) => void;
};

export default function DocTypePicker({ visible, onClose, onSelect }: Props) {
  const [cat, setCat] = useState<DocCategory>('document');
  const list = cat === 'document' ? DOCUMENTE_TYPES : IMAGINI_TYPES;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={s.wrap}>
        <View style={s.tabs}>
          <Pressable onPress={() => setCat('document')} style={[s.tab, cat==='document' && s.tabOn]}><Text style={s.tabTxt}>Documente</Text></Pressable>
          <Pressable onPress={() => setCat('image')}     style={[s.tab, cat==='image' && s.tabOn]}><Text style={s.tabTxt}>Imagini</Text></Pressable>
        </View>

        <FlatList
          data={list}
          keyExtractor={(it) => it}
          renderItem={({ item }) => (
            <Pressable onPress={() => { onSelect(cat, item); onClose(); }} style={s.row}>
              <Text>{item}</Text>
            </Pressable>
          )}
          ItemSeparatorComponent={() => <View style={s.sep} />}
        />

        <Pressable onPress={onClose} style={s.close}><Text style={{ color: '#fff', fontWeight: '700' }}>Închide</Text></Pressable>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, padding: 16, backgroundColor: '#fff' },
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  tab: { flex: 1, borderWidth: 1, borderColor: '#ddd', padding: 10, borderRadius: 10, alignItems: 'center' },
  tabOn: { backgroundColor: '#eee' },
  tabTxt: { fontWeight: '600' },
  row: { paddingVertical: 12 },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: '#eee' },
  close: { marginTop: 8, backgroundColor: 'black', padding: 12, borderRadius: 10, alignItems: 'center' },
});
