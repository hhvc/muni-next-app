// src/firebase/clientApp.ts

// Importa solo los módulos necesarios del SDK de Cliente de Firebase
import {
  initializeApp,
  getApps,
  getApp,
  FirebaseApp,
  FirebaseOptions,
} from "firebase/app";
import {
  getFirestore,
  connectFirestoreEmulator,
  Firestore,
} from "firebase/firestore";
import { getAuth, connectAuthEmulator, Auth } from "firebase/auth";
import {
  getStorage,
  connectStorageEmulator,
  FirebaseStorage,
} from "firebase/storage";

// 💡 MODIFICACIÓN CLAVE: Lógica para obtener la configuración dependiendo del entorno
let firebaseConfigToUse: FirebaseOptions;

// 1. Intentar leer de FIREBASE_WEBAPP_CONFIG (inyectada por App Hosting)
const firebaseWebappConfig = process.env.FIREBASE_WEBAPP_CONFIG;

if (firebaseWebappConfig) {
  try {
    firebaseConfigToUse = JSON.parse(firebaseWebappConfig);
    console.log("Usando configuración de FIREBASE_WEBAPP_CONFIG");
  } catch (e) {
    console.error("Error parsing FIREBASE_WEBAPP_CONFIG:", e);
    // Decide cómo manejar este error fatal
    throw new Error("Failed to parse Firebase configuration from environment.");
  }
} else {
  // 2. Si FIREBASE_WEBAPP_CONFIG no está definida, leer de NEXT_PUBLIC_* (para entorno local)
  console.log("FIREBASE_WEBAPP_CONFIG no definida, usando NEXT_PUBLIC_*");
  firebaseConfigToUse = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    // measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID, // Si lo usas
  };

  // Opcional: Verificar si las variables NEXT_PUBLIC_ están realmente definidas en local si es necesario
  if (!firebaseConfigToUse.apiKey) {
    console.warn(
      "NEXT_PUBLIC_FIREBASE_API_KEY no definida. La inicialización de Firebase podría fallar."
    );
    // Puedes lanzar un error aquí si quieres que el build local falle si la config local falta
    // throw new Error("Firebase local configuration (NEXT_PUBLIC_*) is missing.");
  }
}

// Inicializa Firebase solo si no ha sido inicializado ya (común en Next.js con SSR/HMR)
let app: FirebaseApp;
const apps = getApps();
if (apps.length === 0) {
  // 💡 Usar la configuración seleccionada
  if (!firebaseConfigToUse || !firebaseConfigToUse.apiKey) {
    // Este chequeo captura si ninguna configuración se encontró o si la API Key falta
    console.error("No se encontró configuración válida de Firebase.");
    throw new Error("Firebase configuration is missing or invalid.");
  }
  app = initializeApp(firebaseConfigToUse);
} else {
  app = getApp(); // Si ya existe, usa la app existente
}

// Obtén las instancias de los servicios del SDK de Cliente
const db: Firestore = getFirestore(app);
// Declara 'auth' y 'storage' pero inicializa condicionalmente solo en el cliente
let auth: Auth | null = null;
let storage: FirebaseStorage | null = null;

// 🚀 Conexión automática a los emuladores en desarrollo local 🚀
// Verifica si la variable NEXT_PUBLIC_FIREBASE_EMULATOR está establecida a 'true' (de tu apphosting.yaml o .env.local)
// Y verifica si estamos en el navegador
if (
  typeof window !== "undefined" &&
  process.env.NEXT_PUBLIC_FIREBASE_EMULATOR === "true"
) {
  console.log("🔥 Conectando al Emulator Suite 🔥");

  // Asegúrate de tener la instancia de Auth/Storage antes de conectar emuladores
  // 💡 Obtén instancias SOLO si estás en el cliente Y usando emuladores
  auth = getAuth(app);
  storage = getStorage(app);

  // Conecta Firestore al emulador
  const [firestoreHost, firestorePort] = (
    process.env.FIREBASE_FIRESTORE_EMULATOR_HOST || "localhost:8080"
  ).split(":");
  connectFirestoreEmulator(db, firestoreHost, parseInt(firestorePort, 10));
  console.log(`Firestore Emulator: http://${firestoreHost}:${firestorePort}`);

  // Conecta Authentication al emulador
  const [authHost, authPort] = (
    process.env.FIREBASE_AUTH_EMULATOR_HOST || "localhost:9099"
  ).split(":");
  connectAuthEmulator(auth, `http://${authHost}:${authPort}`);
  console.log(`Auth Emulator: http://${authHost}:${authPort}`);

  // Conecta Storage al emulador (si lo usas)
  const [storageHost, storagePort] = (
    process.env.FIREBASE_STORAGE_EMULATOR_HOST || "localhost:9199"
  ).split(":");
  connectStorageEmulator(storage, storageHost, parseInt(storagePort, 10));
  console.log(`Storage Emulator: http://${storageHost}:${storagePort}`);
} else if (typeof window !== "undefined") {
  // 💡 Obtén las instancias de Auth y Storage SOLO si estás en el cliente (en prod o local dev sin emulador)
  // No necesitas obtenerlas en el servidor (Node.js) si solo se usan en el cliente.
  // Esto evita posibles errores si getAuth/getStorage tienen dependencias de navegador.
  auth = getAuth(app);
  storage = getStorage(app); // O solo si usas Storage en el cliente
}

// Exporta las instancias de los servicios
export { app, db, auth, storage };

// serverApp.ts no se modifica.
