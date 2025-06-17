// src/firebase/clientApp.ts

// Importa solo los módulos necesarios del SDK de Cliente de Firebase (¡NO firebase-admin!)
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import {
  getFirestore,
  connectFirestoreEmulator,
  Firestore,
} from "firebase/firestore";
import { getAuth, connectAuthEmulator, Auth } from "firebase/auth"; // Importa getAuth y connectAuthEmulator
import {
  getStorage,
  connectStorageEmulator,
  FirebaseStorage,
} from "firebase/storage";

// La configuración de Firebase usando las variables de entorno NEXT_PUBLIC_
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  //measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID, // Solo si usas Google Analytics para Firebase
};

// Inicializa Firebase solo si no ha sido inicializado ya (común en Next.js con SSR)
let app: FirebaseApp;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp(); // Si ya existe, usa la app existente
}

// Obtén las instancias de los servicios del SDK de Cliente
const db: Firestore = getFirestore(app);
// 💡 Modificación clave: Declara 'auth' pero no la inicialices inmediatamente
let auth: Auth | null = null;
const storage: FirebaseStorage = getStorage(app);

// 🚀 Conexión automática a los emuladores en desarrollo local 🚀
// Verifica si la variable NEXT_PUBLIC_FIREBASE_EMULATOR está establecida a 'true'
// Y verifica si estamos en el navegador
if (
  typeof window !== "undefined" &&
  process.env.NEXT_PUBLIC_FIREBASE_EMULATOR === "true"
) {
  console.log("🔥 Conectando al Emulator Suite 🔥");

  // Conecta Firestore al emulador
  const [firestoreHost, firestorePort] = (
    process.env.FIREBASE_FIRESTORE_EMULATOR_HOST || "localhost:8080"
  ).split(":");
  connectFirestoreEmulator(db, firestoreHost, parseInt(firestorePort, 10));
  console.log(`Firestore Emulator: http://${firestoreHost}:${firestorePort}`);

  // 💡 Modificación clave: Conecta Authentication al emulador SOLO en el cliente
  // Asegúrate de obtener la instancia 'auth' primero si aún no la tienes
  auth = getAuth(app); // Obtén la instancia de Auth aquí, dentro del bloque cliente
  const [authHost, authPort] = (
    process.env.FIREBASE_AUTH_EMULATOR_HOST || "localhost:9099"
  ).split(":");
  connectAuthEmulator(auth, `http://${authHost}:${authPort}`); // Auth emulator requires http:// prefix
  console.log(`Auth Emulator: http://${authHost}:${authPort}`);

  // Conecta Storage al emulador (si lo usas)
  const [storageHost, storagePort] = (
    process.env.FIREBASE_STORAGE_EMULATOR_HOST || "localhost:9199"
  ).split(":");
  connectStorageEmulator(storage, storageHost, parseInt(storagePort, 10));
  console.log(`Storage Emulator: http://${storageHost}:${storagePort}`);

  // Nota: Las Cloud Functions (si las llamas desde el cliente)
  // se configuran automáticamente si se usa firebase-tools con el emulador.
  // Si necesitas configurarlas manualmente, usarías connectFunctionsEmulator:
  // const { getFunctions, connectFunctionsEmulator } = await import('firebase/functions');
  // const functions = getFunctions(app);
  // const [functionsHost, functionsPort] = (process.env.FIREBASE_FUNCTIONS_EMULATOR_HOST || 'localhost:5001').split(':');
  // connectFunctionsEmulator(functions, functionsHost, parseInt(functionsPort, 10));
  // console.log(`Functions Emulator: http://${functionsHost}:${functionsPort}`);
} else if (typeof window !== "undefined") {
  // 💡 Modificación clave: Obtén la instancia de Auth en el cliente aunque no uses emuladores
  auth = getAuth(app);
}

// Exporta las instancias de los servicios para que puedan ser usadas en otros archivos de tu app
export { app, db, auth, storage }; // 'auth' ahora puede ser null en el servidor

// Nota: serverApp.ts parece correcto para usar el SDK de Admin en el servidor.
// El error que viste ('auth/invalid-api-key') es del SDK CLIENTE,
// por lo que la modificación en clientApp.ts es la que debería resolverlo.
