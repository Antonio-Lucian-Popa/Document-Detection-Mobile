import 'react-native-gesture-handler';
import React from 'react';
import { DocsProvider } from './context/DocsContext';
import AppNavigator from './AppNavigator';
import { SafeAreaProvider } from 'react-native-safe-area-context';


export default function App() {
  return (
    <SafeAreaProvider>
      <DocsProvider>
        <AppNavigator />
      </DocsProvider>
    </SafeAreaProvider>
  );
}
