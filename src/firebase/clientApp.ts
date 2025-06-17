// Importa solo los módulos necesarios del SDK de Cliente de Firebase (¡NO firebase-admin!)
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import {
  getFirestore,
  connectFirestoreEmulator,
  Firestore,
} from "firebase/firestore"; // Asegúrate de importar connectFirestoreEmulator y Firestore
import { getAuth, connectAuthEmulator, Auth } from "firebase/auth"; // Asegúrate de importar connectAuthEmulator y Auth
import {
  getStorage,
  connectStorageEmulator,
  FirebaseStorage,
} from "firebase/storage"; // Si usas Cloud Storage, importa sus partes también

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
const auth: Auth = getAuth(app);
const storage: FirebaseStorage = getStorage(app); // Si usas Cloud Storage

// 🚀 Conexión automática a los emuladores en desarrollo local 🚀
// Verifica si la variable NEXT_PUBLIC_FIREBASE_EMULATOR está establecida a 'true'
if (process.env.NEXT_PUBLIC_FIREBASE_EMULATOR === "true") {
  console.log("🔥 Conectando al Emulator Suite 🔥");

  // Conecta Firestore al emulador
  // Usa las variables de entorno FIREBASE_*_EMULATOR_HOST para obtener el host y puerto
  // Spliteamos la cadena host:port para obtenerlos por separado
  const [firestoreHost, firestorePort] = (
    process.env.FIREBASE_FIRESTORE_EMULATOR_HOST || "localhost:8080"
  ).split(":");
  connectFirestoreEmulator(db, firestoreHost, parseInt(firestorePort, 10));
  console.log(`Firestore Emulator: http://${firestoreHost}:${firestorePort}`);

  // Conecta Authentication al emulador
  const [authHost, authPort] = (
    process.env.FIREBASE_AUTH_EMULATOR_HOST || "localhost:9099"
  ).split(":");
  connectAuthEmulator(auth, `http://${authHost}:${authPort}`); // Auth emulator requires http:// prefix
  console.log(`Auth Emulator: http://${authHost}:${authPort}`);

  // Conecta Storage al emulador (si lo usas)
  const [storageHost, storagePort] = (process.env.FIREBASE_STORAGE_EMULATOR_HOST || 'localhost:9199').split(':');
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
}

// Exporta las instancias de los servicios para que puedan ser usadas en otros archivos de tu app
export { app, db, auth, storage }; // Puedes exportar también la instancia de la app si la necesitas
