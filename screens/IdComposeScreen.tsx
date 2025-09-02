import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text, Alert, StyleSheet } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import WebView from 'react-native-webview';
import * as FileSystem from 'expo-file-system';
import { ensureDirs, IMAGES_DIR } from '../utils/storage';
import { useDocs } from '../context/DocsContext';
import { createWaitDocument } from '../services/waitDocument';

type Params = {
  frontUri: string;
  backUri: string;
  meta?: { employeeId: number; type: string; subtip?: string; category: 'image' | 'document' };
};

export default function IdComposeScreen() {
  const { params } = useRoute<any>();
  const navigation = useNavigation<any>();
  const { addImageOnly, addFromImages } = useDocs();
  const { frontUri, backUri, meta } = params as Params;

  const [html, setHtml] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [b64F, b64B] = await Promise.all([
          FileSystem.readAsStringAsync(frontUri, { encoding: FileSystem.EncodingType.Base64 }),
          FileSystem.readAsStringAsync(backUri,  { encoding: FileSystem.EncodingType.Base64 }),
        ]);
        setHtml(buildHtml(b64F, b64B, 0)); // GAP 0
      } catch (e: any) {
        Alert.alert('Eroare', 'Nu pot citi imaginile pentru compunere.');
        navigation.goBack();
      }
    })();
  }, [frontUri, backUri]);

  const postScanPrompt = (fileUri: string) => {
    Alert.alert(
      'Ce vrei să faci?',
      'CI compus (față+verso) a fost salvat local. Trimiți și la server?',
      [
        { text: 'Doar local', style: 'cancel', onPress: () => navigation.replace('DocViewer', { id: lastDocIdRef }) },
        {
          text: 'Trimite la server',
          onPress: async () => {
            try {
              await createWaitDocument(
                { angajat: meta!.employeeId, tip: meta!.type, subtip: meta?.subtip, category: 'image' },
                fileUri
              );
              Alert.alert('Succes', 'Trimis la server.');
            } catch (e: any) {
              Alert.alert('Upload eșuat', String(e?.message || e));
            } finally {
              navigation.replace('DocViewer', { id: lastDocIdRef });
            }
          },
        },
      ]
    );
  };

  // reținem id-ul documentului creat ca să deschidem viewer-ul după prompt
  let lastDocIdRef: string | undefined;

  const onMessage = async (e: any) => {
    try {
      const msg = JSON.parse(e.nativeEvent.data);
      if (msg.type === 'RESULT') {
        await ensureDirs();
        const out = `${IMAGES_DIR}ci_${Date.now()}.jpg`;
        await FileSystem.writeAsStringAsync(out, msg.data, { encoding: FileSystem.EncodingType.Base64 });

        const newDoc =
          meta?.category === 'image'
            ? await addImageOnly(out, meta!)
            : await addFromImages([out], meta!);

        lastDocIdRef = newDoc.id;
        // prompt pentru upload sau nu
        postScanPrompt(out);
      } else if (msg.type === 'ERROR') {
        throw new Error(msg.error || 'Eroare WebView');
      }
    } catch (err: any) {
      Alert.alert('Eroare compunere CI', String(err?.message || err));
      navigation.goBack();
    }
  };

  return (
    <View style={styles.center}>
      {!html ? (
        <>
          <ActivityIndicator />
          <Text style={{ marginTop: 6 }}>Pregătesc compunerea…</Text>
        </>
      ) : (
        <>
          <ActivityIndicator />
          <Text style={{ marginTop: 6 }}>Generez imaginea CI…</Text>
          <WebView originWhitelist={['*']} source={{ html }} onMessage={onMessage} style={{ width: 1, height: 1, opacity: 0 }} />
        </>
      )}
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

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
});
