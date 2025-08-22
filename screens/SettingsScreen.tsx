import React from 'react';
import { View, Text } from 'react-native';

export default function SettingsScreen() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontWeight: '700' }}>Setări</Text>
      <Text style={{ opacity: 0.7, marginTop: 8 }}>Aici poți adăuga preferințe mai târziu.</Text>
    </View>
  );
}
