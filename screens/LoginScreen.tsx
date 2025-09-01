// src/screens/LoginScreen.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, ActivityIndicator, Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen() {
  const { login } = useAuth();
  const [username, setU] = useState('');
  const [password, setP] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    if (!username || !password) return Alert.alert('Completează', 'User și parolă sunt obligatorii.');
    try {
      setLoading(true);
      await login(username.trim(), password);
    } catch (e: any) {
      Alert.alert('Login eșuat', e?.response?.data?.message ?? String(e?.message || e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Autentificare</Text>

      <Text style={styles.label}>Username</Text>
      <TextInput
        value={username}
        onChangeText={setU}
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="username"
        style={styles.input}
      />

      <Text style={styles.label}>Parola</Text>
      <TextInput
        value={password}
        onChangeText={setP}
        secureTextEntry
         textContentType="password"
        placeholder="••••••••"
        style={styles.input}
      />

      <Pressable onPress={onSubmit} style={({ pressed }) => [styles.btn, pressed && { opacity: 0.8 }]}>
        {loading ? <ActivityIndicator /> : <Text style={styles.btnText}>Intră</Text>}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#fff', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '800', marginBottom: 24, textAlign: 'center' },
  label: { fontWeight: '600', marginTop: 12, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 12, color: '#333' },
  btn: { marginTop: 20, backgroundColor: 'black', padding: 14, borderRadius: 12, alignItems: 'center' },
  btnText: { color: 'white', fontWeight: '700' },
});
