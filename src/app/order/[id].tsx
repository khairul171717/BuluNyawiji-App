import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  getOrderById,
  addInstallment,
  deleteInstallment,
  deleteOrder,
  updateOrder,
} from '@/services/firestoreService';
import { useInstallments } from '@/hooks/useInstallments';
import { InstallmentCard } from '@/components/InstallmentCard';
import {
  formatCurrency,
  formatDate,
  calculatePaymentPercentage,
  calculatePrice,
  SIZES,
} from '@/utils/pricing';
import {
  Colors,
  Spacing,
  BorderRadius,
  Shadow,
  FontSize,
  FontWeight,
} from '@/constants/theme';

interface Order {
  id: string;
  name: string;
  category: string;
  sleeveType: string;
  size: string;
  price: number;
  totalPaid: number;
  isPaidOff: boolean;
  createdAt?: { toDate: () => Date };
}

export default function OrderDetailScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;

  const { id } = useLocalSearchParams<{ id: string }>();
  const orderId = id ?? '';

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [newAmount, setNewAmount] = useState('');
  const [newNote, setNewNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [selectedTarikanNumber, setSelectedTarikanNumber] = useState<number | null>(null);

  const { installments, loading: installmentsLoading } = useInstallments(orderId);

  useEffect(() => {
    if (installments && installments.length >= 0) {
      const paidTarikanNumbers = installments.map((i) => i.tarikanNumber);
      const nextAvailable =
        [1, 2, 3, 4, 5, 6, 7].find((num) => !paidTarikanNumbers.includes(num)) || 1;
      setSelectedTarikanNumber(nextAvailable);
    }
  }, [installments]);

  // Fetch order data
  const fetchOrder = useCallback(async () => {
    if (!orderId) return;
    try {
      setLoading(true);
      const data = await getOrderById(orderId);
      setOrder(data as Order | null);
    } catch (error) {
      console.error('Error fetching order:', error);
      Alert.alert('Error', 'Gagal memuat data pesanan.');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  const handleAddInstallment = async () => {
    const amount = parseInt(newAmount.replace(/\D/g, ''), 10) || 0;

    if (amount <= 0) {
      Alert.alert('Validasi', 'Masukkan jumlah pembayaran yang valid.');
      return;
    }

    if (selectedTarikanNumber === null) {
      Alert.alert('Validasi', 'Silakan pilih tarikan ke berapa.');
      return;
    }

    if (order && amount > order.price - order.totalPaid) {
      Alert.alert('Validasi', 'Jumlah tarikan melebihi sisa tagihan.');
      return;
    }

    setSubmitting(true);
    try {
      await addInstallment(
        orderId, 
        amount, 
        selectedTarikanNumber, 
        newNote.trim() || `Tarikan ${selectedTarikanNumber}`
      );
      setNewAmount('');
      setNewNote('');
      // Refresh order data
      await fetchOrder();
    } catch (error) {
      console.error('Error adding installment:', error);
      Alert.alert('Gagal', 'Terjadi kesalahan saat menambah tarikan.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteInstallment = (installmentId: string) => {
    Alert.alert(
      'Hapus Tarikan',
      'Apakah Anda yakin ingin menghapus tarikan ini?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteInstallment(orderId, installmentId);
              await fetchOrder();
            } catch (error) {
              console.error('Error deleting installment:', error);
              Alert.alert('Gagal', 'Terjadi kesalahan saat menghapus tarikan.');
            }
          },
        },
      ]
    );
  };

  const handleDeleteOrder = () => {
    Alert.alert(
      'Hapus Pesanan',
      `Apakah Anda yakin ingin menghapus pesanan "${order?.name}"? Semua data tarikan juga akan dihapus.`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteOrder(orderId);
              router.replace('/');
            } catch (error) {
              console.error('Error deleting order:', error);
              Alert.alert('Gagal', 'Terjadi kesalahan saat menghapus pesanan.');
            }
          },
        },
      ]
    );
  };

  const styles = createStyles(colors, isDark);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Memuat detail pesanan...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.loadingContainer}>
          <Text style={{ fontSize: 48, marginBottom: Spacing.lg }}>😕</Text>
          <Text style={styles.loadingText}>Pesanan tidak ditemukan</Text>
          <TouchableOpacity
            style={[styles.actionButton, { marginTop: Spacing.lg, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: Spacing.lg }]}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={18} color="#ffffff" />
            <Text style={styles.actionButtonText}>Kembali</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const paymentPercentage = calculatePaymentPercentage(order.totalPaid, order.price);
  const remainingAmount = order.price - order.totalPaid;
  const createdDate = order.createdAt?.toDate?.() ?? new Date();

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Custom Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="arrow-back" size={20} color={colors.primary} />
            <Text style={styles.backButton}>Kembali</Text>
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Image
              source={require('../../../assets/images/logo-nyawiji.jpeg')}
              style={{ width: 24, height: 24, borderRadius: 4, borderWidth: 1, borderColor: colors.borderLight }}
            />
            <Text style={styles.headerTitle}>Detail Pesanan</Text>
          </View>
          <TouchableOpacity onPress={handleDeleteOrder} activeOpacity={0.7} style={{ padding: 4 }}>
            <Ionicons name="trash-outline" size={22} color={colors.danger} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Order Info Card */}
          <View style={styles.orderCard}>
            <View style={styles.orderHeader}>
              <Text style={styles.orderName}>{order.name}</Text>
              <Text style={styles.orderDate}>{formatDate(createdDate)}</Text>
            </View>

            <View style={styles.badgeRow}>
              <View style={[styles.badge, { backgroundColor: colors.primaryLight, flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
                <Ionicons
                  name={order.category === 'dewasa' ? 'person' : order.category === 'pemuda' ? 'people' : 'body'}
                  size={14}
                  color={colors.primary}
                />
                <Text style={[styles.badgeText, { color: colors.primary }]}>
                  {order.category === 'dewasa' ? 'Dewasa' : order.category === 'pemuda' ? 'Pemuda' : 'Anak'}
                </Text>
              </View>
              <View style={[styles.badge, { backgroundColor: colors.infoLight, flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
                <Ionicons
                  name={order.sleeveType === 'pendek' ? 'shirt-outline' : 'shirt'}
                  size={14}
                  color={colors.info}
                />
                <Text style={[styles.badgeText, { color: colors.info }]}>
                  {order.sleeveType === 'pendek' ? 'Pendek' : 'Panjang'}
                </Text>
              </View>
              <View style={[styles.badge, { backgroundColor: colors.secondaryLight, flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
                <Ionicons name="resize" size={14} color={colors.secondary} />
                <Text style={[styles.badgeText, { color: colors.secondary }]}>
                  {order.size}
                </Text>
              </View>
            </View>

            <View style={styles.priceSection}>
              <Text style={styles.priceLabel}>Harga</Text>
              <Text style={styles.priceValue}>{formatCurrency(order.price)}</Text>
            </View>

            {/* Size Selector to Update/Input Size Later */}
            <View style={{ marginTop: Spacing.md, paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: colors.borderLight }}>
              <Text style={[styles.priceLabel, { marginBottom: Spacing.xs, fontSize: FontSize.sm, color: colors.textSecondary }]}>
                {order.size === '-' ? '⚠️ Ukuran belum dipilih, tentukan sekarang:' : 'Ubah Ukuran Kaos:'}
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.xs, paddingVertical: 4 }}>
                {SIZES.filter((sz) => sz !== '-').map((sz) => (
                  <TouchableOpacity
                    key={sz}
                    style={[
                      styles.sizeChip,
                      order.size === sz && styles.sizeChipActive,
                      { minWidth: 44, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, height: 32, justifyContent: 'center', alignItems: 'center' }
                    ]}
                    onPress={() => {
                      if (order.size === sz) return; // Already selected
                      const newPrice = calculatePrice(order.category as any, order.sleeveType as any, sz);
                      const priceDiff = newPrice - order.price;
                      const diffLabel = priceDiff > 0 ? `+${formatCurrency(priceDiff)}` : priceDiff < 0 ? `-${formatCurrency(Math.abs(priceDiff))}` : 'sama';

                      Alert.alert(
                        'Ubah Ukuran?',
                        `Ukuran akan diubah dari "${order.size === '-' ? 'Belum Pilih' : order.size}" ke "${sz}".\n\nHarga: ${formatCurrency(order.price)} → ${formatCurrency(newPrice)} (${diffLabel})`,
                        [
                          { text: 'Batal', style: 'cancel' },
                          {
                            text: 'Ya, Ubah',
                            onPress: async () => {
                              try {
                                setLoading(true);
                                const isPaidOff = order.totalPaid >= newPrice;
                                await updateOrder(orderId, {
                                  size: sz,
                                  price: newPrice,
                                  isPaidOff,
                                });
                                await fetchOrder();
                              } catch (e) {
                                Alert.alert('Gagal', 'Terjadi kesalahan saat mengubah ukuran.');
                              } finally {
                                setLoading(false);
                              }
                            },
                          },
                        ]
                      );
                    }}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.sizeChipText,
                        order.size === sz && styles.sizeChipTextActive
                      ]}
                    >
                      {sz}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Sleeve Type Selector to Update/Input Sleeve Later */}
            <View style={{ marginTop: Spacing.md, paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: colors.borderLight }}>
              <Text style={[styles.priceLabel, { marginBottom: Spacing.xs, fontSize: FontSize.sm, color: colors.textSecondary }]}>
                {order.sleeveType === '-' ? '⚠️ Tipe lengan belum dipilih, tentukan sekarang:' : 'Ubah Tipe Lengan:'}
              </Text>
              <View style={{ flexDirection: 'row', gap: Spacing.xs, paddingVertical: 4 }}>
                {[
                  { label: 'Pendek', value: 'pendek' },
                  { label: 'Panjang', value: 'panjang' }
                ].map((sleeve) => (
                  <TouchableOpacity
                    key={sleeve.value}
                    style={[
                      styles.sizeChip,
                      order.sleeveType === sleeve.value && styles.sizeChipActive,
                      { minWidth: 80, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, height: 32, justifyContent: 'center', alignItems: 'center' }
                    ]}
                    onPress={() => {
                      if (order.sleeveType === sleeve.value) return; // Already selected
                      const newPrice = calculatePrice(order.category as any, sleeve.value as any, order.size as any);
                      const priceDiff = newPrice - order.price;
                      const diffLabel = priceDiff > 0 ? `+${formatCurrency(priceDiff)}` : priceDiff < 0 ? `-${formatCurrency(Math.abs(priceDiff))}` : 'sama';
                      const oldLabel = order.sleeveType === '-' ? 'Belum Pilih' : order.sleeveType === 'pendek' ? 'Pendek' : 'Panjang';

                      Alert.alert(
                        'Ubah Tipe Lengan?',
                        `Tipe lengan akan diubah dari "${oldLabel}" ke "${sleeve.label}".\n\nHarga: ${formatCurrency(order.price)} → ${formatCurrency(newPrice)} (${diffLabel})`,
                        [
                          { text: 'Batal', style: 'cancel' },
                          {
                            text: 'Ya, Ubah',
                            onPress: async () => {
                              try {
                                setLoading(true);
                                const isPaidOff = order.totalPaid >= newPrice;
                                await updateOrder(orderId, {
                                  sleeveType: sleeve.value,
                                  price: newPrice,
                                  isPaidOff,
                                });
                                await fetchOrder();
                              } catch (e) {
                                Alert.alert('Gagal', 'Terjadi kesalahan saat mengubah tipe lengan.');
                              } finally {
                                setLoading(false);
                              }
                            },
                          },
                        ]
                      );
                    }}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.sizeChipText,
                        order.sleeveType === sleeve.value && styles.sizeChipTextActive
                      ]}
                    >
                      {sleeve.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Ceklis Mandiri Lunas untuk Pemuda */}
          {order.category === 'pemuda' && (
            <View style={[styles.orderCard, { marginTop: Spacing.sm }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flex: 1, paddingRight: Spacing.sm }}>
                  <Text style={styles.priceLabel}>Status Pembayaran Mandiri</Text>
                  <Text style={[styles.orderDate, { marginTop: 2 }]}>
                    Tandai iuran Pemuda (Rp 150.000) sebagai lunas tanpa tarikan
                  </Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.sizeChip,
                    order.isPaidOff && styles.sizeChipActive,
                    { minWidth: 90, paddingVertical: Spacing.sm }
                  ]}
                  onPress={async () => {
                    const nextPaidStatus = !order.isPaidOff;
                    try {
                      setLoading(true);
                      await updateOrder(orderId, {
                        isPaidOff: nextPaidStatus,
                        totalPaid: nextPaidStatus ? order.price : 0,
                      });
                      await fetchOrder();
                    } catch (e) {
                      Alert.alert('Gagal', 'Terjadi kesalahan saat mengubah status pembayaran.');
                    } finally {
                      setLoading(false);
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.sizeChipText, order.isPaidOff && styles.sizeChipTextActive]}>
                    {order.isPaidOff ? 'LUNAS ✅' : 'Belum'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Payment Progress Card */}
          <View style={styles.paymentCard}>
            {order.isPaidOff && (
              <View style={styles.lunasBanner}>
                <Text style={styles.lunasText}>✅ LUNAS</Text>
              </View>
            )}

            <Text style={styles.paymentTitle}>Progres Pembayaran</Text>

            {/* Progress Bar */}
            <View style={styles.progressContainer}>
              <View style={styles.progressBarBg}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${paymentPercentage}%`,
                      backgroundColor: order.isPaidOff ? colors.success : colors.primary,
                    },
                  ]}
                />
              </View>
              <Text style={styles.progressPercentage}>{paymentPercentage}%</Text>
            </View>

            {/* Payment Details */}
            <View style={styles.paymentDetails}>
              <View style={styles.paymentDetailItem}>
                <Text style={styles.paymentDetailLabel}>Terbayar</Text>
                <Text style={[styles.paymentDetailValue, { color: colors.success }]}>
                  {formatCurrency(order.totalPaid)}
                </Text>
              </View>
              <View style={styles.paymentDetailDivider} />
              <View style={styles.paymentDetailItem}>
                <Text style={styles.paymentDetailLabel}>Sisa</Text>
                <Text
                  style={[
                    styles.paymentDetailValue,
                    { color: remainingAmount > 0 ? colors.warning : colors.success },
                  ]}
                >
                  {formatCurrency(remainingAmount)}
                </Text>
              </View>
            </View>
          </View>

          {/* Tarikan History */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xs }}>
                <Ionicons name="receipt-outline" size={20} color={colors.text} />
                <Text style={styles.sectionTitle}>
                  Riwayat Tarikan ({installments.length})
                </Text>
              </View>
            </View>

            {installmentsLoading ? (
              <ActivityIndicator
                size="small"
                color={colors.primary}
                style={{ marginVertical: Spacing.lg }}
              />
            ) : installments.length === 0 ? (
              <View style={styles.emptyInstallments}>
                <Ionicons name="card-outline" size={36} color={colors.textTertiary} style={{ marginBottom: Spacing.sm }} />
                <Text style={styles.emptyInstallmentsText}>
                  Belum ada tarikan tercatat
                </Text>
              </View>
            ) : (
              installments.map((installment) => (
                <InstallmentCard
                  key={installment.id}
                  installment={installment}
                  onDelete={() => handleDeleteInstallment(installment.id)}
                />
              ))
            )}
          </View>

          {/* Add Tarikan Form */}
          {!order.isPaidOff && (
            <View style={styles.addInstallmentCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xs }}>
                <Ionicons name="wallet-outline" size={20} color={colors.text} />
                <Text style={styles.addInstallmentTitle}>Tambah Tarikan</Text>
              </View>
              <Text style={styles.addInstallmentHint}>
                Sisa tagihan: {formatCurrency(remainingAmount)}
              </Text>

              {/* Tarikan Number Selector */}
              <View style={{ marginTop: Spacing.xs }}>
                <Text style={styles.addInstallmentHint}>Pilih Tarikan Ke:</Text>
                <View style={{ flexDirection: 'row', gap: Spacing.xs, flexWrap: 'wrap', marginTop: Spacing.xs }}>
                  {[1, 2, 3, 4, 5, 6, 7].map((num) => {
                    const isAlreadyPaid = installments.some((i) => i.tarikanNumber === num);
                    return (
                      <TouchableOpacity
                        key={num}
                        style={[
                          styles.sizeChip,
                          selectedTarikanNumber === num && styles.sizeChipActive,
                          isAlreadyPaid && { opacity: 0.35 },
                          { minWidth: 44, paddingHorizontal: Spacing.sm }
                        ]}
                        onPress={() => {
                          if (isAlreadyPaid) {
                            Alert.alert('Info', `Tarikan ${num} sudah dibayar.`);
                            return;
                          }
                          setSelectedTarikanNumber(num);
                        }}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.sizeChipText,
                            selectedTarikanNumber === num && styles.sizeChipTextActive
                          ]}
                        >
                          {num}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <TextInput
                style={styles.input}
                placeholder="Jumlah pembayaran"
                placeholderTextColor={colors.textTertiary}
                value={newAmount}
                onChangeText={setNewAmount}
                keyboardType="numeric"
              />

              <TextInput
                style={styles.input}
                placeholder="Catatan (opsional)"
                placeholderTextColor={colors.textTertiary}
                value={newNote}
                onChangeText={setNewNote}
              />

              <TouchableOpacity
                style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                onPress={handleAddInstallment}
                disabled={submitting}
                activeOpacity={0.85}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.submitButtonText}>Bayar</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionsSection}>
            <TouchableOpacity
              style={styles.dangerButton}
              onPress={handleDeleteOrder}
              activeOpacity={0.7}
            >
              <Text style={styles.dangerButtonText}>🗑️ Hapus Pesanan</Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function createStyles(colors: typeof Colors.light, isDark: boolean) {
  return StyleSheet.create({
    flex: {
      flex: 1,
    },
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      gap: Spacing.md,
    },
    loadingText: {
      fontSize: FontSize.md,
      color: colors.textSecondary,
      fontWeight: FontWeight.medium,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: Spacing.lg,
      paddingTop: Platform.OS === 'android' ? 40 : Spacing.md,
      paddingBottom: Spacing.md,
      backgroundColor: colors.card,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
    },
    backButton: {
      fontSize: FontSize.md,
      color: colors.primary,
      fontWeight: FontWeight.semibold,
    },
    headerTitle: {
      fontSize: FontSize.lg,
      fontWeight: FontWeight.bold,
      color: colors.text,
    },
    deleteButton: {
      fontSize: 22,
    },
    scrollContent: {
      padding: Spacing.lg,
      gap: Spacing.lg,
    },

    // Order Info Card
    orderCard: {
      backgroundColor: colors.card,
      borderRadius: BorderRadius.xl,
      padding: Spacing.xl,
      borderWidth: 1,
      borderColor: colors.border,
      ...Shadow.md,
    },
    orderHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: Spacing.md,
    },
    orderName: {
      fontSize: FontSize.xl,
      fontWeight: FontWeight.extrabold,
      color: colors.text,
      flex: 1,
    },
    orderDate: {
      fontSize: FontSize.sm,
      color: colors.textTertiary,
      fontWeight: FontWeight.medium,
    },
    badgeRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.sm,
      marginBottom: Spacing.lg,
    },
    badge: {
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.xs,
      borderRadius: BorderRadius.full,
    },
    badgeText: {
      fontSize: FontSize.sm,
      fontWeight: FontWeight.semibold,
    },
    priceSection: {
      borderTopWidth: 1,
      borderTopColor: colors.borderLight,
      paddingTop: Spacing.md,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    priceLabel: {
      fontSize: FontSize.md,
      color: colors.textSecondary,
      fontWeight: FontWeight.medium,
    },
    priceValue: {
      fontSize: FontSize.xxl,
      fontWeight: FontWeight.extrabold,
      color: colors.primary,
    },

    // Payment Progress Card
    paymentCard: {
      backgroundColor: colors.card,
      borderRadius: BorderRadius.xl,
      padding: Spacing.xl,
      borderWidth: 1,
      borderColor: colors.border,
      ...Shadow.md,
    },
    lunasBanner: {
      backgroundColor: colors.successLight,
      borderRadius: BorderRadius.lg,
      paddingVertical: Spacing.md,
      alignItems: 'center',
      marginBottom: Spacing.lg,
      borderWidth: 2,
      borderColor: colors.success,
    },
    lunasText: {
      fontSize: FontSize.xl,
      fontWeight: FontWeight.extrabold,
      color: colors.success,
      letterSpacing: 2,
    },
    paymentTitle: {
      fontSize: FontSize.md,
      fontWeight: FontWeight.semibold,
      color: colors.text,
      marginBottom: Spacing.md,
    },
    progressContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      marginBottom: Spacing.lg,
    },
    progressBarBg: {
      flex: 1,
      height: 12,
      backgroundColor: colors.backgroundElement,
      borderRadius: 6,
      overflow: 'hidden',
    },
    progressBarFill: {
      height: '100%',
      borderRadius: 6,
    },
    progressPercentage: {
      fontSize: FontSize.lg,
      fontWeight: FontWeight.bold,
      color: colors.text,
      minWidth: 50,
      textAlign: 'right',
    },
    paymentDetails: {
      flexDirection: 'row',
      backgroundColor: colors.backgroundElement,
      borderRadius: BorderRadius.lg,
      padding: Spacing.md,
    },
    paymentDetailItem: {
      flex: 1,
      alignItems: 'center',
    },
    paymentDetailLabel: {
      fontSize: FontSize.xs,
      color: colors.textSecondary,
      fontWeight: FontWeight.medium,
      marginBottom: Spacing.xs,
    },
    paymentDetailValue: {
      fontSize: FontSize.lg,
      fontWeight: FontWeight.bold,
    },
    paymentDetailDivider: {
      width: 1,
      backgroundColor: colors.border,
    },

    // Installment History
    section: {
      gap: Spacing.sm,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: Spacing.sm,
    },
    sectionTitle: {
      fontSize: FontSize.lg,
      fontWeight: FontWeight.bold,
      color: colors.text,
    },
    emptyInstallments: {
      backgroundColor: colors.card,
      borderRadius: BorderRadius.lg,
      padding: Spacing.xxl,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    emptyInstallmentsIcon: {
      fontSize: 36,
      marginBottom: Spacing.sm,
    },
    emptyInstallmentsText: {
      fontSize: FontSize.md,
      color: colors.textTertiary,
      fontWeight: FontWeight.medium,
    },

    // Add Installment Form
    addInstallmentCard: {
      backgroundColor: colors.card,
      borderRadius: BorderRadius.xl,
      padding: Spacing.xl,
      borderWidth: 2,
      borderColor: colors.primary,
      borderStyle: 'dashed',
      gap: Spacing.md,
    },
    addInstallmentTitle: {
      fontSize: FontSize.lg,
      fontWeight: FontWeight.bold,
      color: colors.text,
    },
    addInstallmentHint: {
      fontSize: FontSize.sm,
      color: colors.textSecondary,
      fontWeight: FontWeight.medium,
    },
    input: {
      backgroundColor: colors.backgroundElement,
      borderRadius: BorderRadius.md,
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
      fontSize: FontSize.md,
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.border,
    },
    submitButton: {
      backgroundColor: colors.primary,
      borderRadius: BorderRadius.lg,
      paddingVertical: Spacing.md,
      alignItems: 'center',
      justifyContent: 'center',
      ...Shadow.md,
      minHeight: 48,
    },
    submitButtonDisabled: {
      opacity: 0.6,
    },
    submitButtonText: {
      fontSize: FontSize.md,
      fontWeight: FontWeight.bold,
      color: '#ffffff',
    },

    // Action Buttons
    actionsSection: {
      gap: Spacing.sm,
    },
    actionButton: {
      backgroundColor: colors.primary,
      borderRadius: BorderRadius.lg,
      paddingVertical: Spacing.md,
      alignItems: 'center',
    },
    actionButtonText: {
      fontSize: FontSize.md,
      fontWeight: FontWeight.bold,
      color: '#ffffff',
    },
    dangerButton: {
      backgroundColor: colors.dangerLight,
      borderRadius: BorderRadius.lg,
      paddingVertical: Spacing.md,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.danger,
    },
    dangerButtonText: {
      fontSize: FontSize.md,
      fontWeight: FontWeight.semibold,
      color: colors.danger,
    },
    sizeChip: {
      paddingVertical: Spacing.sm,
      paddingHorizontal: Spacing.md,
      borderRadius: BorderRadius.full,
      backgroundColor: colors.backgroundElement,
      borderWidth: 2,
      borderColor: colors.border,
      minWidth: 44,
      alignItems: 'center',
    },
    sizeChipActive: {
      backgroundColor: colors.primaryLight,
      borderColor: colors.primary,
    },
    sizeChipText: {
      fontSize: FontSize.sm,
      fontWeight: FontWeight.semibold,
      color: colors.textSecondary,
    },
    sizeChipTextActive: {
      color: colors.primary,
      fontWeight: FontWeight.bold,
    },
  });
}
