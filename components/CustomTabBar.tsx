// components/CustomTabBar.tsx
import React, { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Dimensions, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useSharedValue, withTiming, useAnimatedStyle } from 'react-native-reanimated';

const { width: SCREEN_W } = Dimensions.get('window');

export default function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const H = 58;           // înălțime bară
  const GAP = 12;         // margini laterale + distanță față de safe area
  const COUNT = state.routes.length;
  const BAR_W = SCREEN_W - GAP * 2;
  const ITEM_W = BAR_W / COUNT;

  // indicator animat (păstrează X-ul curent)
  const x = useSharedValue(state.index * ITEM_W);

  useEffect(() => {
    x.value = withTiming(state.index * ITEM_W, { duration: 220 });
  }, [state.index]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }],
  }));

  return (
    // container "măsurat" de navigator (are înălțime clară)
    <View style={{ height: H + insets.bottom + GAP, backgroundColor: 'transparent' }}>
      {/* bara flotantă */}
      <View style={[styles.barWrap, { bottom: insets.bottom + GAP, left: GAP, right: GAP, height: H }]}>
        {Platform.OS === 'ios' ? (
          <BlurView tint="light" intensity={30} style={StyleSheet.absoluteFill} />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.androidBg]} />
        )}

        {/* indicator sub icon (pătrățică “pill”) */}
        <Animated.View
          style={[
            styles.indicator,
            indicatorStyle,
            { width: ITEM_W, height: H },
          ]}
        >
          <View style={styles.indicatorPill} />
        </Animated.View>

        {/* item-urile */}
        {state.routes.map((route, idx) => {
          const isFocused = state.index === idx;
          const { options } = descriptors[route.key];

          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
          };

          const onLongPress = () => navigation.emit({ type: 'tabLongPress', target: route.key });

          // icon map
          const [off, on] = route.name === 'Docs'
            ? (['documents-outline', 'documents'] as const)
            : (['settings-outline', 'settings'] as const);

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              onLongPress={onLongPress}
              style={[styles.item, { width: ITEM_W, height: H }]}
            >
              <Ionicons
                name={(isFocused ? on : off) as any}
                size={22}
                color={isFocused ? '#111' : '#9AA0A6'}
                style={{ marginBottom: 2 }}
              />
              <Text style={[styles.label, isFocused && styles.labelActive]}>
                {options.title ?? route.name}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  barWrap: {
    position: 'absolute',
    borderRadius: 18,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 12,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
  },
  androidBg: {
    backgroundColor: 'rgba(255,255,255,0.97)',
  },
  item: { alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 11, fontWeight: '700', color: '#9AA0A6' },
  labelActive: { color: '#111' },

  indicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    // nu setăm background aici; folosim un “pill” subtil în interior
  },
  indicatorPill: {
    width: 44,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.06)',
    alignSelf: 'center',
  },
});
