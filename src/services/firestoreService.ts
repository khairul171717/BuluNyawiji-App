/**
 * Firestore Service Layer
 *
 * Handles all Firestore operations for Orders and Installments.
 * Uses Firebase modular API (v9+) with realtime listeners.
 */

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  getDoc,
  getDocs,
  Timestamp,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';

import { db } from '@/config/firebaseConfig';
import { calculatePrice, type Category, type SleeveType, type Size } from '@/utils/pricing';

// ---------------------------------------------------------------------------
// Data Models
// ---------------------------------------------------------------------------

export interface Order {
  id: string;
  name: string;
  category: Category;
  sleeveType: SleeveType;
  size: Size;
  price: number;
  totalPaid: number;
  isPaidOff: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Installment {
  id: string;
  amount: number;
  note: string;
  paidAt: Timestamp;
  tarikanNumber: number; // 1 to 7
}

// ---------------------------------------------------------------------------
// Input types (what callers pass in — id & computed fields are excluded)
// ---------------------------------------------------------------------------

export type OrderInput = Omit<Order, 'id' | 'price' | 'totalPaid' | 'isPaidOff' | 'createdAt' | 'updatedAt'> & {
  totalPaid?: number;
  isPaidOff?: boolean;
};

export type OrderUpdateInput = Partial<Omit<Order, 'id' | 'createdAt' | 'updatedAt'>>;

// ---------------------------------------------------------------------------
// Collection references
// ---------------------------------------------------------------------------

const ordersRef = collection(db, 'orders');

function installmentsRef(orderId: string) {
  return collection(db, 'orders', orderId, 'installments');
}

// ---------------------------------------------------------------------------
// Order Operations
// ---------------------------------------------------------------------------

/**
 * Add a new order. Price is automatically calculated from category, sleeveType,
 * and size using the pricing utility.
 */
export async function addOrder(orderData: OrderInput): Promise<string> {
  const price = calculatePrice(orderData.category, orderData.sleeveType, orderData.size);
  const totalPaid = orderData.totalPaid ?? 0;
  const isPaidOff = orderData.isPaidOff ?? (totalPaid >= price);

  const docRef = await addDoc(ordersRef, {
    name: orderData.name,
    category: orderData.category,
    sleeveType: orderData.sleeveType,
    size: orderData.size,
    price,
    totalPaid,
    isPaidOff,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
}

/**
 * Partially update an existing order.
 *
 * If category, sleeveType, or size are changed the price is recalculated
 * and isPaidOff is re-evaluated against the current totalPaid.
 */
export async function updateOrder(id: string, data: OrderUpdateInput): Promise<void> {
  const orderDoc = doc(db, 'orders', id);

  // If any pricing-related field changed we need to recalculate price.
  const needsRecalc =
    data.category !== undefined || data.sleeveType !== undefined || data.size !== undefined;

  let updatePayload: Record<string, unknown> = {
    ...data,
    updatedAt: serverTimestamp(),
  };

  if (needsRecalc) {
    // Fetch the current order to fill in any fields not provided in `data`.
    const snap = await getDoc(orderDoc);
    if (!snap.exists()) throw new Error(`Order ${id} not found`);
    const current = snap.data() as Omit<Order, 'id'>;

    const category = data.category ?? current.category;
    const sleeveType = data.sleeveType ?? current.sleeveType;
    const size = data.size ?? current.size;
    const newPrice = calculatePrice(category, sleeveType, size);
    const totalPaid = data.totalPaid ?? current.totalPaid;

    updatePayload = {
      ...updatePayload,
      price: newPrice,
      isPaidOff: totalPaid >= newPrice,
    };
  }

  await updateDoc(orderDoc, updatePayload);
}

/**
 * Delete an order and all of its installment sub-documents in a single batch.
 */
export async function deleteOrder(id: string): Promise<void> {
  const batch = writeBatch(db);

  // Queue all installments for deletion first.
  const instSnap = await getDocs(installmentsRef(id));
  instSnap.forEach((instDoc) => {
    batch.delete(instDoc.ref);
  });

  // Queue the order itself.
  batch.delete(doc(db, 'orders', id));

  await batch.commit();
}

/**
 * Subscribe to all orders in realtime, ordered by createdAt descending.
 * Returns an unsubscribe function.
 */
export function subscribeToOrders(
  callback: (orders: Order[]) => void,
  onError?: (error: Error) => void,
): () => void {
  const q = query(ordersRef, orderBy('createdAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const orders: Order[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as Order[];
      callback(orders);
    },
    (error) => {
      console.error('[firestoreService] subscribeToOrders error:', error);
      onError?.(error);
    },
  );
}

/**
 * Fetch a single order by ID.
 */
export async function getOrderById(id: string): Promise<Order | null> {
  const snap = await getDoc(doc(db, 'orders', id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Order;
}

// ---------------------------------------------------------------------------
// Installment Operations
// ---------------------------------------------------------------------------

/**
 * Add an installment to the given order's sub-collection.
 * The parent order's `totalPaid` and `isPaidOff` are recalculated
 * atomically via a batch write.
 */
export async function addInstallment(
  orderId: string,
  amount: number,
  tarikanNumber: number,
  note: string = '',
): Promise<string> {
  // Fetch the parent order to compute new totals.
  const orderDocRef = doc(db, 'orders', orderId);
  const orderSnap = await getDoc(orderDocRef);
  if (!orderSnap.exists()) throw new Error(`Order ${orderId} not found`);

  const order = orderSnap.data() as Omit<Order, 'id'>;
  const newTotalPaid = order.totalPaid + amount;
  const isPaidOff = newTotalPaid >= order.price;

  // Use a batch so the installment and the order update are atomic.
  const batch = writeBatch(db);

  const instRef = doc(installmentsRef(orderId));
  batch.set(instRef, {
    amount,
    note,
    tarikanNumber,
    paidAt: serverTimestamp(),
  });

  batch.update(orderDocRef, {
    totalPaid: newTotalPaid,
    isPaidOff,
    updatedAt: serverTimestamp(),
  });

  await batch.commit();

  return instRef.id;
}

/**
 * Subscribe to installments for a given order in realtime,
 * ordered by tarikanNumber ascending.
 */
export function subscribeToInstallments(
  orderId: string,
  callback: (installments: Installment[]) => void,
  onError?: (error: Error) => void,
): () => void {
  const q = query(installmentsRef(orderId), orderBy('tarikanNumber', 'asc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const installments: Installment[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as Installment[];
      callback(installments);
    },
    (error) => {
      console.error('[firestoreService] subscribeToInstallments error:', error);
      onError?.(error);
    },
  );
}

/**
 * Delete a single installment and recalculate the parent order's
 * `totalPaid` and `isPaidOff` from the remaining installments.
 */
export async function deleteInstallment(
  orderId: string,
  installmentId: string,
): Promise<void> {
  const orderDocRef = doc(db, 'orders', orderId);
  const orderSnap = await getDoc(orderDocRef);
  if (!orderSnap.exists()) throw new Error(`Order ${orderId} not found`);

  const order = orderSnap.data() as Omit<Order, 'id'>;

  // Fetch all installments to recalculate (excluding the one being deleted).
  const allSnap = await getDocs(installmentsRef(orderId));
  let recalculatedTotal = 0;
  allSnap.forEach((d) => {
    if (d.id !== installmentId) {
      recalculatedTotal += (d.data() as Installment).amount;
    }
  });

  const batch = writeBatch(db);

  batch.delete(doc(db, 'orders', orderId, 'installments', installmentId));

  batch.update(orderDocRef, {
    totalPaid: recalculatedTotal,
    isPaidOff: recalculatedTotal >= order.price,
    updatedAt: serverTimestamp(),
  });

  await batch.commit();
}
