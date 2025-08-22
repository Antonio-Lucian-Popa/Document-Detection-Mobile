import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import DocumentListScreen from './screens/DocumentListScreen';
import SettingsScreen from './screens/SettingsScreen';
import FloatingScanButton from './components/FloatingScanButton';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';


const Tab = createBottomTabNavigator();

export default function AppNavigator() {
    const insets = useSafeAreaInsets();
  return (
    <NavigationContainer theme={{ ...DefaultTheme, colors: { ...DefaultTheme.colors, background: '#fff' } }}>
      <View style={{ flex: 1,
        paddingBottom: insets.bottom,
        paddingLeft: insets.left,
        paddingRight: insets.right, }}>
        <Tab.Navigator
          screenOptions={({ route }) => ({
            headerTitleAlign: 'center',
            tabBarShowLabel: false,
            tabBarStyle: { height: 64 },
            tabBarIcon: ({ focused }) => {
              const name = route.name === 'Docs' ? 'documents' : 'settings';
              return <Ionicons name={name as any} size={22} color={focused ? 'black' : '#777'} />;
            },
          })}
        >
          <Tab.Screen name="Docs" component={DocumentListScreen} options={{ title: 'Documente' }} />
          <Tab.Screen name="Setări" component={SettingsScreen} />
        </Tab.Navigator>

        {/* butonul flotant centrul barei */}
        <FloatingScanButton />
      </View>
    </NavigationContainer>
  );
}
