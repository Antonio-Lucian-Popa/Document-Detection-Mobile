import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, Alert, Linking, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Application from 'expo-application';
import { useAuth } from '../context/AuthContext';
import { useDocs } from '../context/DocsContext';
import { api } from '../services/http';
import Constants from 'expo-constants';

export default function SettingsScreen() {
  const { user, logout, reloadUser } = useAuth();
  const { docs } = useDocs();
  const insets = useSafeAreaInsets();

  const version = Application.nativeApplicationVersion ?? Application.nativeApplicationVersion ?? '—';
  const build = Application.nativeBuildVersion ?? '—';
  const appId = Application.applicationId ?? '—';
  const baseURL: string = (api?.defaults?.baseURL as string) || '—';

  // 👇 citire din extra (funcționează în dev & EAS)
  const extra = Constants.expoConfig?.extra ?? {};
  const authorName = String(extra?.authorName ?? '—');
  const authorEmail = String(extra?.authorEmail ?? '');

  const groups = useMemo(
    () => (Array.isArray(user?.groups) ? user!.groups.join(', ') : '—'),
    [user]
  );

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={[styles.container, { paddingBottom: 16 + insets.bottom }]}
      >

        {/* Utilizator */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="person-circle" size={24} />
            <Text style={styles.cardTitle}>Utilizator</Text>
          </View>

          {user ? (
            <>
              <Row label="ID" value={`${user.userid}`} />
              <Row label="Username" value={user.username} />
              <Row label="Nume" value={`${user.last_name} ${user.first_name}`} />
              <Row label="Email" value={user.email || '—'} />
              <Row label="Grupuri" value={groups} />
              <View style={styles.actions}>
                <ActionButton
                  icon="refresh"
                  text="Reîncarcă date"
                  onPress={reloadUser}
                />
                <ActionButton
                  icon="log-out"
                  text="Logout"
                  danger
                  onPress={() =>
                    Alert.alert('Ieșire', 'Sigur te deloghezi?', [
                      { text: 'Anulează', style: 'cancel' },
                      { text: 'Deloghează-mă', style: 'destructive', onPress: logout },
                    ])
                  }
                />
              </View>
            </>
          ) : (
            <Text style={{ opacity: 0.7 }}>Neautentificat</Text>
          )}
        </View>

        {/* Aplicație */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="apps" size={22} />
            <Text style={styles.cardTitle}>Aplicație</Text>
          </View>
          <Row label="Versiune" value={`${version} (${build})`} />
          <Row label="Documente locale" value={`${docs.length}`} />
          <Row label="Creator" value={authorName} />
          {authorEmail ? (
            <Pressable onPress={() => Linking.openURL(`mailto:${authorEmail}`).catch(() => {})}>
              <Row label="Contact" value={authorEmail} />
            </Pressable>
          ) : null}
          <View style={styles.actions}>
            <ActionButton
              icon="information-circle-outline"
              text="Deschide setările sistemului"
              onPress={() => Linking.openSettings().catch(() => { })}
            />
          </View>
        </View>

        {/* Server */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="cloud-outline" size={22} />
            <Text style={styles.cardTitle}>Server</Text>
          </View>
          <Row label="API URL" value={baseURL} mono />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ============ mici componente UI ============ */

function Row({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, mono && styles.mono]} numberOfLines={2}>
        {value || '—'}
      </Text>
    </View>
  );
}

function ActionButton({
  icon,
  text,
  danger,
  onPress,
}: {
  icon: any;
  text: string;
  danger?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionBtn,
        danger && { backgroundColor: '#b71c1c' },
        pressed && { opacity: 0.85 },
      ]}
    >
      <Ionicons name={icon} size={16} color="#fff" />
      <Text style={styles.actionTxt}>{text}</Text>
    </Pressable>
  );
}

/* ============ styles ============ */

const styles = StyleSheet.create({
  container: { padding: 16, gap: 14, backgroundColor: '#f7f7f7' },
  h1: { fontSize: 20, fontWeight: '800', textAlign: 'center', marginBottom: 4 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e8e8e8',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  cardTitle: { fontSize: 16, fontWeight: '700' },

  row: {
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  rowLabel: { fontSize: 12, color: '#7a7a7a', marginBottom: 2 },
  rowValue: { fontSize: 14, fontWeight: '600', color: '#222' },
  mono: { fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }) },

  actions: { flexDirection: 'row', gap: 8, marginTop: 6, flexWrap: 'wrap' },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#111',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  actionTxt: { color: '#fff', fontWeight: '700' },
});
