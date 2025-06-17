import * as admin from "firebase-admin";
import * as functions from "firebase-functions";

// 1. Importar las credenciales directamente desde un archivo JSON
import serviceAccount from "../serviceAccountKey.json";

// 2. Inicialización de Firebase Admin
try {
  // Formatear clave privada (si es necesario)
  const formattedServiceAccount = {
    ...serviceAccount,
    private_key: serviceAccount.private_key.replace(/\\n/g, "\n"),
  };

  if (admin.apps.length === 0) {
    admin.initializeApp({
      credential: admin.credential.cert(
        formattedServiceAccount as admin.ServiceAccount
      ),
      databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`,
    });
    functions.logger.info("Firebase Admin inicializado correctamente");
    functions.logger.debug(
      "Proyecto:",
      serviceAccount.project_id,
      "Email:",
      serviceAccount.client_email
    );
  }
} catch (error) {
  functions.logger.error("Error inicializando Firebase Admin:", error);
  throw error;
}

// 3. Función HTTP con manejo manual de CORS
export const hello = functions.https.onRequest((req, res) => {
  // Configurar CORS manualmente
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");

  // Manejar solicitud OPTIONS (preflight)
  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  try {
    // Respuesta simple sin Firestore para pruebas iniciales
    res.status(200).json({
      status: "success",
      message: "¡Hola desde Firebase Functions!",
      timestamp: new Date().toISOString(),
      environment: process.env.FUNCTIONS_EMULATOR
        ? "development"
        : "production",
      projectId: serviceAccount.project_id,
    });
  } catch (error) {
    functions.logger.error("Error en función hello:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// 4. Función callable para Firestore
export const addTestData = functions.https.onCall(async (data, context) => {
  try {
    const db = admin.firestore();

    // SOLUCIÓN DEFINITIVA: Acceso directo con aserción de tipo
    const uid = (context as any).auth?.uid || "anonymous";

    const docRef = await db.collection("test").add({
      message: "Datos de prueba desde Cloud Functions",
      created: admin.firestore.FieldValue.serverTimestamp(),
      uid: uid,
    });

    return {
      success: true,
      id: docRef.id,
      path: docRef.path,
    };
  } catch (error) {
    functions.logger.error("Error en addTestData:", error);
    throw new functions.https.HttpsError(
      "internal",
      "No se pudo agregar el documento"
    );
  }
});