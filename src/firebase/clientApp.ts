// src/firebase/clientApp.ts

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
import {
  initializeAppCheck,
  ReCaptchaV3Provider,
  AppCheck, // ← IMPORTANTE: Importar el tipo AppCheck
} from "firebase/app-check";

// ==================== CONFIGURACIÓN SEGURA ====================

// IMPORTANTE: La site key debe ser pública (está ok exponerla)
const RECAPTCHA_SITE_KEY = "6LdTic0sAAAAALk9LHokzfkahKDcFSSP40_9hRtf";

// Variable para almacenar la instancia de App Check
let appCheck: AppCheck | null = null;

/**
 * Valida la configuración de Firebase
 */
const validateFirebaseConfig = (config: FirebaseOptions): void => {
  if (!config) {
    throw new Error("La configuración de Firebase está vacía");
  }

  const requiredFields = ["apiKey", "authDomain", "projectId", "appId"];
  const missingFields = requiredFields.filter(
    (field) => !config[field as keyof FirebaseOptions]
  );

  if (missingFields.length > 0) {
    throw new Error(
      `Configuración de Firebase incompleta. Faltan: ${missingFields.join(
        ", "
      )}`
    );
  }

  // Validación específica para API Key en producción
  if (process.env.NODE_ENV === "production" && config.apiKey === "demo-key") {
    throw new Error("API Key no válida para entorno de producción");
  }
};

/**
 * Obtiene la configuración de Firebase según el entorno
 */
const getFirebaseConfig = (): FirebaseOptions => {
  // 1. Primero intentar con FIREBASE_WEBAPP_CONFIG (App Hosting)
  const firebaseWebappConfig = process.env.FIREBASE_WEBAPP_CONFIG;

  if (firebaseWebappConfig) {
    try {
      const config = JSON.parse(firebaseWebappConfig);
      console.log("✅ Usando configuración de FIREBASE_WEBAPP_CONFIG");
      return config;
    } catch (error) {
      console.error("❌ Error parseando FIREBASE_WEBAPP_CONFIG:", error);
      throw new Error("Error en la configuración de Firebase del entorno");
    }
  }

  // 2. Si no hay FIREBASE_WEBAPP_CONFIG, usar NEXT_PUBLIC_* (desarrollo local)
  console.log(
    "ℹ️ FIREBASE_WEBAPP_CONFIG no definida, usando variables NEXT_PUBLIC_*"
  );

  const config: FirebaseOptions = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };

  // En desarrollo, permitir configuración mínima para emuladores
  if (process.env.NODE_ENV === "development") {
    if (!config.apiKey) {
      console.warn("⚠️  Usando API Key de demostración para desarrollo");
      config.apiKey = "demo-key-for-development";
      config.authDomain = "localhost";
      config.projectId = "demo-muni-project";
    }
  }

  return config;
};

// ==================== INICIALIZACIÓN ====================

let app: FirebaseApp;
let db: Firestore;
let auth: Auth | null = null;
let storage: FirebaseStorage | null = null;

