/**
 * useOrders Hook
 *
 * Subscribes to all orders in realtime via Firestore and exposes
 * reactive state: orders, loading, refreshing, and error.
 */

import { useCallback, useEffect, useState } from 'react';

import { subscribeToOrders, type Order } from '@/services/firestoreService';

export function useOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToOrders(
      (data) => {
        setOrders(data);
        setLoading(false);
        setRefreshing(false);
        setError(null);
      },
      (err) => {
        console.error('[useOrders] Subscription error:', err);
        setError(err.message);
        setLoading(false);
        setRefreshing(false);
      },
    );

    return unsubscribe;
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // The realtime listener will automatically provide fresh data.
    // We simulate refresh for UX by setting a timeout.
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  return { orders, loading, refreshing, onRefresh, error };
}
