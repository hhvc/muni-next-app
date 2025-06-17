// src/firebase/serverApp.ts
import { initializeApp, getApps, getApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

// Verifica que la variable de entorno esté definida
if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
  throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY is not defined");
}

// Parsea la clave de servicio
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);

// Inicializa la app
const app =
  getApps().length === 0
    ? initializeApp({
        credential: cert(serviceAccount),
      })
    : getApp();

// Obtiene los servicios
const authAdmin = getAuth(app);
const dbAdmin = getFirestore(app);

export { app, authAdmin, dbAdmin };
