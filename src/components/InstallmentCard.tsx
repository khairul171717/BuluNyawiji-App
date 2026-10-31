/**
 * InstallmentCard - Compact card for a single installment entry
 * Kaos Desa Bulu Nyawiji
 */

import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Colors, Spacing, BorderRadius, Shadow, FontSize, FontWeight } from '@/constants/theme';
import type { Installment } from '@/services/firestoreService';
import { formatCurrency, formatDateTime } from '@/utils/pricing';

interface InstallmentCardProps {
  installment: Installment;
  index: number;
  onDelete?: (id: string) => void;
}

export function InstallmentCard({ installment, index, onDelete }: InstallmentCardProps) {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];

  return (
    <View
      style={[
        styles.card,
        Shadow.sm,
        {
          backgroundColor: colors.card,
          borderLeftColor: colors.primary,
          borderColor: colors.borderLight,
        },
      ]}
    >
      {/* Left: number circle */}
      <View style={[styles.numberCircle, { backgroundColor: colors.primaryLight }]}>
        <Text style={[styles.numberText, { color: colors.primary }]}>
          T{installment.tarikanNumber}
        </Text>
      </View>

      {/* Center: details */}
      <View style={styles.details}>
        <Text style={[styles.amount, { color: colors.text }]}>
          {formatCurrency(installment.amount)}
        </Text>
        {installment.note ? (
          <Text
            style={[styles.note, { color: colors.textSecondary }]}
            numberOfLines={2}
          >
            {installment.note}
          </Text>
        ) : null}
        <Text style={[styles.date, { color: colors.textTertiary }]}>
          {formatDateTime(installment.paidAt)}
        </Text>
      </View>

      {/* Right: delete button */}
      {onDelete ? (
        <Pressable
          onPress={() => onDelete(installment.id)}
          style={({ pressed }) => [
            styles.deleteButton,
            {
              backgroundColor: pressed
                ? colors.dangerLight
                : 'transparent',
            },
          ]}
          hitSlop={8}
          accessibilityLabel="Hapus tarikan"
          accessibilityRole="button"
        >
          <Ionicons name="trash-outline" size={18} color={colors.danger} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderLeftWidth: 4,
    padding: Spacing.md,
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.xs,
    gap: Spacing.md,
  },
  numberCircle: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  numberText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  details: {
    flex: 1,
    gap: 2,
  },
  amount: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.1,
  },
  note: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.regular,
    lineHeight: 18,
  },
  date: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    marginTop: 2,
  },
  deleteButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteIcon: {
    fontSize: 18,
  },
});
