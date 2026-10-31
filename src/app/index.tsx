import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
  RefreshControl,
  ActivityIndicator,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useOrders } from '@/hooks/useOrders';
import { OrderCard } from '@/components/OrderCard';
import { FilterBar, type FilterState } from '@/components/FilterBar';
import { EmptyState } from '@/components/EmptyState';
import { exportToPDF, exportToExcel } from '@/services/exportService';
import { formatCurrency } from '@/utils/pricing';
import {
  Colors,
  Spacing,
  BorderRadius,
  Shadow,
  FontSize,
  FontWeight,
  BottomTabInset,
} from '@/constants/theme';

type SortOption = 'newest' | 'name' | 'price';

export default function BerandaScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;

  const { orders, loading, refreshing, onRefresh } = useOrders();

  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<FilterState>({
    category: null,
    sleeveType: null,
    size: null,
    status: null,
  });
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [isExporting, setIsExporting] = useState(false);

  const filteredOrders = useMemo(() => {
    let result = [...orders];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter((order) =>
        order.name.toLowerCase().includes(query)
      );
    }

    // Category filter
    if (filters.category) {
      result = result.filter((order) => order.category === filters.category);
    }

    // Sleeve type filter
    if (filters.sleeveType) {
      result = result.filter((order) => order.sleeveType === filters.sleeveType);
    }

    // Size filter
    if (filters.size) {
      result = result.filter((order) => order.size === filters.size);
    }

    // Status filter
    if (filters.status) {
      if (filters.status === 'lunas') {
        result = result.filter((order) => order.isPaidOff);
      } else if (filters.status === 'belum') {
        result = result.filter((order) => !order.isPaidOff);
      }
    }

    // Sort
    switch (sortBy) {
      case 'newest':
        result.sort((a, b) => {
          const dateA = a.createdAt?.toDate?.() ?? new Date(0);
          const dateB = b.createdAt?.toDate?.() ?? new Date(0);
          return dateB.getTime() - dateA.getTime();
        });
        break;
      case 'name':
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'price':
        result.sort((a, b) => b.price - a.price);
        break;
    }

    return result;
  }, [orders, searchQuery, filters, sortBy]);

  // Summary stats for header
  const totalRevenue = useMemo(
    () => orders.reduce((sum, o) => sum + o.price, 0),
    [orders]
  );
  const totalPaid = useMemo(
    () => orders.reduce((sum, o) => sum + (o.totalPaid ?? 0), 0),
    [orders]
  );

  const handleExportPDF = useCallback(async () => {
    setIsExporting(true);
    try {
      await exportToPDF(filteredOrders);
    } catch (e) {
      console.error('Export PDF error:', e);
    } finally {
      setIsExporting(false);
    }
  }, [filteredOrders]);

  const handleExportExcel = useCallback(async () => {
    setIsExporting(true);
    try {
      await exportToExcel(filteredOrders);
    } catch (e) {
      console.error('Export Excel error:', e);
    } finally {
      setIsExporting(false);
    }
  }, [filteredOrders]);

  const handleOrderPress = useCallback((orderId: string) => {
    router.push(`/order/${orderId}`);
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({ category: null, sleeveType: null, size: null, status: null });
    setSearchQuery('');
    setSortBy('newest');
  }, []);

  const hasActiveFilters =
    !!filters.category ||
    !!filters.sleeveType ||
    !!filters.size ||
    !!filters.status ||
    searchQuery.trim().length > 0;

  const styles = createStyles(colors, isDark);

  const renderListHeader = () => (
    <View>
      {/* Sort Buttons */}
      <View style={styles.sortContainer}>
        <Text style={styles.sortLabel}>Urutkan:</Text>
        {[
          { key: 'newest' as SortOption, label: 'Terbaru' },
          { key: 'name' as SortOption, label: 'Nama' },
          { key: 'price' as SortOption, label: 'Harga' },
        ].map((option) => (
          <TouchableOpacity
            key={option.key}
            style={[
              styles.sortChip,
              {
                backgroundColor: sortBy === option.key ? colors.primary : colors.backgroundElement,
                borderColor: sortBy === option.key ? colors.primary : colors.border,
              },
            ]}
            onPress={() => setSortBy(option.key)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.sortChipText,
                { color: sortBy === option.key ? '#ffffff' : colors.textSecondary },
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Filter Bar */}
      <FilterBar filters={filters} onFilterChange={setFilters} />

      {/* Active filter indicator */}
      {hasActiveFilters && (
        <View style={styles.filterIndicator}>
          <Text style={styles.filterIndicatorText}>
            {filteredOrders.length} dari {orders.length} pesanan
          </Text>
          <TouchableOpacity onPress={clearFilters} activeOpacity={0.7}>
            <Text style={styles.clearFiltersText}>Reset Filter</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Memuat pesanan...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Fixed Header (never remounted) */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1 }}>
            <Image
              source={require('../../assets/images/logo-nyawiji.jpeg')}
              style={{ width: 42, height: 42, borderRadius: 8, borderWidth: 1, borderColor: colors.borderLight }}
            />
            <View>
              <Text style={styles.headerTitle}>Kaos Desa</Text>
              <Text style={styles.headerSubtitle}>Bulu Nyawiji</Text>
            </View>
          </View>
        </View>
        <View style={styles.exportButtons}>
          <TouchableOpacity
            style={[styles.exportButton, { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs }]}
            onPress={handleExportPDF}
            disabled={isExporting || orders.length === 0}
            activeOpacity={0.7}
          >
            <Ionicons name="document-text" size={16} color={isExporting || orders.length === 0 ? colors.textTertiary : colors.primary} />
            <Text style={[styles.exportButtonText, (isExporting || orders.length === 0) && { opacity: 0.4 }]}>Ekspor PDF</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.exportButton, { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs }]}
            onPress={handleExportExcel}
            disabled={isExporting || orders.length === 0}
            activeOpacity={0.7}
          >
            <Ionicons name="grid" size={16} color={isExporting || orders.length === 0 ? colors.textTertiary : colors.success} />
            <Text style={[styles.exportButtonText, (isExporting || orders.length === 0) && { opacity: 0.4 }]}>Ekspor Excel</Text>
          </TouchableOpacity>
        </View>
        {/* Quick Stats */}
        <View style={styles.quickStats}>
          <View style={styles.quickStatItem}>
            <Text style={styles.quickStatValue}>{orders.length}</Text>
            <Text style={styles.quickStatLabel}>Pesanan</Text>
          </View>
          <View style={[styles.quickStatDivider, { backgroundColor: colors.border }]} />
          <View style={styles.quickStatItem}>
            <Text style={[styles.quickStatValue, { color: colors.success }]}>
              {formatCurrency(totalPaid)}
            </Text>
            <Text style={styles.quickStatLabel}>Terbayar</Text>
          </View>
          <View style={[styles.quickStatDivider, { backgroundColor: colors.border }]} />
          <View style={styles.quickStatItem}>
            <Text style={[styles.quickStatValue, { color: colors.warning }]}>
              {formatCurrency(totalRevenue - totalPaid)}
            </Text>
            <Text style={styles.quickStatLabel}>Sisa</Text>
          </View>
        </View>
      </View>

      {/* Search Bar (outside FlatList to prevent keyboard dismissal) */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={colors.textTertiary} style={{ marginRight: Spacing.xs }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Cari nama pemesan..."
            placeholderTextColor={colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} activeOpacity={0.7}>
              <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        data={filteredOrders}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <OrderCard order={item} onPress={() => handleOrderPress(item.id)} />
        )}
        ListHeaderComponent={renderListHeader}
        ListEmptyComponent={
          <EmptyState
            icon={hasActiveFilters ? 'search-outline' : 'shirt-outline'}
            title={hasActiveFilters ? 'Tidak ada hasil' : 'Belum ada pesanan'}
            subtitle={
              hasActiveFilters
                ? 'Coba ubah filter pencarian'
                : 'Ketuk tombol + untuk menambah pesanan baru'
            }
          />
        }
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: Spacing.sm }} />}
        keyboardShouldPersistTaps="handled"
      />

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/add')}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={28} color="#ffffff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