try {
  // Obtener y validar configuración
  const firebaseConfig = getFirebaseConfig();
  validateFirebaseConfig(firebaseConfig);

  // Inicializar Firebase solo si no ha sido inicializado ya
  const apps = getApps();
  if (apps.length === 0) {
    app = initializeApp(firebaseConfig);
    console.log("✅ Firebase inicializado correctamente");
  } else {
    app = getApp();
    console.log(
      "✅ Firebase ya estaba inicializado, usando instancia existente"
    );
  }

  // Obtener instancia de Firestore con la base de datos 'munidb'
  db = getFirestore(app, "munidb");

  // ==================== CONFIGURACIÓN DE EMULADORES ====================

  const isBrowser = typeof window !== "undefined";
  const usingEmulators = process.env.NEXT_PUBLIC_FIREBASE_EMULATOR === "true";

  if (isBrowser && usingEmulators) {
    console.log("🔥 Conectando al Emulator Suite");

    // Inicializar Auth y Storage solo para emuladores en el cliente
    auth = getAuth(app);
    storage = getStorage(app);

    // Configurar Firestore Emulator
    const [firestoreHost, firestorePort] = (
      process.env.FIREBASE_FIRESTORE_EMULATOR_HOST || "localhost:8080"
    ).split(":");
    connectFirestoreEmulator(db, firestoreHost, parseInt(firestorePort, 10));
    console.log(
      `📊 Firestore Emulator: http://${firestoreHost}:${firestorePort}`
    );

    // Configurar Auth Emulator
    const [authHost, authPort] = (
      process.env.FIREBASE_AUTH_EMULATOR_HOST || "localhost:9099"
    ).split(":");
    connectAuthEmulator(auth, `http://${authHost}:${authPort}`);
    console.log(`🔐 Auth Emulator: http://${authHost}:${authPort}`);

    // Configurar Storage Emulator (si se usa)
    const [storageHost, storagePort] = (
      process.env.FIREBASE_STORAGE_EMULATOR_HOST || "localhost:9199"
    ).split(":");
    connectStorageEmulator(storage, storageHost, parseInt(storagePort, 10));
    console.log(`💾 Storage Emulator: http://${storageHost}:${storagePort}`);

    // NOTA: App Check NO se inicializa con emuladores
    console.log("⚠️ App Check deshabilitado (usando emuladores)");

  } else if (isBrowser) {
    // En producción o desarrollo sin emuladores, inicializar Auth y Storage normalmente
    auth = getAuth(app);
    storage = getStorage(app);

    // ========== CONFIGURAR APP CHECK (SOLO PRODUCCIÓN) ==========
    // No inicializar en desarrollo para evitar errores
    if (process.env.NODE_ENV === "production") {
      try {
        // ✅ CORREGIDO: Usar ReCaptchaV3Provider en lugar de ReCaptchaEnterpriseProvider
        appCheck = initializeAppCheck(app, {
          provider: new ReCaptchaV3Provider(RECAPTCHA_SITE_KEY),
          isTokenAutoRefreshEnabled: true,
        });
        console.log("✅ App Check con reCAPTCHA v3 inicializado correctamente");
      } catch (error) {
        console.error("❌ Error inicializando App Check:", error);
        // No lanzar error, la app puede funcionar sin App Check pero con riesgos
      }
    } else {
      console.log("⚠️ App Check deshabilitado en desarrollo (ambiente local)");
    }

    if (process.env.NODE_ENV === "development") {
      console.log("🚀 Firebase en modo desarrollo (sin emuladores)");
    } else {
      console.log("🌐 Firebase en modo producción");
    }
  }
} catch (error) {
  console.error("❌ Error crítico en la inicialización de Firebase:", error);

  // En desarrollo, permitir que la aplicación continúe con valores nulos
  if (process.env.NODE_ENV === "development") {
    console.warn(
      "⚠️  Continuando con Firebase no inicializado (modo desarrollo)"
    );
    // Crear instancias vacías para evitar errores
    const emptyApp = {} as FirebaseApp;
    const emptyDb = {} as Firestore;

    app = emptyApp;
    db = emptyDb;
    auth = null;
    storage = null;
  } else {
    // En producción, es mejor fallar claramente
    throw new Error(
      `Inicialización de Firebase falló: ${error instanceof Error ? error.message : "Error desconocido"
      }`
    );
  }
}

// ==================== EXPORTACIONES ====================

export { app, db, auth, storage, appCheck };

// ==================== UTILIDADES ADICIONALES ====================

/**
 * Función para verificar el estado de Firebase
 * Útil para debugging
 */
export const getFirebaseStatus = () => {
  const isInitialized = !!app;
  const isBrowser = typeof window !== "undefined";
  const usingEmulators = process.env.NEXT_PUBLIC_FIREBASE_EMULATOR === "true";
  const hasAppCheck = !!appCheck;

  return {
    isInitialized,
    isBrowser,
    usingEmulators,
    environment: process.env.NODE_ENV,
    hasAuth: !!auth,
    hasStorage: !!storage,
    hasAppCheck,
    projectId: app?.options?.projectId || "no-inicializado",
  };
};