/**
 * OrderCard - Premium pressable card showing order summary
 * Kaos Desa Bulu Nyawiji
 */

import React, { useCallback, useRef } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';

import { Colors, Spacing, BorderRadius, Shadow, FontSize, FontWeight } from '@/constants/theme';
import type { Order } from '@/services/firestoreService';
import { formatCurrency, formatDate, calculatePaymentPercentage } from '@/utils/pricing';

interface OrderCardProps {
  order: Order;
  onPress: () => void;
}

export function OrderCard({ order, onPress }: OrderCardProps) {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const percentage = calculatePaymentPercentage(order.totalPaid, order.price);

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  }, [scaleAnim]);

  const accentColor = order.isPaidOff ? colors.success : colors.primary;
  const badgeBg = order.isPaidOff ? colors.successLight : colors.warningLight;
  const badgeText = order.isPaidOff ? colors.successDark : colors.warning;
  const badgeLabel = order.isPaidOff ? 'LUNAS' : 'Tarikan';

  let categoryLabel = 'Anak';
  if (order.category === 'dewasa') categoryLabel = 'Dewasa';
  else if (order.category === 'pemuda') categoryLabel = 'Pemuda';
  
  const sleeveLabel = order.sleeveType === 'pendek' ? 'Pendek' : 'Panjang';

  return (
    <Pressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut}>
      <Animated.View
        style={[
          styles.card,
          Shadow.md,
          {
            backgroundColor: colors.card,
            borderColor: colors.borderLight,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* Left accent bar */}
        <View style={[styles.accentBar, { backgroundColor: accentColor }]} />

        <View style={styles.content}>
          {/* Top row: Name + Status badge */}
          <View style={styles.topRow}>
            <Text
              style={[styles.name, { color: colors.text }]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {order.name}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: badgeBg }]}>
              <Text style={[styles.statusBadgeText, { color: badgeText }]}>
                {badgeLabel}
              </Text>
            </View>
          </View>

          {/* Middle row: Category, Sleeve, Size badges */}
          <View style={styles.badgeRow}>
            <View style={[styles.infoBadge, { backgroundColor: colors.primaryLight }]}>
              <Text style={[styles.infoBadgeText, { color: colors.primary }]}>
                {categoryLabel}
              </Text>
            </View>
            <View style={[styles.infoBadge, { backgroundColor: colors.primaryLight }]}>
              <Text style={[styles.infoBadgeText, { color: colors.primary }]}>
                {sleeveLabel}
              </Text>
            </View>
            <View style={[styles.infoBadge, { backgroundColor: colors.backgroundElement }]}>
              <Text style={[styles.infoBadgeText, { color: colors.textSecondary }]}>
                {order.size}
              </Text>
            </View>
          </View>

          {/* Bottom row: Price + progress */}
          <View style={styles.bottomSection}>
            <View style={styles.priceRow}>
              <Text style={[styles.priceText, { color: colors.text }]}>
                {formatCurrency(order.price)}
              </Text>
              <Text style={[styles.dateText, { color: colors.textTertiary }]}>
                {formatDate(order.createdAt)}
              </Text>
            </View>

            {/* Progress bar */}
            <View style={styles.progressContainer}>
              <View
                style={[
                  styles.progressTrack,
                  { backgroundColor: colors.backgroundElement },
                ]}
              >
                <View
                  style={[
                    styles.progressFill,
                    {
                      backgroundColor: accentColor,
                      width: `${percentage}%`,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>
                {formatCurrency(order.totalPaid)} / {formatCurrency(order.price)} ({percentage}%)
              </Text>
            </View>
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.sm,
  },
  accentBar: {
    width: 5,
  },
  content: {
    flex: 1,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  name: {
    flex: 1,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.1,
  },
  statusBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  statusBadgeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.5,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  infoBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  infoBadgeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  bottomSection: {
    gap: Spacing.sm,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  dateText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
  },
  progressContainer: {
    gap: Spacing.xs,
  },
  progressTrack: {
    height: 6,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: BorderRadius.full,
  },
  progressLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
  },
});
