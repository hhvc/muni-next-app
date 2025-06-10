// src/firebase/serverApp.ts
import {
  initializeApp,
  getApps,
  getApp,
  applicationDefault,
} from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

// Inicializa Firebase Admin para el servidor
// Usa applicationDefault() para usar las credenciales proporcionadas por App Hosting (Cloud Run)
const app = !getApps().length
  ? initializeApp({
      credential: applicationDefault(),
      // databaseURL: 'https://<DATABASE_NAME>.firebaseio.com' // Si usas Realtime Database
    })
  : getApp();

const authAdmin = getAuth(app);
const dbAdmin = getFirestore(app);

export { app, authAdmin, dbAdmin };
