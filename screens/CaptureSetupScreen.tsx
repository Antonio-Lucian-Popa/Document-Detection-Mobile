import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet, TextInput, Image, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import WebView from 'react-native-webview';
import * as FileSystem from 'expo-file-system';
import DocumentScanner, { ScanDocumentResponse } from 'react-native-document-scanner-plugin';

import EmployeePicker from '../components/EmployeePicker';
import DocTypePicker from '../components/DocTypePicker';
import { DocCategory, isImageType } from '../constants/docTypes';
import { useDocs } from '../context/DocsContext';
import { copyImageIntoStore } from '../utils/storage';
import { createWaitDocument } from '../services/waitDocument';

type LocalResult =
  | { kind: 'image'; fileUri: string; docId: string }
  | { kind: 'pdf'; fileUri: string; pagesCount: number; docId: string };

export default function CaptureSetupScreen() {
  const nav = useNavigation<any>();
  const { addFromImages, addImageOnly, removeDoc } = useDocs();

  const [emp, setEmp] = useState<{ id: number; name: string } | null>(null);
  const [type, setType] = useState<string | null>(null);
  const [cat, setCat] = useState<DocCategory>('document');
  const [subtip, setSubtip] = useState('');
  const [busy, setBusy] = useState(false);

  const [showEmp, setShowEmp] = useState(false);
  const [showType, setShowType] = useState(false);

  // selector CI: clasic / electronic
  const [ciKind, setCiKind] = useState<'classic' | 'electronic' | null>(null);

  // rezultat local + stare upload
  const [result, setResult] = useState<LocalResult | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);

  // WebView pt. lipire CIE
  const [stitchHtml, setStitchHtml] = useState<string | null>(null);
  const [pendingMeta, setPendingMeta] = useState<{ employeeId: number; type: string; subtip?: string } | null>(null);

  useEffect(() => {
    // când se schimbă tipul de document
    if (type?.startsWith('CI')) {
      setCiKind('classic');              // default
      if (subtip.toUpperCase() === 'CIE') setSubtip(''); // curăță dacă venea din sesiune anterioară
    } else {
      setCiKind(null);
    }
  }, [type]);

  useEffect(() => {
    // când alegi electronic -> setăm subtip automat CIE (doar UI)
    if (ciKind === 'electronic') setSubtip('CIE');
    if (ciKind === 'classic' && subtip.toUpperCase() === 'CIE') setSubtip('');
  }, [ciKind]);

  const canScan = useMemo(() => !!emp && !!type && !busy, [emp, type, busy]);

  const handleUpload = async () => {
    if (!result || uploading || !emp || !type) return;
    try {
      setUploading(true);
      if (result.kind === 'image') {
        await createWaitDocument({ angajat: emp.id, tip: type, subtip, category: 'image' }, result.fileUri);
      } else {
        await createWaitDocument({ angajat: emp.id, tip: type, subtip, category: 'document' }, result.fileUri);
      }
      setUploaded(true);
    } catch (e: any) {
      Alert.alert('Upload eșuat', String(e?.message || e));
    } finally {
      setUploading(false);
    }
  };

  const clearResult = async () => {
    if (result?.docId) await removeDoc(result.docId);
    setResult(null);
    setUploaded(false);
  };

  const start = async () => {
    if (!emp || !type || busy) return;
    setBusy(true);
    setUploaded(false);
    if (result?.docId) await removeDoc(result.docId); // rescan: curăță vechiul rezultat
    setResult(null);

    try {
      if (isImageType(type)) {
        const isCI = type.startsWith('CI');
        if (isCI && ciKind === 'electronic') {
          // CIE: față+verso → lipire verticală în WebView
          const res: ScanDocumentResponse = await DocumentScanner.scanDocument({ maxNumDocuments: 2 });
          const imgs = res.scannedImages || [];
          if (imgs.length < 2) return;

          const [b64F, b64B] = await Promise.all([
            FileSystem.readAsStringAsync(imgs[0], { encoding: FileSystem.EncodingType.Base64 }),
            FileSystem.readAsStringAsync(imgs[1], { encoding: FileSystem.EncodingType.Base64 }),
          ]);
          setPendingMeta({ employeeId: emp.id, type, subtip });
          setStitchHtml(buildHtml(b64F, b64B, 0));
          return; // rezultatul vine în onStitchMessage
        }

        // CI clasic sau alte imagini: o singură poză
        const res: ScanDocumentResponse = await DocumentScanner.scanDocument({ maxNumDocuments: 1 });
        const uri = res.scannedImages?.[0];
        if (!uri) return;

        const id = String(Date.now());
        const storedUri = await copyImageIntoStore(uri, id, 0);
        const saved = await addImageOnly(storedUri, { employeeId: emp.id, type, subtip, category: 'image' });
        setResult({ kind: 'image', fileUri: storedUri, docId: saved.id });
        return;
      }

      // DOCUMENTE: multipagină -> PDF local
      const docRes: ScanDocumentResponse = await DocumentScanner.scanDocument();
      const pages = docRes.scannedImages || [];
      if (!pages.length) return;
      const saved = await addFromImages(pages, { employeeId: emp.id, type, subtip, category: 'document' });
      setResult({ kind: 'pdf', fileUri: saved.pdfUri!, pagesCount: pages.length, docId: saved.id });
    } catch (e: any) {
      Alert.alert('Eroare scanare', String(e?.message || e));
    } finally {
      setBusy(false);
    }
  };

  const onStitchMessage = async (e: any) => {
    try {
      const msg = JSON.parse(e.nativeEvent.data);
      if (msg.type === 'RESULT') {
        const out = `${FileSystem.cacheDirectory}ci_${Date.now()}.jpg`;
        await FileSystem.writeAsStringAsync(out, msg.data, { encoding: FileSystem.EncodingType.Base64 });
        if (!pendingMeta) return;

        const id = String(Date.now());
        const stored = await copyImageIntoStore(out, id, 0);
        const saved = await addImageOnly(stored, { employeeId: pendingMeta.employeeId, type: pendingMeta.type, subtip: pendingMeta.subtip, category: 'image' });
        setResult({ kind: 'image', fileUri: stored, docId: saved.id });

        setStitchHtml(null);
        setPendingMeta(null);
      } else if (msg.type === 'ERROR') {
        throw new Error(msg.error || 'Eroare WebView');
      }
    } catch (err: any) {
      setStitchHtml(null);
      setPendingMeta(null);
      Alert.alert('Eroare compunere CI', String(err?.message || err));
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <ScrollView
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={s.h1}>Asociază scanarea</Text>

        <Pressable onPress={() => setShowEmp(true)} style={s.btn} disabled={busy}>
          <Text style={s.btnTxt}>{emp ? `👤 ${emp.name} (#${emp.id})` : 'Alege angajat…'}</Text>
        </Pressable>

        <Pressable onPress={() => setShowType(true)} style={s.btn} disabled={busy}>
          <Text style={s.btnTxt}>{type ? `📄 ${type}` : 'Alege tip document…'}</Text>
        </Pressable>

        {/* Selector CI: Clasic / Electronic (fără alerte) */}
        {type?.startsWith('CI') && (
          <View style={s.segmentWrap}>
            <Pressable
              onPress={() => setCiKind('classic')}
              style={[s.segmentBtn, ciKind === 'classic' && s.segmentBtnActive]}
            >
              <Text style={[s.segmentTxt, ciKind === 'classic' && s.segmentTxtActive]}>CI clasic</Text>
            </Pressable>
            <Pressable
              onPress={() => setCiKind('electronic')}
              style={[s.segmentBtn, ciKind === 'electronic' && s.segmentBtnActive]}
            >
              <Text style={[s.segmentTxt, ciKind === 'electronic' && s.segmentTxtActive]}>CI electronic</Text>
            </Pressable>
          </View>
        )}

        <TextInput
          placeholder="Subtip (ex: CIE pentru CI electronic)"
          value={subtip}
          placeholderTextColor="#aaa"
          onChangeText={setSubtip}
          style={s.input}
          editable={!busy}
        />

        <Pressable onPress={start} style={[s.cta, (!canScan) && { opacity: 0.5 }]} disabled={!canScan}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.ctaTxt}>Scanează</Text>}
        </Pressable>

        {/* PREVIEW + ACȚIUNI */}
        {result && (
          <View style={s.previewBox}>
            <Text style={s.prevTitle}>Fișier pregătit (local)</Text>

            {result.kind === 'image' ? (
              <Image source={{ uri: result.fileUri }} style={s.imagePrev} resizeMode="contain" />
            ) : (
              <Text style={s.pdfInfo}>PDF creat • {result.pagesCount} pagini{'\n'}{result.fileUri}</Text>
            )}

            <View style={s.row}>
              <Pressable onPress={handleUpload} style={[s.btnAction, { backgroundColor: uploaded ? '#4caf50' : '#2C6BEA' }]} disabled={uploading || uploaded}>
                {uploading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnActionTxt}>{uploaded ? 'Trimis ✔︎' : 'Trimite la server'}</Text>}
              </Pressable>
              <View style={{ width: 10 }} />
              <Pressable onPress={clearResult} style={[s.btnAction, { backgroundColor: '#111' }]} disabled={uploading}>
                <Text style={s.btnActionTxt}>Șterge / Re-scan</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* spațiu pt. scroll peste tastatură/butoane */}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* WebView invizibil pt. lipirea CIE */}
      {stitchHtml && (
        <WebView
          originWhitelist={['*']}
          source={{ html: stitchHtml }}
          onMessage={onStitchMessage}
          style={{ width: 1, height: 1, opacity: 0 }}
        />
      )}

      {/* pickere */}
      <EmployeePicker visible={showEmp} onClose={() => setShowEmp(false)} onSelect={(e) => setEmp({ id: e.id, name: e.name })} />
      <DocTypePicker visible={showType} onClose={() => setShowType(false)} onSelect={(c, t) => { setCat(c); setType(t); }} />
    </View>
  );
}

