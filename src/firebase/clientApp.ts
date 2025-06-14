// src/firebase/clientApp.ts
// Importamos las funciones necesarias de los SDKs del cliente
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth"; // Para Firebase Authentication
import { getFirestore } from "firebase/firestore"; // Para Cloud Firestore
import { getStorage } from "firebase/storage"; // <--- ¡Importamos getStorage para Firebase Storage!

console.log("[Firebase Client App] Ejecutando inicialización del cliente...");

// Tu configuración de Firebase (usando variables de entorno)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Inicializa Firebase para el cliente
// Asegura que la app solo se inicialice una vez en Next.js (maneja SSR)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Obtiene las instancias de los servicios usando la app inicializada
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app); // <--- ¡Inicializamos Firebase Storage!

// Exporta todas las instancias necesarias para los componentes del cliente
export { app, auth, db, storage }; // <--- ¡Exportamos 'storage' aquí!