function createStyles(colors: typeof Colors.light, isDark: boolean) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      gap: Spacing.lg,
    },
    loadingText: {
      fontSize: FontSize.md,
      color: colors.textSecondary,
      fontWeight: FontWeight.medium,
    },
    header: {
      backgroundColor: colors.card,
      paddingTop: Platform.OS === 'android' ? 44 : Spacing.lg,
      paddingHorizontal: Spacing.lg,
      paddingBottom: Spacing.lg,
      borderBottomLeftRadius: BorderRadius.xl,
      borderBottomRightRadius: BorderRadius.xl,
      ...Shadow.md,
    },
    headerTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: Spacing.md,
    },
    headerTitleSection: {
      flex: 1,
    },
    headerTitle: {
      fontSize: FontSize.xxl,
      fontWeight: FontWeight.extrabold,
      color: colors.primary,
      letterSpacing: -0.5,
    },
    headerSubtitle: {
      fontSize: FontSize.md,
      fontWeight: FontWeight.semibold,
      color: colors.text,
      marginTop: 2,
    },
    exportButtons: {
      flexDirection: 'row',
      gap: Spacing.sm,
      marginBottom: Spacing.lg,
    },
    exportButton: {
      flex: 1,
      backgroundColor: colors.backgroundElement,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      borderRadius: BorderRadius.md,
      borderWidth: 1,
      borderColor: colors.border,
      justifyContent: 'center',
      alignItems: 'center',
    },
    exportButtonText: {
      fontSize: FontSize.sm,
      fontWeight: FontWeight.semibold,
      color: colors.text,
    },
    quickStats: {
      flexDirection: 'row',
      backgroundColor: colors.backgroundElement,
      borderRadius: BorderRadius.lg,
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.sm,
      alignItems: 'center',
    },
    quickStatItem: {
      flex: 1,
      alignItems: 'center',
    },
    quickStatValue: {
      fontSize: FontSize.md,
      fontWeight: FontWeight.bold,
      color: colors.text,
    },
    quickStatLabel: {
      fontSize: FontSize.xs,
      color: colors.textSecondary,
      marginTop: 2,
      fontWeight: FontWeight.medium,
    },
    quickStatDivider: {
      width: 1,
      height: 28,
    },
    searchContainer: {
      paddingHorizontal: Spacing.lg,
      paddingTop: Spacing.lg,
      paddingBottom: Spacing.sm,
    },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderRadius: BorderRadius.lg,
      paddingHorizontal: Spacing.lg,
      paddingVertical: Platform.OS === 'ios' ? Spacing.md : Spacing.xs,
      borderWidth: 1,
      borderColor: colors.border,
      ...Shadow.sm,
    },
    searchIcon: {
      fontSize: 18,
      marginRight: Spacing.sm,
    },
    searchInput: {
      flex: 1,
      fontSize: FontSize.md,
      color: colors.text,
      paddingVertical: Spacing.sm,
    },
    clearSearch: {
      fontSize: FontSize.lg,
      color: colors.textTertiary,
      paddingLeft: Spacing.sm,
    },
    sortContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.sm,
      gap: Spacing.sm,
    },
    sortLabel: {
      fontSize: FontSize.sm,
      color: colors.textSecondary,
      fontWeight: FontWeight.medium,
    },
    sortChip: {
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.xs,
      borderRadius: BorderRadius.full,
      borderWidth: 1,
    },
    sortChipText: {
      fontSize: FontSize.xs,
      fontWeight: FontWeight.semibold,
    },
    filterIndicator: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.sm,
    },
    filterIndicatorText: {
      fontSize: FontSize.sm,
      color: colors.textSecondary,
      fontWeight: FontWeight.medium,
    },
    clearFiltersText: {
      fontSize: FontSize.sm,
      color: colors.primary,
      fontWeight: FontWeight.semibold,
    },
    listContent: {
      paddingHorizontal: Spacing.lg,
      paddingBottom: BottomTabInset + 80,
    },
    fab: {
      position: 'absolute',
      right: Spacing.xl,
      bottom: Spacing.xxl,
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      ...Shadow.lg,
    },
    fabText: {
      fontSize: 28,
      color: '#ffffff',
      fontWeight: FontWeight.bold,
      lineHeight: 32,
    },
  });
}