function buildHtml(frontB64: string, backB64: string, gap = 0) {
  return `<!doctype html>
<html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><style>html,body{margin:0;padding:0;background:#fff}</style></head>
<body><canvas id="c"></canvas><script>
(function(){
  const img1=new Image(), img2=new Image(); const GAP=${gap|0}; let loaded=0;
  function done(){
    if(loaded<2) return;
    const w1=img1.naturalWidth||img1.width, h1=img1.naturalHeight||img1.height;
    const w2=img2.naturalWidth||img2.width, h2=img2.naturalHeight||img2.height;
    const W=Math.max(w1,w2), H1=Math.round(h1*(W/w1)), H2=Math.round(h2*(W/w2));
    const c=document.getElementById('c'); c.width=W; c.height=H1+GAP+H2;
    const ctx=c.getContext('2d'); ctx.drawImage(img1,0,0,W,H1);
    if(GAP){ctx.fillStyle='#fff';ctx.fillRect(0,H1,W,GAP);}
    ctx.drawImage(img2,0,H1+GAP,W,H2);
    const dataURL=c.toDataURL('image/jpeg',0.95);
    window.ReactNativeWebView.postMessage(JSON.stringify({type:'RESULT',data:dataURL.split(',')[1]}));
  }
  img1.onload=()=>{loaded++;done();}; img2.onload=()=>{loaded++;done();};
  img1.onerror=()=>window.ReactNativeWebView.postMessage(JSON.stringify({type:'ERROR',error:'load front'}));
  img2.onerror=()=>window.ReactNativeWebView.postMessage(JSON.stringify({type:'ERROR',error:'load back'}));
  img1.src='data:image/jpeg;base64,${frontB64}';
  img2.src='data:image/jpeg;base64,${backB64}';
})();
</script></body></html>`;
}

