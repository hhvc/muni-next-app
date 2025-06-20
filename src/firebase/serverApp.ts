// src/firebase/serverApp.ts
// ¡Importamos todo el módulo 'firebase-admin' como 'admin'!
// Esto suele proporcionar los tipos correctos para todas las funcionalidades.
import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";

// Ya NO necesitamos importar initializeApp, getApps, getApp, cert, getAuth, getFirestore
// directamente de los subpaths si importamos el objeto 'admin' completo.
// Es mejor usar las propiedades y métodos del objeto 'admin' importado.
// import { initializeApp, getApps, getApp, cert } from "firebase-admin/app"; // <-- Eliminar o comentar
// import { getAuth } from "firebase-admin/auth";       // <-- Eliminar o comentar
// import { getFirestore } from "firebase-admin/firestore"; // <-- Eliminar o comentar

// --- INICIALIZACIÓN DE LA ADMIN SDK ---
// En entornos confiables de Google Cloud (Cloud Run/App Hosting, Cloud Functions, App Engine),
// no necesitas pasar credenciales como la clave de servicio. La SDK detectará automáticamente
// la cuenta de servicio predeterminada del entorno.
// Elimina o comenta todo este bloque, ya no es necesario.
// if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
//   throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY is not defined");
// }
// const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);

// Verifica si la app ya está inicializada para evitar reinicializaciones
// Este chequeo usa admin.apps.length y admin.initializeApp/admin.app
const app =
  admin.apps.length === 0
    ? admin.initializeApp() // Inicializa sin credenciales en entornos confiables
    : admin.app(); // Usa la instancia existente

// --- OBTENCIÓN DE SERVICIOS ---

// Obtiene la instancia del servicio de Authentication usando admin.auth()
const authAdmin = admin.auth(app); // Puedes pasar 'app' aquí, aunque a menudo no es estrictamente necesario si solo tienes una app

// Obtiene la instancia del servicio de Firestore.
// Para conectarte a una base de datos nombrada ('munidb'),
// usa .instance('databaseId') después de admin.firestore().
// Aquí TypeScript debería reconocer .instance() si el import es correcto.
const dbAdmin = getFirestore(app, "munidb"); // Puedes pasar 'app' aquí también

export { app, authAdmin, dbAdmin };
