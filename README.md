# RN DocScan (Expo) 📄📷

Aplicație **React Native + Expo** pentru **scanare documente** cu **detecție de margini**, **generare automată PDF**, **share**, și **persistență locală** (documentele rămân disponibile la redeschiderea aplicației).

- Scanare multi‑pagină (față/verso, mai multe documente)
- PDF creat automat după fiecare sesiune de scan
- Share (ex. WhatsApp / Mail) direct din aplicație
- Păstrare locală: imagini + PDF în `FileSystem.documentDirectory` și listă salvată în `AsyncStorage`
- UI cu **Bottom navigation** și **buton central flotant** pentru scanare
- Safe‑area friendly (nu se lovește de bara de gesturi Android)

---

## ⚠️ Important: Expo Go vs Development Build

**NU** funcționează în Expo Go (plugin nativ pentru scanner). Rulează cu **development build**:

```bash
# pornește Metro pentru dev client
npx expo start --dev-client
# instalează buildul de dev pe Android/iOS
npx expo run:android
# sau (pe macOS cu Xcode)
npx expo run:ios
```

---

## 🧰 Tehnologii & Pachete

- Camera/scan: [`react-native-document-scanner-plugin`](https://react-native-document-scanner.js.org/)
- Navigație: `@react-navigation/native`, `@react-navigation/bottom-tabs`
- Animații & gestures: `react-native-reanimated`, `react-native-gesture-handler`, `react-native-screens`, `react-native-safe-area-context`
- Fișiere: `expo-file-system`
- Share: `expo-sharing`
- Persistență: `@react-native-async-storage/async-storage`
- PDF: `pdf-lib`

---

## 📦 Instalare

```bash
# 1) creează proiectul (dacă e cazul)
npx create-expo-app rn-docscan --template expo-template-blank-typescript
cd rn-docscan

# 2) pachete
npx expo install react-native-document-scanner-plugin
yarn add @react-navigation/native @react-navigation/bottom-tabs
npx expo install react-native-screens react-native-safe-area-context react-native-gesture-handler react-native-reanimated
npx expo install expo-file-system expo-sharing
npx expo install @react-native-async-storage/async-storage
yarn add pdf-lib
```

### `babel.config.js` (obligatoriu pentru Reanimated)

```js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: ['react-native-reanimated/plugin'],
  };
};
```

### `app.json` (plugin + permisiuni)

```json
{
  "expo": {
    "name": "rn-docscan",
    "slug": "rn-docscan",
    "newArchEnabled": true,
    "plugins": ["react-native-document-scanner-plugin"],
    "ios": {
      "infoPlist": {
        "NSCameraUsageDescription": "Folosim camera pentru a scana documente."
      }
    },
    "android": {
      "permissions": ["CAMERA"],
      "edgeToEdgeEnabled": true,
      "package": "com.example.rndocscan"
    }
  }
}
```

> Dacă folosești și salvare în galerie, `expo-media-library` va cere permisiunile sale **dinamic**, nu în `app.json`.

---

## ▶️ Rulare pe Android (fizic/emulator)

1. Activează **USB debugging** pe telefon (Developer options).
2. Conectează telefonul și verifică `adb devices` → trebuie să apară `device`.
3. Instalează development build:
   ```bash
   npx expo run:android
   ```
4. Pornește Metro:
   ```bash
   npx expo start --dev-client
   ```
5. Deschide aplicația **rn-docscan** instalată pe telefon (nu Expo Go).

### iOS (opțional, pe macOS)
```bash
npx expo run:ios
npx expo start --dev-client
```

---

## 🗂 Structură

```
src/
  AppNavigator.tsx            # bottom tabs
  components/
    FloatingScanButton.tsx    # butonul central de scan
  context/
    DocsContext.tsx           # listă documente + persistență
  screens/
    DocumentListScreen.tsx
    SettingsScreen.tsx
  utils/
    pdf.ts                    # generare PDF din imagini
    storage.ts                # directoare, copiere imagini, async storage
App.tsx
```

---

## 🧠 Cum funcționează

- Apeși **butonul de cameră** din mijloc → se deschide scannerul cu detecție de margini.
- Poți captura **mai multe pagini** (ex. față/verso).
- La final, aplicația:
  1. **Copiază imaginile** în `FileSystem.documentDirectory/scans/images/…`
  2. **Generează PDF** `FileSystem.documentDirectory/scans/scan_<id>.pdf`
  3. **Salvează lista** în `AsyncStorage`
  4. Oferă **Share** pentru PDF
- La redeschidere, lista este încărcată din `AsyncStorage`.

---

## 📝 Snippets esențiale

### Generare PDF & salvare locală (`utils/pdf.ts`)

```ts
import { PDFDocument } from 'pdf-lib';
import * as FileSystem from 'expo-file-system';
import { Buffer } from 'buffer';
import { ROOT_DIR } from './storage';

export async function createPdfFromImages(imageUris: string[], id?: string) {
  const pdf = await PDFDocument.create();
  for (const uri of imageUris) {
    const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
    const bytes = Buffer.from(base64, 'base64');
    const isPng = uri.toLowerCase().endsWith('.png');
    const img = isPng ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);
    const page = pdf.addPage([img.width, img.height]);
    page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
  }
  const name = `scan_${id ?? Date.now()}.pdf`;
  const pdfUri = ROOT_DIR + name;
  const pdfBytes = await pdf.save();
  await FileSystem.writeAsStringAsync(pdfUri, Buffer.from(pdfBytes).toString('base64'), {
    encoding: FileSystem.EncodingType.Base64,
  });
  return pdfUri;
}
```

### Persistență (`utils/storage.ts`)

```ts
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const ROOT_DIR = FileSystem.documentDirectory + 'scans/';
export const IMAGES_DIR = ROOT_DIR + 'images/';
const DOCS_KEY = 'DOCS_V1';

export async function ensureDirs() {
  if (!(await FileSystem.getInfoAsync(ROOT_DIR)).exists)
    await FileSystem.makeDirectoryAsync(ROOT_DIR, { intermediates: true });
  if (!(await FileSystem.getInfoAsync(IMAGES_DIR)).exists)
    await FileSystem.makeDirectoryAsync(IMAGES_DIR, { intermediates: true });
}

export async function copyImageIntoStore(srcUri: string, id: string, idx: number) {
  await ensureDirs();
  const isPng = srcUri.toLowerCase().endsWith('.png');
  const dest = `${IMAGES_DIR}${id}_${idx}.${isPng ? 'png' : 'jpg'}`;
  await FileSystem.copyAsync({ from: srcUri, to: dest });
  return dest;
}

export async function saveDocsToStorage(docs: unknown) {
  await AsyncStorage.setItem(DOCS_KEY, JSON.stringify(docs));
}
export async function loadDocsFromStorage<T>() {
  const raw = await AsyncStorage.getItem(DOCS_KEY);
  return raw ? (JSON.parse(raw) as T) : null;
}
```

---

## 🐞 Troubleshooting

- **`The package 'react-native-document-scanner-plugin' doesn't seem to be linked`**  
  Rulezi în **Expo Go** sau ai un build vechi. Soluție:
  ```bash
  npx expo prebuild --platform android --clean
  npx expo run:android
  npx expo start --dev-client -c
  ```

- **Butonul/Tab bar-ul intră sub bara de gesturi Android**  
  Nu modifica `height/padding` manual; lasă stilul default și ridică FAB-ul cu safe-area:
  ```ts
  bottom: (Platform.OS === 'ios' ? 49 : 56) + insets.bottom + 12
  ```

- **Nu apare device-ul la `adb devices`**  
  Instalează driverele, activează USB debugging, acceptă promptul „Allow USB debugging?”.

---

## 🔐 Confidențialitate

- Toate procesările sunt **on-device**.  
- Fișierele sunt salvate în spațiul aplicației (`documentDirectory`).  
- Nu se trimit date către servere terțe.

---

## 🗺 Roadmap (idei)

- Organizare pe „colecții”/foldere
- Redenumire document + opțiuni PDF (watermark, compresie)
- Export în galerie / Files direct din listă
- (opțional) OCR în viitor

---

## 🏷 Licență

MIT © Contribuitori RN DocScan
