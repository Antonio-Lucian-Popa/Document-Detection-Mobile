// src/components/FloatingScanButton.tsx
import React from 'react';
import { View, Pressable, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const TAB_BAR_BASE_HEIGHT = Platform.OS === 'ios' ? 49 : 56;

export default function FloatingScanButton() {
  const nav = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const openCaptureSetup = () => {
    // cum ești în interiorul Tabs, ia navigatorul părinte (Root Stack)
    const parent = nav.getParent?.();
    (parent ?? nav).navigate('CaptureSetup');
  };

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom: TAB_BAR_BASE_HEIGHT + insets.bottom + 12 }]}>
      <Pressable onPress={openCaptureSetup} style={styles.button}>
        <Ionicons name="camera" size={28} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  button: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: 'white',
    alignItems: 'center', justifyContent: 'center',
    elevation: 6, shadowColor: '#000', shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 4 }, shadowRadius: 8,
  },
});
