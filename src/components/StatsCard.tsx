/**
 * StatsCard - Compact statistics card optimized for mobile 2-column grids
 * Kaos Desa Bulu Nyawiji
 */

import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';

import { Colors, Spacing, BorderRadius, Shadow, FontSize, FontWeight } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';

interface StatsCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
  color?: string;
}

export function StatsCard({ title, value, subtitle, icon, color }: StatsCardProps) {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];

  const accentColor = color ?? colors.primary;

  return (
    <View
      style={[
        styles.card,
        Shadow.sm,
        {
          backgroundColor: colors.card,
          borderColor: colors.borderLight,
        },
      ]}
    >
      {/* Left accent bar */}
      <View style={[styles.accentBar, { backgroundColor: accentColor }]} />

      <View style={styles.body}>
        {/* Icon circle */}
        <View style={[styles.iconCircle, { backgroundColor: `${accentColor}18` }]}>
          <Ionicons name={icon} size={20} color={accentColor} />
        </View>

        {/* Text content */}
        <View style={styles.textContent}>
          <Text
            style={[styles.title, { color: colors.textSecondary }]}
            numberOfLines={1}
          >
            {title}
          </Text>
          <Text
            style={[styles.value, { color: colors.text }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.6}
          >
            {value}
          </Text>
          {subtitle ? (
            <Text
              style={[styles.subtitle, { color: colors.textTertiary }]}
              numberOfLines={1}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  accentBar: {
    width: 4,
  },
  body: {
    flex: 1,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContent: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  value: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.extrabold,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
  },
});
