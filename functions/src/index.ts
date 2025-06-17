import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
// ✅ No necesitamos importar CallableContext si accedemos vía request.auth
// import { CallableContext } from 'firebase-functions/v1/https'; // <-- Esta importación ya no es necesaria si accedes vía request.auth

// Inicialización de Firebase Admin usando las credenciales automáticas del entorno
try {
  if (admin.apps.length === 0) {
    admin.initializeApp();
    functions.logger.info(
      "Firebase Admin inicializado correctamente usando credenciales del entorno."
    );
  } else {
    admin.app();
    functions.logger.info("Firebase Admin ya inicializado.");
  }
} catch (error) {
  functions.logger.error("Error inicializando Firebase Admin:", error);
  throw error;
}

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
  } catch (error) {
    functions.logger.error("Error en función hello:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// ✅ Definimos una interfaz para el TIPO del payload de datos esperado
interface AddTestDataRequestData {
  message?: string; // Ejemplo de propiedad esperada
  // Agrega aquí cualquier otra propiedad que esperes en el objeto 'data'
}

// Función callable 'addTestData' para Firestore
// ✅ CORRECCIÓN CRÍTICA: La firma del handler debe aceptar un objeto `request` de tipo `CallableRequest<T>`
export const addTestData = functions.https.onCall(
  async (request: functions.https.CallableRequest<AddTestDataRequestData>) => {
    try {
      const db = admin.firestore();

      // ✅ Accedemos al payload de datos a través de request.data
      const data = request.data;
      // ✅ Accedemos a la información de autenticación a través de request.auth
      const auth = request.auth; // auth será de tipo CallableContext.auth | undefined

      // ✅ Accedemos al UID de forma segura a través de request.auth?.uid
      const uid = auth?.uid || "anonymous";

      // ✅ Accedemos a las propiedades del payload de datos (`data`)
      // Como `data` es de tipo AddTestDataRequestData, TypeScript sabe sobre `data.message`
      const messageToStore =
        typeof data?.message === "string" && data.message.length > 0
          ? data.message
          : "Mensaje por defecto si no se proporciona o es vacío";

      // ✅ Usamos las variables 'data' y 'uid' para que TypeScript no se queje de que no se usan
      functions.logger.info("Datos recibidos en addTestData:", data);
      functions.logger.info("UID del usuario (o anonymous):", uid);

      const docRef = await db.collection("test").add({
        message: messageToStore, // ✅ Usamos el valor procesado
        created: admin.firestore.FieldValue.serverTimestamp(),
        uid: uid,
        // Opcional: añadir más datos del usuario autenticado si están en auth?.token
        // email: auth?.token?.email || null,
        // name: auth?.token?.name || null,
      });

      console.log("Documento agregado con ID:", docRef.id);

      return {
        success: true,
        id: docRef.id,
        path: docRef.path,
      };
    } catch (error) {
      console.error("Error en addTestData:", error);

      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      throw new functions.https.HttpsError(
        "internal",
        "Ocurrió un error al procesar tu solicitud.",
        process.env.FUNCTIONS_EMULATOR
          ? { details: error instanceof Error ? error.message : String(error) }
          : undefined
      );
    }
  }
);

// Puedes añadir aquí otras funciones...
