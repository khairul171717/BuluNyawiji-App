import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  useColorScheme,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useOrders } from '@/hooks/useOrders';
import { StatsCard } from '@/components/StatsCard';
import { formatCurrency } from '@/utils/pricing';
import { Ionicons } from '@expo/vector-icons';
import {
  Colors,
  Spacing,
  BorderRadius,
  Shadow,
  FontSize,
  FontWeight,
  BottomTabInset,
} from '@/constants/theme';

export default function StatsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;

  const { orders } = useOrders();

  const stats = useMemo(() => {
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, o) => sum + o.price, 0);
    const totalPaid = orders.reduce((sum, o) => sum + (o.totalPaid ?? 0), 0);
    const remaining = totalRevenue - totalPaid;
    const paidOffCount = orders.filter((o) => o.isPaidOff).length;
    const unpaidCount = orders.filter((o) => !o.isPaidOff).length;

    // Per category breakdown
    const dewasaOrders = orders.filter((o) => o.category === 'dewasa');
    const pemudaOrders = orders.filter((o) => o.category === 'pemuda');
    const anakOrders = orders.filter((o) => o.category === 'anak');

    const categoryBreakdown = [
      {
        label: 'Dewasa',
        count: dewasaOrders.length,
        total: dewasaOrders.reduce((sum, o) => sum + o.price, 0),
      },
      {
        label: 'Pemuda',
        count: pemudaOrders.length,
        total: pemudaOrders.reduce((sum, o) => sum + o.price, 0),
      },
      {
        label: 'Anak',
        count: anakOrders.length,
        total: anakOrders.reduce((sum, o) => sum + o.price, 0),
      },
    ];

    // Per size breakdown
    const sizeMap = new Map<string, number>();
    orders.forEach((o) => {
      const label = o.size === '-' ? 'Belum Pilih' : o.size;
      sizeMap.set(label, (sizeMap.get(label) ?? 0) + 1);
    });
    const sizeBreakdown = Array.from(sizeMap.entries())
      .map(([size, count]) => ({ label: size, count }))
      .sort((a, b) => {
        // 'Belum Pilih' always last
        if (a.label === 'Belum Pilih') return 1;
        if (b.label === 'Belum Pilih') return -1;
        return b.count - a.count;
      });

    // Per sleeve type breakdown
    const pendekOrders = orders.filter((o) => o.sleeveType === 'pendek');
    const panjangOrders = orders.filter((o) => o.sleeveType === 'panjang');
    const belumPilihSleeveOrders = orders.filter((o) => o.sleeveType === '-');

    const sleeveBreakdown = [
      {
        label: 'Lengan Pendek',
        count: pendekOrders.length,
        total: pendekOrders.reduce((sum, o) => sum + o.price, 0),
      },
      {
        label: 'Lengan Panjang',
        count: panjangOrders.length,
        total: panjangOrders.reduce((sum, o) => sum + o.price, 0),
      },
      ...(belumPilihSleeveOrders.length > 0
        ? [
            {
              label: 'Belum Pilih',
              count: belumPilihSleeveOrders.length,
              total: belumPilihSleeveOrders.reduce((sum, o) => sum + o.price, 0),
            },
          ]
        : []),
    ];

    return {
      totalOrders,
      totalRevenue,
      totalPaid,
      remaining,
      paidOffCount,
      unpaidCount,
      categoryBreakdown,
      sizeBreakdown,
      sleeveBreakdown,
    };
  }, [orders]);

  const styles = createStyles(colors, isDark);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
            <Image
              source={require('../../assets/images/logo-nyawiji.jpeg')}
              style={{ width: 36, height: 36, borderRadius: 8, borderWidth: 1, borderColor: colors.borderLight }}
            />
            <View>
              <Text style={styles.headerTitle}>Statistik</Text>
              <Text style={styles.headerSubtitle}>Ringkasan pesanan kaos desa</Text>
            </View>
          </View>
        </View>

        {/* Main Stats Grid */}
        <View style={styles.statsGrid}>
          <StatsCard
            title="Total Pesanan"
            value={stats.totalOrders.toString()}
            icon="cube-outline"
            color={colors.info}
          />
          <StatsCard
            title="Total Pendapatan"
            value={formatCurrency(stats.totalRevenue)}
            icon="cash-outline"
            color={colors.primary}
          />
          <StatsCard
            title="Total Terbayar"
            value={formatCurrency(stats.totalPaid)}
            icon="checkmark-circle-outline"
            color={colors.success}
          />
          <StatsCard
            title="Sisa Tagihan"
            value={formatCurrency(stats.remaining)}
            icon="hourglass-outline"
            color={colors.warning}
          />
          <StatsCard
            title="Jumlah Lunas"
            value={stats.paidOffCount.toString()}
            icon="ribbon-outline"
            color={colors.success}
          />
          <StatsCard
            title="Belum Lunas"
            value={stats.unpaidCount.toString()}
            icon="alert-circle-outline"
            color={colors.danger}
          />
        </View>

        {/* Category Breakdown */}
        <View style={styles.breakdownSection}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: Spacing.sm }}>
            <Ionicons name="folder-open-outline" size={18} color={colors.text} />
            <Text style={styles.sectionTitle}>Per Kategori</Text>
          </View>
          {stats.categoryBreakdown.map((item) => (
            <View key={item.label} style={styles.breakdownCard}>
              <View style={styles.breakdownHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons
                    name={item.label === 'Dewasa' ? 'person-outline' : item.label === 'Pemuda' ? 'people-outline' : 'body-outline'}
                    size={14}
                    color={colors.textSecondary}
                  />
                  <Text style={styles.breakdownLabel}>{item.label}</Text>
                </View>
                <View style={styles.breakdownCountBadge}>
                  <Text style={styles.breakdownCountText}>{item.count} pesanan</Text>
                </View>
              </View>
              <Text style={styles.breakdownValue}>{formatCurrency(item.total)}</Text>
              {stats.totalOrders > 0 && (
                <View style={styles.progressBarContainer}>
                  <View
                    style={[
                      styles.progressBar,
                      {
                        width: `${(item.count / stats.totalOrders) * 100}%`,
                        backgroundColor: colors.primary,
                      },
                    ]}
                  />
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Sleeve Type Breakdown */}
        <View style={styles.breakdownSection}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: Spacing.sm }}>
            <Ionicons name="shirt-outline" size={18} color={colors.text} />
            <Text style={styles.sectionTitle}>Per Tipe Lengan</Text>
          </View>
          {stats.sleeveBreakdown.map((item) => (
            <View key={item.label} style={styles.breakdownCard}>
              <View style={styles.breakdownHeader}>
                <Text style={styles.breakdownLabel}>{item.label}</Text>
                <View style={styles.breakdownCountBadge}>
                  <Text style={styles.breakdownCountText}>{item.count} pesanan</Text>
                </View>
              </View>
              <Text style={styles.breakdownValue}>{formatCurrency(item.total)}</Text>
              {stats.totalOrders > 0 && (
                <View style={styles.progressBarContainer}>
                  <View
                    style={[
                      styles.progressBar,
                      {
                        width: `${(item.count / stats.totalOrders) * 100}%`,
                        backgroundColor: colors.secondary,
                      },
                    ]}
                  />
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Size Breakdown */}
        <View style={styles.breakdownSection}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: Spacing.sm }}>
            <Ionicons name="resize-outline" size={18} color={colors.text} />
            <Text style={styles.sectionTitle}>Per Ukuran</Text>
          </View>
          <View style={styles.sizeBreakdownGrid}>
            {stats.sizeBreakdown.map((item) => (
              <View key={item.label} style={styles.sizeBreakdownItem}>
                <Text style={styles.sizeBreakdownSize}>{item.label}</Text>
                <Text style={styles.sizeBreakdownCount}>{item.count}</Text>
                <Text style={styles.sizeBreakdownLabel}>pesanan</Text>
              </View>
            ))}
            {stats.sizeBreakdown.length === 0 && (
              <Text style={styles.emptyText}>Belum ada data ukuran</Text>
            )}
          </View>
        </View>

        <View style={{ height: BottomTabInset + 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(colors: typeof Colors.light, _isDark: boolean) {
  return StyleSheet.create({
    flex: {
      flex: 1,
    },
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      paddingHorizontal: Spacing.lg,
      paddingBottom: Spacing.lg,
    },
    header: {
      backgroundColor: colors.card,
      paddingTop: Platform.OS === 'android' ? 44 : Spacing.lg,
      paddingHorizontal: Spacing.lg,
      paddingBottom: Spacing.lg,
      borderBottomLeftRadius: BorderRadius.xl,
      borderBottomRightRadius: BorderRadius.xl,
      marginBottom: Spacing.lg,
      ...Shadow.md,
    },
    headerTitle: {
      fontSize: FontSize.xl,
      fontWeight: FontWeight.extrabold,
      color: colors.primary,
    },
    headerSubtitle: {
      fontSize: FontSize.sm,
      color: colors.textSecondary,
      fontWeight: FontWeight.medium,
      marginTop: 2,
    },
    statsGrid: {
      gap: Spacing.sm,
      marginBottom: Spacing.xl,
    },
    breakdownSection: {
      marginBottom: Spacing.xxl,
    },
    sectionTitle: {
      fontSize: FontSize.lg,
      fontWeight: FontWeight.bold,
      color: colors.text,
      marginBottom: Spacing.md,
    },
    breakdownCard: {
      backgroundColor: colors.card,
      borderRadius: BorderRadius.lg,
      padding: Spacing.lg,
      marginBottom: Spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
      ...Shadow.sm,
    },
    breakdownHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: Spacing.sm,
    },
    breakdownLabel: {
      fontSize: FontSize.md,
      fontWeight: FontWeight.semibold,
      color: colors.text,
    },
    breakdownCountBadge: {
      backgroundColor: colors.backgroundElement,
      paddingHorizontal: Spacing.sm,
      paddingVertical: Spacing.xs,
      borderRadius: BorderRadius.full,
    },
    breakdownCountText: {
      fontSize: FontSize.xs,
      fontWeight: FontWeight.semibold,
      color: colors.textSecondary,
    },
    breakdownValue: {
      fontSize: FontSize.lg,
      fontWeight: FontWeight.bold,
      color: colors.primary,
      marginBottom: Spacing.sm,
    },
    progressBarContainer: {
      height: 6,
      backgroundColor: colors.backgroundElement,
      borderRadius: 3,
      overflow: 'hidden',
    },
    progressBar: {
      height: '100%',
      borderRadius: 3,
    },
    sizeBreakdownGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.sm,
    },
    sizeBreakdownItem: {
      backgroundColor: colors.card,
      borderRadius: BorderRadius.lg,
      padding: Spacing.md,
      alignItems: 'center',
      minWidth: 72,
      borderWidth: 1,
      borderColor: colors.border,
      ...Shadow.sm,
    },
    sizeBreakdownSize: {
      fontSize: FontSize.lg,
      fontWeight: FontWeight.bold,
      color: colors.primary,
      marginBottom: Spacing.xs,
    },
    sizeBreakdownCount: {
      fontSize: FontSize.xxl,
      fontWeight: FontWeight.extrabold,
      color: colors.text,
    },
    sizeBreakdownLabel: {
      fontSize: FontSize.xs,
      color: colors.textSecondary,
      fontWeight: FontWeight.medium,
    },
    emptyText: {
      fontSize: FontSize.md,
      color: colors.textTertiary,
      fontStyle: 'italic',
    },
  });
}
