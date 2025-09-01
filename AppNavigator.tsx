import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import DocumentListScreen from './screens/DocumentListScreen';
import SettingsScreen from './screens/SettingsScreen';
import FloatingScanButton from './components/FloatingScanButton';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from './context/AuthContext';
import LoginScreen from './screens/LoginScreen';
import CaptureSetupScreen from './screens/CaptureSetupScreen';
import IdComposeScreen from './screens/IdComposeScreen';
import DocumentViewerScreen from './screens/DocumentViewerScreen';


const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function Tabs() {
  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerTitleAlign: 'center',
          tabBarShowLabel: false,
          tabBarHideOnKeyboard: true,
          tabBarStyle: { backgroundColor: '#fff', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#ddd' },
          tabBarIcon: ({ focused }) => {
            const name = route.name === 'Docs' ? 'documents' : 'settings';
            return <Ionicons name={name as any} size={22} color={focused ? 'black' : '#777'} />;
          },
        })}
      >
        <Tab.Screen name="Docs" component={DocumentListScreen} options={{ title: 'Documente' }} />
        <Tab.Screen name="Setări" component={SettingsScreen} />
      </Tab.Navigator>
      <FloatingScanButton />
    </View>
  );
}

function Root() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return null; // poți pune un splash

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

