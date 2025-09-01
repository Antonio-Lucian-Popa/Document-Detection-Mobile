import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, TextInput, Alert, ActivityIndicator } from 'react-native';
import EmployeePicker from '../components/EmployeePicker';
import DocTypePicker from '../components/DocTypePicker';
import { DocCategory, isImageType } from '../constants/docTypes';
import { useNavigation } from '@react-navigation/native';
import DocumentScanner, { ScanDocumentResponse } from 'react-native-document-scanner-plugin';
import { useDocs } from '../context/DocsContext';
import { copyImageIntoStore } from '../utils/storage';

export default function CaptureSetupScreen() {
  const nav = useNavigation<any>();
  const { addFromImages, addImageOnly } = useDocs();

  const [emp, setEmp] = useState<{ id: number; name: string } | null>(null);
  const [type, setType] = useState<string | null>(null);
  const [cat, setCat] = useState<DocCategory>('document'); // rezervat pt. extensii
  const [subtip, setSubtip] = useState('');
  const [busy, setBusy] = useState(false);

  const [showEmp, setShowEmp] = useState(false);
  const [showType, setShowType] = useState(false);

  const start = async () => {
    if (!emp || !type) return Alert.alert('Completează', 'Selectează angajatul și tipul.');
    if (busy) return;
    setBusy(true);

    try {
      // === IMAGINI (ex. CI) ===
      if (isImageType(type)) {
        if (type?.startsWith('CI')) {
          const res: ScanDocumentResponse = await DocumentScanner.scanDocument({
            maxNumDocuments: 2, // față + verso într-o sesiune
          });
          const imgs = res.scannedImages || [];
          if (imgs.length < 2) {
            Alert.alert('Incomplet', 'Pentru CI scanează FAȚA și VERSO.');
            return;
          }
          nav.navigate('ComposeID', {
            frontUri: imgs[0],
            backUri: imgs[1],
            meta: { employeeId: emp.id, type, subtip, category: 'image' },
          });
          return;
        } else {
          // alte imagini: o singură pagină
          const res: ScanDocumentResponse = await DocumentScanner.scanDocument({
            maxNumDocuments: 1,
          });
          const uri = res.scannedImages?.[0];
          if (!uri) return;

          const id = String(Date.now());
          const storedUri = await copyImageIntoStore(uri, id, 0);
          await addImageOnly(storedUri, { employeeId: emp.id, type, subtip, category: 'image' });
          Alert.alert('Gata', 'Imagine salvată.');
          nav.goBack();
          return;
        }
      }

      // === DOCUMENTE (multi-pagini → PDF) ===
      const docRes: ScanDocumentResponse = await DocumentScanner.scanDocument();
      const pages = docRes.scannedImages || [];
      if (!pages.length) return;

      await addFromImages(pages, { employeeId: emp.id, type, subtip, category: 'document' });
      Alert.alert('Gata', 'PDF creat.');
      nav.goBack();
    } catch (e: any) {
      Alert.alert('Eroare', String(e?.message || e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={s.wrap}>
      <Text style={s.h1}>Asociază scanarea</Text>

      <Pressable onPress={() => setShowEmp(true)} style={s.btn} disabled={busy}>
        <Text style={s.btnTxt}>{emp ? `👤 ${emp.name} (#${emp.id})` : 'Alege angajat…'}</Text>
      </Pressable>

      <Pressable onPress={() => setShowType(true)} style={s.btn} disabled={busy}>
        <Text style={s.btnTxt}>{type ? `📄 ${type}` : 'Alege tip document…'}</Text>
      </Pressable>

      {/* <TextInput
        placeholder="Subtip (opțional)"
        value={subtip}
        onChangeText={setSubtip}
        style={s.input}
        editable={!busy}
      /> */}

      <Pressable
        onPress={start}
        style={[s.cta, ((!emp || !type) || busy) && { opacity: 0.5 }]}
        disabled={!emp || !type || busy}
      >
        {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.ctaTxt}>Începe scanarea</Text>}
      </Pressable>

      <EmployeePicker visible={showEmp} onClose={() => setShowEmp(false)} onSelect={(e) => setEmp({ id: e.id, name: e.name })} />
      <DocTypePicker visible={showType} onClose={() => setShowType(false)} onSelect={(c, t) => { setCat(c); setType(t); }} />
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#fff', padding: 16, gap: 12 },
  h1: { fontSize: 18, fontWeight: '800', marginBottom: 8 },
  btn: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 14 },
  btnTxt: { fontWeight: '600' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 12 },
  cta: { backgroundColor: 'black', padding: 14, borderRadius: 12, alignItems: 'center', marginTop: 6 },
  ctaTxt: { color: '#fff', fontWeight: '800' },
});
