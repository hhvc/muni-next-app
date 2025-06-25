// functions/src/index.ts

import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import { generateInvitation as generateInvitationFunction } from "./invitations"; // Esto se mantiene igual

// Inicialización de Firebase Admin SDK.
// Este bloque asegura que el Admin SDK se inicialice una única vez para la APP [DEFAULT].
// Esta APP [DEFAULT] se conecta a la base de datos Firestore (default).
try {
  if (admin.apps.length === 0) {
    admin.initializeApp();
    functions.logger.info(
      "Firebase Admin SDK inicializado correctamente (App por defecto)"
    );
  }
} catch (error) {
  functions.logger.error(
    "Error inicializando Firebase Admin SDK (App por defecto):",
    error
  );
  throw error;
}

// Función HTTP 'hello' (tu función de ejemplo)
export const hello = functions.https.onRequest((req, res) => {
  // Para esta función 'hello', no es necesario inicializar Firestore
  // a menos que interactúe con una base de datos.
  // Si necesitara la base de datos (default), podría usar: const db = admin.firestore();
  // ... resto de tu código para hello ...
});

// Interfaz para definir la estructura de los datos esperados en addTestData
interface AddTestDataRequestData {
  message?: string;
}

// Función callable 'addTestData' para interactuar con Firestore
export const addTestData = functions.https.onCall(
  async (request: functions.https.CallableRequest<AddTestDataRequestData>) => {
    // **** LA SOLUCIÓN DEFINITIVA PARA ACCEDER A 'munidb' ****
    // Creamos una nueva instancia de Firestore que apunta directamente a la base de datos 'munidb'.
    const db = new admin.firestore.Firestore({
      databaseId: "munidb", // ¡Aquí es donde va el databaseId!
    });
    functions.logger.info(
      "Cliente de Firestore inicializado para 'munidb' en addTestData."
    );
    // **********************************************************

    try {
      const data = request.data;
      const auth = request.auth;
      const uid = auth?.uid || "anonymous";

      const messageToStore = data?.message || "Mensaje por defecto";

      functions.logger.info("Datos recibidos en addTestData:", data);
      functions.logger.info("UID del usuario:", uid);

      // Almacena un nuevo documento en la colección "test".
      // Ya NO necesitas el prefijo "munidb/" porque 'db' ya apunta directamente a "munidb".
      const docRef = await db.collection("test").add({
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

// Exporta la función generateInvitation desde invitations.ts
// Esto la hace accesible como una Cloud Function
export const generateInvitation = generateInvitationFunction;
