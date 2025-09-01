import React from 'react';
import { View, Text, Button } from 'react-native';
import { useAuth } from '../context/AuthContext';

export default function SettingsScreen() {
  const { user, logout, reloadUser } = useAuth();
  return (
    <View style={{ flex: 1, padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 16, fontWeight: '700' }}>Utilizator</Text>
      {user ? (
        <>
          <Text>ID: {user.userid}</Text>
          <Text>Username: {user.username}</Text>
          <Text>Nume: {user.last_name} {user.first_name}</Text>
          <Text>Email: {user.email}</Text>
          <Text>Groups: {Array.isArray(user.groups) ? user.groups.join(', ') : ''}</Text>
          <Text>Marca: {user.marca}</Text>
        </>
      ) : (
        <Text>Neautentificat</Text>
      )}
      <Button title="Reîncarcă user" onPress={reloadUser} />
      <Button title="Logout" color="#b71c1c" onPress={logout} />
    </View>
  );
}
