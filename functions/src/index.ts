// functions/src/index.ts

import * as admin from "firebase-admin";
import * as functions from "firebase-functions";

// Importar tu función generateInvitation
import { generateInvitation as generateInvitationFunction } from "./invitations";

// Inicialización de Firebase Admin para la app por defecto
try {
  if (admin.apps.length === 0) {
    admin.initializeApp();
    functions.logger.info(
      "Firebase Admin inicializado correctamente para la app por defecto."
    );
  } else {
    admin.app(); // Usa la instancia existente
  }
} catch (error) {
  functions.logger.error(
    "Error inicializando Firebase Admin por defecto:",
    error
  );
  throw error;
}

// 🔥 SOLUCIÓN CORRECTA: Crear una instancia de app específica para 'munidb'
const getFirestoreForMunidb = () => {
  try {
    // Intentar obtener la app existente para 'munidb'
    const munidbApp = admin.app("munidb");
    functions.logger.info("Usando app existente para munidb");
    return munidbApp.firestore();
  } catch (e) {
    // Si no existe, crear nueva app
    functions.logger.info("Creando nueva app para munidb");
    const munidbApp = admin.initializeApp(
      {
        // IMPORTANTE: Reemplaza esta URL con la URL real de tu base de datos
        databaseURL: "https://muni-22fa0-munidb.firebaseio.com", // URL de ejemplo
      },
      "munidb"
    );

    return munidbApp.firestore();
  }
};

const db = getFirestoreForMunidb();
functions.logger.info(`Firestore inicializado para base de datos: munidb`);

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
      database: "munidb", // Confirmación
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

      const messageToStore =
        typeof data?.message === "string" && data.message.length > 0
          ? data.message
          : "Mensaje por defecto si no se proporciona o es vacío";

      functions.logger.info("Datos recibidos en addTestData:", data);
      functions.logger.info("UID del usuario (o anonymous):", uid);
      functions.logger.info("Usando base de datos: munidb");

      // Usar la instancia específica de 'munidb'
      const docRef = await db.collection("test").add({
        message: messageToStore,
        created: admin.firestore.FieldValue.serverTimestamp(),
        uid: uid,
      });

      console.log("Documento agregado con ID:", docRef.id);

      return {
        success: true,
        id: docRef.id,
        path: docRef.path,
        database: "munidb",
      };
    } catch (error: unknown) {
      console.error("Error en addTestData:", error);

      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      if (error instanceof Error) {
        throw new functions.https.HttpsError(
          "internal",
          "Ocurrió un error al procesar tu solicitud.",
          process.env.FUNCTIONS_EMULATOR
            ? { details: error.message }
            : undefined
        );
      } else {
        throw new functions.https.HttpsError(
          "internal",
          "Ocurrió un error al procesar tu solicitud (error desconocido)."
        );
      }
    }
  }
);

// Exportar la función generateInvitation
export const generateInvitation = generateInvitationFunction;
