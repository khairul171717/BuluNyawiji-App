/**
 * useInstallments Hook
 *
 * Subscribes to the installments subcollection for a specific order
 * in realtime. Automatically re-subscribes when orderId changes and
 * cleans up on unmount.
 */

import { useEffect, useState } from 'react';

import { subscribeToInstallments, type Installment } from '@/services/firestoreService';

export function useInstallments(orderId: string) {
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Reset state when the orderId changes.
    setInstallments([]);
    setLoading(true);

    if (!orderId) {
      setLoading(false);
      return;
    }

    const unsubscribe = subscribeToInstallments(
      orderId,
      (data) => {
        setInstallments(data);
        setLoading(false);
      },
      (err) => {
        console.error(`[useInstallments] Error for order ${orderId}:`, err);
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [orderId]);

  return { installments, loading };
}
