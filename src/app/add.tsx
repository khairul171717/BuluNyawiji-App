import React, { useState, useMemo } from 'react';
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
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { addOrder, addInstallment } from '@/services/firestoreService';
import {
  calculatePrice,
  formatCurrency,
  SIZES,
  CATEGORIES,
  SLEEVE_TYPES,
  Category,
  SleeveType,
  Size,
} from '@/utils/pricing';
import {
  Colors,
  Spacing,
  BorderRadius,
  Shadow,
  FontSize,
  FontWeight,
} from '@/constants/theme';

interface TarikanInputEntry {
  id: string;
  amount: string;
  tarikanNumber: number;
  note: string;
}

export default function AddOrderScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;

  const [name, setName] = useState('');
  const [category, setCategory] = useState<Category>('dewasa');
  const [sleeveType, setSleeveType] = useState<SleeveType>('-');
  const [size, setSize] = useState<Size>('-');
  const [addedTarikanList, setAddedTarikanList] = useState<TarikanInputEntry[]>([]);
  const [isManualPaidOff, setIsManualPaidOff] = useState(false);
  const [saving, setSaving] = useState(false);

  const price = useMemo(
    () => calculatePrice(category, sleeveType, size),
    [category, sleeveType, size]
  );

  const handleAddTarikanEntry = () => {
    const usedNumbers = addedTarikanList.map((t) => t.tarikanNumber);
    const nextAvailable = [1, 2, 3, 4, 5, 6, 7].find((num) => !usedNumbers.includes(num));
    if (!nextAvailable) {
      Alert.alert('Maksimal', 'Semua 7 tarikan sudah ditambahkan.');
      return;
    }
    setAddedTarikanList([
      ...addedTarikanList,
      {
        id: Math.random().toString(36).substring(2, 9),
        amount: '',
        tarikanNumber: nextAvailable,
        note: '',
      },
    ]);
  };

  const handleUpdateTarikanEntry = (id: string, fields: Partial<TarikanInputEntry>) => {
    setAddedTarikanList(
      addedTarikanList.map((t) => (t.id === id ? { ...t, ...fields } : t))
    );
  };

  const handleDeleteTarikanEntry = (id: string) => {
    setAddedTarikanList(addedTarikanList.filter((t) => t.id !== id));
  };

  const handleSave = async () => {
    // Validate
    if (!name.trim()) {
      Alert.alert('Validasi', 'Nama pemesan tidak boleh kosong.');
      return;
    }

    const isPemuda = category === 'pemuda';

    // Validate all added tarikan entries
    const invalidEntry = addedTarikanList.find((t) => {
      const amt = parseInt(t.amount.replace(/\D/g, ''), 10) || 0;
      return amt <= 0;
    });
    if (invalidEntry) {
      Alert.alert('Validasi', `Jumlah pembayaran Tarikan Ke-${invalidEntry.tarikanNumber} tidak boleh kosong atau nol.`);
      return;
    }

    // Check duplicate tarikan numbers
    const usedNumbers = addedTarikanList.map((t) => t.tarikanNumber);
    const duplicates = usedNumbers.filter((item, index) => usedNumbers.indexOf(item) !== index);
    if (duplicates.length > 0) {
      Alert.alert('Validasi', `Tarikan Ke-${duplicates[0]} dipilih lebih dari sekali.`);
      return;
    }

    const totalTarikanAmount = isManualPaidOff ? 0 : addedTarikanList.reduce((sum, t) => {
      const amt = parseInt(t.amount.replace(/\D/g, ''), 10) || 0;
      return sum + amt;
    }, 0);

    if (!isManualPaidOff && totalTarikanAmount > price) {
      Alert.alert('Validasi', `Total pembayaran tarikan (${formatCurrency(totalTarikanAmount)}) tidak boleh melebihi harga kaos (${formatCurrency(price)}).`);
      return;
    }

    setSaving(true);
    try {
      const orderId = await addOrder({
        name: name.trim(),
        category,
        sleeveType,
        size,
        totalPaid: (isPemuda && isManualPaidOff) ? price : 0,
        isPaidOff: isPemuda && isManualPaidOff,
      });

      if (!isManualPaidOff && orderId) {
        for (const t of addedTarikanList) {
          const amt = parseInt(t.amount.replace(/\D/g, ''), 10) || 0;
          await addInstallment(
            orderId, 
            amt, 
            t.tarikanNumber,
            t.note.trim() || `Tarikan ${t.tarikanNumber}`
          );
        }
      }

      Alert.alert('Berhasil', `Pesanan "${name.trim()}" berhasil ditambahkan!`, [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error('Error saving order:', error);
      Alert.alert('Gagal', 'Terjadi kesalahan saat menyimpan. Silakan coba lagi.');
    } finally {
      setSaving(false);
    }
  };

  const styles = createStyles(colors, isDark);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="arrow-back" size={20} color={colors.primary} />
            <Text style={styles.backButton}>Kembali</Text>
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Image
              source={require('../../assets/images/logo-nyawiji.jpeg')}
              style={{ width: 24, height: 24, borderRadius: 4, borderWidth: 1, borderColor: colors.borderLight }}
            />
            <Text style={styles.headerTitle}>Tambah Pesanan</Text>
          </View>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Nama Section */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Nama Pemesan</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Masukkan nama lengkap..."
              placeholderTextColor={colors.textTertiary}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              autoCorrect={false}
            />
          </View>

          {/* Kategori Section */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Kategori</Text>
            <View style={styles.toggleRow}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.value}
                  style={[
                    styles.toggleButton,
                    category === cat.value && styles.toggleButtonActive,
                  ]}
                  onPress={() => {
                    setCategory(cat.value);
                    if (cat.value !== 'pemuda') {
                      setIsManualPaidOff(false);
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xs }}>
                    <Ionicons
                      name={cat.value === 'dewasa' ? 'person-outline' : cat.value === 'pemuda' ? 'people-outline' : 'body-outline'}
                      size={16}
                      color={category === cat.value ? colors.primary : colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.toggleButtonText,
                        category === cat.value && styles.toggleButtonTextActive,
                      ]}
                    >
                      {cat.label}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Lengan Section */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Tipe Lengan</Text>
            <View style={styles.toggleRow}>
              {SLEEVE_TYPES.map((sleeve) => (
                <TouchableOpacity
                  key={sleeve.value}
                  style={[
                    styles.toggleButton,
                    sleeveType === sleeve.value && styles.toggleButtonActive,
                  ]}
                  onPress={() => setSleeveType(sleeve.value)}
                  activeOpacity={0.7}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xs }}>
                    <Ionicons
                      name={sleeve.value === '-' ? 'help-circle-outline' : sleeve.value === 'pendek' ? 'shirt-outline' : 'shirt'}
                      size={16}
                      color={sleeveType === sleeve.value ? colors.primary : colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.toggleButtonText,
                        sleeveType === sleeve.value && styles.toggleButtonTextActive,
                      ]}
                    >
                      {sleeve.label}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Ukuran Section */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Ukuran</Text>
            <View style={styles.sizeGrid}>
              {SIZES.map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[
                    styles.sizeChip,
                    size === s && styles.sizeChipActive,
                  ]}
                  onPress={() => setSize(s)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.sizeChipText,
                      size === s && styles.sizeChipTextActive,
                    ]}
                  >
                    {s === '-' ? 'Belum Pilih' : s}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Price Display Card */}
          <View style={styles.priceCard}>
            <View style={styles.priceHeader}>
              <Text style={styles.priceLabel}>Harga Kaos</Text>
              <View style={styles.priceBadgeRow}>
                <View style={styles.priceBadge}>
                  <Text style={styles.priceBadgeText}>
                    {category === 'dewasa' ? 'Dewasa' : category === 'pemuda' ? 'Pemuda' : 'Anak'}
                  </Text>
                </View>
                <View style={styles.priceBadge}>
                  <Text style={styles.priceBadgeText}>
                    {sleeveType === '-' ? 'Belum Pilih' : sleeveType === 'pendek' ? 'Pendek' : 'Panjang'}
                  </Text>
                </View>
                <View style={styles.priceBadge}>
                  <Text style={styles.priceBadgeText}>{size}</Text>
                </View>
              </View>
            </View>
            <Text style={styles.priceAmount}>
              {category === 'pemuda' ? formatCurrency(150000) : formatCurrency(price)}
            </Text>
          </View>

          {/* Ceklis Mandiri Lunas untuk Pemuda */}
          {category === 'pemuda' && (
            <View style={styles.card}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flex: 1, paddingRight: Spacing.sm }}>
                  <Text style={styles.cardLabel}>Status Pembayaran</Text>
                  <Text style={styles.cardHint}>Ceklis jika iuran Pemuda (Rp 150.000) sudah lunas</Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.sizeChip,
                    isManualPaidOff && styles.sizeChipActive,
                    { minWidth: 90, paddingVertical: Spacing.sm }
                  ]}
                  onPress={() => {
                    setIsManualPaidOff(!isManualPaidOff);
                    if (!isManualPaidOff) {
                      setAddedTarikanList([]); // Clear
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.sizeChipText, isManualPaidOff && styles.sizeChipTextActive]}>
                    {isManualPaidOff ? 'LUNAS ✅' : 'Belum'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Tarikan Section */}
          {!isManualPaidOff && (
            <View style={styles.card}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm }}>
                <Text style={styles.cardLabel}>Daftar Tarikan Awal</Text>
                <TouchableOpacity
                  style={[
                    styles.sizeChip,
                    styles.sizeChipActive,
                    { minWidth: 80, paddingVertical: Spacing.xs, paddingHorizontal: Spacing.sm, flexDirection: 'row', alignItems: 'center', gap: 4 }
                  ]}
                  onPress={handleAddTarikanEntry}
                  activeOpacity={0.7}
                >
                  <Ionicons name="add" size={16} color={colors.primary} />
                  <Text style={styles.sizeChipTextActive}>Tambah</Text>
                </TouchableOpacity>
              </View>

              {addedTarikanList.length === 0 ? (
                <Text style={[styles.cardHint, { textAlign: 'center', marginVertical: Spacing.md }]}>
                  Belum ada tarikan awal yang dimasukkan. Ketuk "+ Tambah" di atas untuk mencatat pembayaran.
                </Text>
              ) : (
                addedTarikanList.map((entry) => {
                  const usedNumbers = addedTarikanList.map((t) => t.tarikanNumber);
                  return (
                    <View
                      key={entry.id}
                      style={{
                        padding: Spacing.md,
                        borderRadius: BorderRadius.md,
                        backgroundColor: colors.backgroundElement,
                        marginBottom: Spacing.md,
                        borderWidth: 1,
                        borderColor: colors.borderLight,
                      }}
                    >
                      {/* Entry Header */}
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xs }}>
                        <Text style={[styles.cardLabel, { fontSize: FontSize.sm, color: colors.textSecondary }]}>
                          Tarikan Ke-
                        </Text>
                        <TouchableOpacity
                          onPress={() => handleDeleteTarikanEntry(entry.id)}
                          activeOpacity={0.7}
                          style={{ padding: 4 }}
                        >
                          <Ionicons name="trash-outline" size={18} color={colors.danger} />
                        </TouchableOpacity>
                      </View>

                      {/* Tarikan Number Chips */}
                      <View style={{ flexDirection: 'row', gap: Spacing.xs, flexWrap: 'wrap', marginBottom: Spacing.md }}>
                        {[1, 2, 3, 4, 5, 6, 7].map((num) => {
                          const isUsedByOther = usedNumbers.includes(num) && entry.tarikanNumber !== num;
                          return (
                            <TouchableOpacity
                              key={num}
                              style={[
                                styles.sizeChip,
                                entry.tarikanNumber === num && styles.sizeChipActive,
                                isUsedByOther && { opacity: 0.25 },
                                { minWidth: 38, paddingHorizontal: 0, paddingVertical: Spacing.xs }
                              ]}
                              onPress={() => {
                                if (isUsedByOther) {
                                  Alert.alert('Validasi', `Tarikan ${num} sudah dipilih di entri lain.`);
                                  return;
                                }
                                handleUpdateTarikanEntry(entry.id, { tarikanNumber: num });
                              }}
                              activeOpacity={0.7}
                            >
                              <Text
                                style={[
                                  styles.sizeChipText,
                                  entry.tarikanNumber === num && styles.sizeChipTextActive
                                ]}
                              >
                                {num}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>

                      {/* Amount Input */}
                      <TextInput
                        style={[styles.textInput, { height: 44, marginBottom: Spacing.sm }]}
                        placeholder="Jumlah Pembayaran"
                        placeholderTextColor={colors.textTertiary}
                        value={entry.amount}
                        onChangeText={(text) => handleUpdateTarikanEntry(entry.id, { amount: text })}
                        keyboardType="numeric"
                      />

                      {/* Note Input */}
                      <TextInput
                        style={[styles.textInput, { height: 44 }]}
                        placeholder="Catatan (opsional)"
                        placeholderTextColor={colors.textTertiary}
                        value={entry.note}
                        onChangeText={(text) => handleUpdateTarikanEntry(entry.id, { note: text })}
                      />
                    </View>
                  );
                })
              )}
            </View>
          )}

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, saving && styles.submitButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}
          >
             {saving ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                <Ionicons name="save-outline" size={20} color="#ffffff" />
                <Text style={styles.submitButtonText}>Simpan Pesanan</Text>
              </View>
            )}
          </TouchableOpacity>

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
    scrollContent: {
      padding: Spacing.lg,
      gap: Spacing.lg,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: BorderRadius.lg,
      padding: Spacing.lg,
      borderWidth: 1,
      borderColor: colors.border,
      ...Shadow.sm,
    },
    cardLabel: {
      fontSize: FontSize.md,
      fontWeight: FontWeight.semibold,
      color: colors.text,
      marginBottom: Spacing.sm,
    },
    cardHint: {
      fontSize: FontSize.sm,
      color: colors.textTertiary,
      marginBottom: Spacing.sm,
    },
    textInput: {
      backgroundColor: colors.backgroundElement,
      borderRadius: BorderRadius.md,
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
      fontSize: FontSize.md,
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.border,
    },
    toggleRow: {
      flexDirection: 'row',
      gap: Spacing.sm,
    },
    toggleButton: {
      flex: 1,
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.lg,
      borderRadius: BorderRadius.md,
      backgroundColor: colors.backgroundElement,
      borderWidth: 2,
      borderColor: colors.border,
      alignItems: 'center',
    },
    toggleButtonActive: {
      backgroundColor: colors.primaryLight,
      borderColor: colors.primary,
    },
    toggleButtonText: {
      fontSize: FontSize.md,
      fontWeight: FontWeight.medium,
      color: colors.textSecondary,
    },
    toggleButtonTextActive: {
      color: colors.primary,
      fontWeight: FontWeight.bold,
    },
    sizeGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.sm,
    },
    sizeChip: {
      paddingVertical: Spacing.sm,
      paddingHorizontal: Spacing.lg,
      borderRadius: BorderRadius.full,
      backgroundColor: colors.backgroundElement,
      borderWidth: 2,
      borderColor: colors.border,
      minWidth: 56,
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
    priceCard: {
      backgroundColor: colors.primaryLight,
      borderRadius: BorderRadius.xl,
      padding: Spacing.xl,
      borderWidth: 2,
      borderColor: colors.primary,
      alignItems: 'center',
      ...Shadow.md,
    },
    priceHeader: {
      alignItems: 'center',
      marginBottom: Spacing.md,
    },
    priceLabel: {
      fontSize: FontSize.sm,
      fontWeight: FontWeight.semibold,
      color: colors.primary,
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: Spacing.sm,
    },
    priceBadgeRow: {
      flexDirection: 'row',
      gap: Spacing.xs,
    },
    priceBadge: {
      backgroundColor: isDark ? colors.backgroundSelected : '#ffffff',
      paddingHorizontal: Spacing.sm,
      paddingVertical: Spacing.xs,
      borderRadius: BorderRadius.full,
    },
    priceBadgeText: {
      fontSize: FontSize.xs,
      fontWeight: FontWeight.semibold,
      color: colors.primary,
    },
    priceAmount: {
      fontSize: FontSize.display,
      fontWeight: FontWeight.extrabold,
      color: colors.primary,
      letterSpacing: -1,
    },
    installmentPreview: {
      fontSize: FontSize.sm,
      color: colors.success,
      fontWeight: FontWeight.medium,
      marginTop: Spacing.sm,
    },
    submitButton: {
      backgroundColor: colors.primary,
      borderRadius: BorderRadius.lg,
      paddingVertical: Spacing.lg,
      alignItems: 'center',
      justifyContent: 'center',
      ...Shadow.lg,
      minHeight: 56,
    },
    submitButtonDisabled: {
      opacity: 0.6,
    },
    submitButtonText: {
      fontSize: FontSize.lg,
      fontWeight: FontWeight.bold,
      color: '#ffffff',
    },
  });
}