const s = StyleSheet.create({
  scroll: { padding: 16, paddingBottom: 24 },
  h1: { fontSize: 18, fontWeight: '800', marginBottom: 8 },
  btn: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 14, marginBottom: 10 },
  btnTxt: { fontWeight: '600' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 12, color: '#000', marginBottom: 10 },

  // selector CI
  segmentWrap: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  segmentBtn: { flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  segmentBtnActive: { backgroundColor: '#111', borderColor: '#111' },
  segmentTxt: { fontWeight: '700', color: '#111' },
  segmentTxtActive: { color: '#fff' },

  cta: { backgroundColor: 'black', padding: 14, borderRadius: 12, alignItems: 'center', marginTop: 6, marginBottom: 12 },
  ctaTxt: { color: '#fff', fontWeight: '800' },

  previewBox: { marginTop: 6, padding: 12, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: '#ddd' },
  prevTitle: { fontWeight: '800', marginBottom: 8 },
  imagePrev: { width: '100%', maxHeight: 420, borderRadius: 10, backgroundColor: '#f2f2f2' }, // limităm înălțimea pt. scroll
  pdfInfo: { color: '#444', fontSize: 12 },

  row: { flexDirection: 'row', marginTop: 12 },
  btnAction: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  btnActionTxt: { color: '#fff', fontWeight: '800' },
});
