/**
 * Firebase Configuration
 *
 * PENTING: Isi konfigurasi di bawah dengan data dari Firebase Console.
 * Buka: https://console.firebase.google.com/project/bulunyawiji/settings/general
 * Klik "Add app" → Web → Copy config values
 */

import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';
import { Platform } from 'react-native';

const firebaseConfig = {
  apiKey: 'AIzaSyDdFhBLzRmYvDmOJPa0u7_y3DcENrLRrRQ',
  authDomain: 'bulunyawiji.firebaseapp.com',
  projectId: 'bulunyawiji',
  storageBucket: 'bulunyawiji.firebasestorage.app',
  messagingSenderId: '420251173325',
  appId: '1:420251173325:android:3a493dc9e936db1ee04484',
};

const app = initializeApp(firebaseConfig);

// Initialize Firestore with offline persistence (web only)
let db;
if (Platform.OS === 'web') {
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
    }),
  });
} else {
  db = getFirestore(app);
}

export { db };
export default app;
