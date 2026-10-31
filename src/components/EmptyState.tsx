/**
 * EmptyState - Centered placeholder with animated entrance
 * Kaos Desa Bulu Nyawiji
 */

import React, { useEffect, useRef } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';

import { Colors, Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';

interface EmptyStateProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
}

export function EmptyState({ icon, title, subtitle }: EmptyStateProps) {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(18)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        speed: 12,
        bounciness: 6,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, translateY]);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ translateY }],
        },
      ]}
    >
      {/* Icon backdrop circle */}
      <View
        style={[
          styles.iconBackdrop,
          { backgroundColor: colors.backgroundElement },
        ]}
      >
        <Ionicons name={icon} size={36} color={colors.primary} />
      </View>

      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>

      <Text style={[styles.subtitle, { color: colors.textTertiary }]}>
        {subtitle}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xxxl,
    paddingVertical: Spacing.huge,
    gap: Spacing.md,
  },
  iconBackdrop: {
    width: 96,
    height: 96,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  icon: {
    fontSize: 48,
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    textAlign: 'center',
    letterSpacing: 0.1,
  },
  subtitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.regular,
    textAlign: 'center',
    lineHeight: 22,
  },
});
