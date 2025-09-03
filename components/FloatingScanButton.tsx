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
  const bottom = TAB_BAR_BASE_HEIGHT + insets.bottom + 8;

  const openCaptureSetup = () => {
    const parent = nav.getParent?.();
    (parent ?? nav).navigate('CaptureSetup');
  };

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom }]}>
      <Pressable
        onPress={openCaptureSetup}
        style={styles.button}
        android_ripple={{ color: 'rgba(255,255,255,0.25)', radius: 28 }}
      >
        <Ionicons name="camera" size={24} color="#fff" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  button: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
});
