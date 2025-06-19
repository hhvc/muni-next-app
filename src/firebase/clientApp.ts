// src/firebase/clientApp.ts

// Importa solo los módulos necesarios del SDK de Cliente de Firebase (¡NO firebase-admin!)
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
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

// 💡 MODIFICACIÓN CLAVE: Leer la configuración de FIREBASE_WEBAPP_CONFIG inyectada por App Hosting
const firebaseWebappConfig = JSON.parse(
  process.env.FIREBASE_WEBAPP_CONFIG || "{}"
);

// Verifica si la app ya está inicializada ya (común en Next.js con SSR)
let app: FirebaseApp;
const apps = getApps();
if (apps.length === 0) {
  // 💡 Usar la configuración parseada
  if (Object.keys(firebaseWebappConfig).length === 0) {
    // Esto debería imprimir un error si FIREBASE_WEBAPP_CONFIG no está presente
    // (lo cual no debería pasar en App Hosting runtime, pero es una buena precaución)
    console.error(
      "FIREBASE_WEBAPP_CONFIG is not set. Cannot initialize Firebase."
    );
    // Decide cómo manejar esto: podrías lanzar un error o retornar null
    // Lanzar un error aquí probablemente causaría un 500 en el backend
    // Si quieres evitar el error, necesitarías que app, db, auth puedan ser undefined/null
    // durante toda la vida del componente si la inicialización falla.
    // Para este error específico, lanzar es mejor para saber que algo falló en la config.
    throw new Error("Firebase configuration is missing.");
  }
  app = initializeApp(firebaseWebappConfig);
} else {
  app = getApp(); // Si ya existe, usa la app existente
}

// Obtén las instancias de los servicios del SDK de Cliente
const db: Firestore = getFirestore(app);
// Declara 'auth' y 'storage' pero inicializa condicionalmente si es necesario (ver abajo)
let auth: Auth | null = null;
let storage: FirebaseStorage | null = null;

// 🚀 Conexión automática a los emuladores en desarrollo local 🚀
// Verifica si la variable NEXT_PUBLIC_FIREBASE_EMULATOR está establecida a 'true' (de tu apphosting.yaml)
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
  // 💡 Obtén las instancias de Auth y Storage SOLO si estás en el cliente (en prod)
  // No necesitas obtenerlas en el servidor (Node.js) si solo se usan en el cliente.
  // Esto evita posibles errores si getAuth/getStorage tienen dependencias de navegador
  // que no se detectan inmediatamente.
  auth = getAuth(app);
  storage = getStorage(app); // O solo si usas Storage en el cliente
}

// Exporta las instancias de los servicios
// 💡 Exporta null si la inicialización falló (aunque lanzamos un error arriba)
// o si no se inicializan condicionalmente (como auth/storage en el servidor)
export { app, db, auth, storage };

// Nota: serverApp.ts usa el SDK de Admin y no depende de NEXT_PUBLIC_ ni FIREBASE_WEBAPP_CONFIG.
// Se inicializa con una clave de servicio, por lo que es correcto por separado.
