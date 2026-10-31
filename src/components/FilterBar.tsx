/**
 * FilterBar - Horizontal scrollable filter chips with section labels
 * Kaos Desa Bulu Nyawiji
 */

import React, { useCallback } from 'react';
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';

import { Colors, Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/theme';
import type { Category, SleeveType, Size } from '@/utils/pricing';
import { SIZES } from '@/utils/pricing';

export interface FilterState {
  category: Category | null;
  sleeveType: SleeveType | null;
  size: Size | null;
  status: 'lunas' | 'belum' | null;
}

interface FilterBarProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
}

interface ChipProps {
  label: string;
  active: boolean;
  onPress: () => void;
  colors: (typeof Colors)['light'];
}

function Chip({ label, active, onPress, colors }: ChipProps) {
  return (
    <Pressable onPress={onPress}>
      <View
        style={[
          styles.chip,
          {
            backgroundColor: active ? colors.primary : colors.backgroundElement,
            borderColor: active ? colors.primary : colors.border,
          },
        ]}
      >
        <Text
          style={[
            styles.chipText,
            {
              color: active
                ? '#ffffff'
                : colors.textSecondary,
            },
          ]}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

function SectionSeparator({ colors }: { colors: (typeof Colors)['light'] }) {
  return <View style={[styles.separator, { backgroundColor: colors.border }]} />;
}

function SectionLabel({ label, colors }: { label: string; colors: (typeof Colors)['light'] }) {
  return (
    <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>
      {label}
    </Text>
  );
}

export function FilterBar({ filters, onFilterChange }: FilterBarProps) {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];

  const setCategory = useCallback(
    (value: Category | null) => {
      onFilterChange({ ...filters, category: value });
    },
    [filters, onFilterChange]
  );

  const setSleeveType = useCallback(
    (value: SleeveType | null) => {
      onFilterChange({ ...filters, sleeveType: value });
    },
    [filters, onFilterChange]
  );

  const setSize = useCallback(
    (value: Size | null) => {
      onFilterChange({ ...filters, size: value });
    },
    [filters, onFilterChange]
  );

  const setStatus = useCallback(
    (value: 'lunas' | 'belum' | null) => {
      onFilterChange({ ...filters, status: value });
    },
    [filters, onFilterChange]
  );

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Kategori */}
        <View style={styles.section}>
          <SectionLabel label="Kategori" colors={colors} />
          <View style={styles.chipGroup}>
            <Chip
              label="Semua"
              active={filters.category === null}
              onPress={() => setCategory(null)}
              colors={colors}
            />
            <Chip
              label="Dewasa"
              active={filters.category === 'dewasa'}
              onPress={() =>
                setCategory(filters.category === 'dewasa' ? null : 'dewasa')
              }
              colors={colors}
            />
            <Chip
              label="Pemuda"
              active={filters.category === 'pemuda'}
              onPress={() =>
                setCategory(filters.category === 'pemuda' ? null : 'pemuda')
              }
              colors={colors}
            />
            <Chip
              label="Anak"
              active={filters.category === 'anak'}
              onPress={() =>
                setCategory(filters.category === 'anak' ? null : 'anak')
              }
              colors={colors}
            />
          </View>
        </View>

        <SectionSeparator colors={colors} />

        {/* Lengan */}
        <View style={styles.section}>
          <SectionLabel label="Lengan" colors={colors} />
          <View style={styles.chipGroup}>
            <Chip
              label="Pendek"
              active={filters.sleeveType === 'pendek'}
              onPress={() =>
                setSleeveType(filters.sleeveType === 'pendek' ? null : 'pendek')
              }
              colors={colors}
            />
            <Chip
              label="Panjang"
              active={filters.sleeveType === 'panjang'}
              onPress={() =>
                setSleeveType(
                  filters.sleeveType === 'panjang' ? null : 'panjang'
                )
              }
              colors={colors}
            />
          </View>
        </View>

        <SectionSeparator colors={colors} />

        {/* Ukuran */}
        <View style={styles.section}>
          <SectionLabel label="Ukuran" colors={colors} />
          <View style={styles.chipGroup}>
            {SIZES.map((size) => (
              <Chip
                key={size}
                label={size}
                active={filters.size === size}
                onPress={() =>
                  setSize(filters.size === size ? null : size)
                }
                colors={colors}
              />
            ))}
          </View>
        </View>

        <SectionSeparator colors={colors} />

        {/* Status */}
        <View style={styles.section}>
          <SectionLabel label="Status" colors={colors} />
          <View style={styles.chipGroup}>
            <Chip
              label="Lunas"
              active={filters.status === 'lunas'}
              onPress={() =>
                setStatus(filters.status === 'lunas' ? null : 'lunas')
              }
              colors={colors}
            />
            <Chip
              label="Belum Lunas"
              active={filters.status === 'belum'}
              onPress={() =>
                setStatus(filters.status === 'belum' ? null : 'belum')
              }
              colors={colors}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: Spacing.sm,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
    alignItems: 'flex-start',
  },
  section: {
    gap: Spacing.xs,
  },
  sectionLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginLeft: Spacing.xs,
  },
  chipGroup: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  chipText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  separator: {
    width: 1,
    alignSelf: 'stretch',
    marginVertical: Spacing.lg,
    opacity: 0.5,
  },
});
