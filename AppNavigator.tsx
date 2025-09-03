import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import DocumentListScreen from './screens/DocumentListScreen';
import SettingsScreen from './screens/SettingsScreen';
import FloatingScanButton from './components/FloatingScanButton';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from './context/AuthContext';
import LoginScreen from './screens/LoginScreen';
import CaptureSetupScreen from './screens/CaptureSetupScreen';
import IdComposeScreen from './screens/IdComposeScreen';
import DocumentViewerScreen from './screens/DocumentViewerScreen';
import CustomTabBar from './components/CustomTabBar';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function Tabs() {
  return (
    // SafeArea doar pe TOP; jos lasă navigatorul să-și aplice singur inset-ul
    <View style={{ flex: 1 }}>
      <Tab.Navigator
        tabBar={(props) => <CustomTabBar {...props} />}
        screenOptions={{
          headerTitleAlign: 'center'
        }}
      >
        <Tab.Screen name="Docs" component={DocumentListScreen} options={{ title: 'Documente' }} />
        <Tab.Screen name="Setări" component={SettingsScreen} />
      </Tab.Navigator>


      {/* FAB-ul stă deasupra, poziționat cu height-ul real al tab bar-ului */}
      <FloatingScanButton />
    </View>
  );
}

function Root() {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return null;

  return (
    <Stack.Navigator>
      {isAuthenticated ? (
        <>
          <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
          <Stack.Screen name="CaptureSetup" component={CaptureSetupScreen} options={{ title: 'Alege angajat & tip' }} />
          <Stack.Screen name="ComposeID" component={IdComposeScreen} options={{ title: 'Combin CI' }} />
          <Stack.Screen name="DocViewer" component={DocumentViewerScreen} options={{ title: 'Vizualizare' }} />
        </>
      ) : (
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
      )}
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <NavigationContainer theme={{ ...DefaultTheme, colors: { ...DefaultTheme.colors, background: '#fff' } }}>
      <Root />
    </NavigationContainer>
  );
}
