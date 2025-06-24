// functions/src/index.ts

import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import { generateInvitation as generateInvitationFunction } from "./invitations";

// Inicialización de Firebase Admin SDK.
// Este bloque asegura que el Admin SDK se inicialice una única vez.
try {
  if (admin.apps.length === 0) {
    admin.initializeApp();
    functions.logger.info("Firebase Admin SDK inicializado correctamente");
  }
} catch (error) {
  functions.logger.error("Error inicializando Firebase Admin SDK:", error);
  throw error;
}

// Inicializamos el cliente de Firestore para la base de datos por defecto.
// Para acceder a bases de datos nombradas (como 'munidb'), se debe usar su prefijo
// en las rutas de colección/documento, ej. db.collection('munidb/myCollection').
const db = admin.firestore();
functions.logger.info(
  "Cliente de Firestore inicializado. Acceso a bases de datos nombradas vía prefijo de ruta (ej. 'munidb/')."
);

// Función HTTP 'hello' (tu función de ejemplo)
export const hello = functions.https.onRequest((req, res) => {
  // Configuración de CORS para permitir solicitudes desde cualquier origen
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");

  // Manejo de solicitudes OPTIONS (pre-flight requests de CORS)
  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  try {
    // Intenta parsear FIREBASE_CONFIG desde las variables de entorno
    // Esto es útil para depuración y obtener información del proyecto
    const firebaseConfig = JSON.parse(process.env.FIREBASE_CONFIG || "{}");

    // Envía una respuesta JSON con información sobre la función
    res.status(200).json({
      status: "success",
      message: "¡Hola desde Firebase Functions!",
      timestamp: new Date().toISOString(),
      environment: process.env.FUNCTIONS_EMULATOR
        ? "development" // Indica si la función se ejecuta en el emulador local
        : "production", // O si se ejecuta en el entorno de producción
      projectId: firebaseConfig.projectId || "unknown", // ID del proyecto Firebase
    });
  } catch (error: unknown) {
    // Captura y registra cualquier error durante la ejecución de la función
    functions.logger.error("Error en función hello:", error);
    // Envía una respuesta de error al cliente
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Interfaz para definir la estructura de los datos esperados en addTestData
interface AddTestDataRequestData {
  message?: string; // Campo opcional para el mensaje a almacenar
}

// Función callable 'addTestData' para interactuar con Firestore
export const addTestData = functions.https.onCall(
  async (request: functions.https.CallableRequest<AddTestDataRequestData>) => {
    try {
      const data = request.data; // Datos enviados por el cliente
      const auth = request.auth; // Información de autenticación del usuario
      const uid = auth?.uid || "anonymous"; // UID del usuario o 'anonymous' si no está autenticado

      const messageToStore = data?.message || "Mensaje por defecto"; // Mensaje a almacenar

      functions.logger.info("Datos recibidos en addTestData:", data);
      functions.logger.info("UID del usuario:", uid);

      // Almacena un nuevo documento en la colección "munidb/test".
      // La base de datos nombrada 'munidb' se especifica en la ruta de la colección.
      const docRef = await db.collection("munidb/test").add({
        message: messageToStore,
        created: admin.firestore.FieldValue.serverTimestamp(), // Marca de tiempo del servidor
        uid: uid,
      });

      functions.logger.info("Documento agregado con ID:", docRef.id);

      // Devuelve una respuesta de éxito con el ID y la ruta del documento
      return {
        success: true,
        id: docRef.id,
        path: docRef.path,
      };
    } catch (error: unknown) {
      // Captura y registra errores específicos de la función
      functions.logger.error("Error en addTestData:", error);

      // Manejo de errores para devolver un HttpsError al cliente
      if (error instanceof Error) {
        throw new functions.https.HttpsError(
          "internal", // Tipo de error HTTP
          "Error interno", // Mensaje de error amigable
          process.env.FUNCTIONS_EMULATOR ? error.message : undefined // Detalles adicionales solo en emulador
        );
      }
      throw new functions.https.HttpsError("internal", "Error desconocido");
    }
  }
);

// Exporta la función generateInvitation desde invitations.ts
// Esto la hace accesible como una Cloud Function
export const generateInvitation = generateInvitationFunction;
