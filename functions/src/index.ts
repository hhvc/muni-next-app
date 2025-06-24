// functions/src/index.ts

import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import { generateInvitation as generateInvitationFunction } from "./invitations";

// Inicialización de Firebase Admin
try {
  if (admin.apps.length === 0) {
    admin.initializeApp();
    functions.logger.info("Firebase Admin inicializado correctamente");
  }
} catch (error) {
  functions.logger.error("Error inicializando Firebase Admin:", error);
  throw error;
}

const db = admin.firestore();
functions.logger.info(
  "Firestore inicializado para la base de datos por defecto"
);

// Función HTTP 'hello'
export const hello = functions.https.onRequest((req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  try {
    const firebaseConfig = JSON.parse(process.env.FIREBASE_CONFIG || "{}");

    res.status(200).json({
      status: "success",
      message: "¡Hola desde Firebase Functions!",
      timestamp: new Date().toISOString(),
      environment: process.env.FUNCTIONS_EMULATOR
        ? "development"
        : "production",
      projectId: firebaseConfig.projectId || "unknown",
    });
  } catch (error: unknown) {
    functions.logger.error("Error en función hello:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Interfaz para el tipo de payload esperado
interface AddTestDataRequestData {
  message?: string;
}

// Función callable 'addTestData' para Firestore
export const addTestData = functions.https.onCall(
  async (request: functions.https.CallableRequest<AddTestDataRequestData>) => {
    try {
      const data = request.data;
      const auth = request.auth;
      const uid = auth?.uid || "anonymous";

      const messageToStore = data?.message || "Mensaje por defecto";

      functions.logger.info("Datos recibidos en addTestData:", data);
      functions.logger.info("UID del usuario:", uid);

      // Usar prefijo "munidb/" en la colección
      const docRef = await db.collection("munidb/test").add({
        message: messageToStore,
        created: admin.firestore.FieldValue.serverTimestamp(),
        uid: uid,
      });

      functions.logger.info("Documento agregado con ID:", docRef.id);

      return {
        success: true,
        id: docRef.id,
        path: docRef.path,
      };
    } catch (error: unknown) {
      functions.logger.error("Error en addTestData:", error);

      if (error instanceof Error) {
        throw new functions.https.HttpsError(
          "internal",
          "Error interno",
          process.env.FUNCTIONS_EMULATOR ? error.message : undefined
        );
      }
      throw new functions.https.HttpsError("internal", "Error desconocido");
    }
  }
);

// Exportar la función generateInvitation
export const generateInvitation = generateInvitationFunction;
