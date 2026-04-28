// functions/src/index.ts

import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import { getFirestore } from "firebase-admin/firestore"; // ✅ Importación necesaria para db con nombre
import { generateInvitation as generateInvitationFunction } from "./invitations";
import { onSchedule } from "firebase-functions/v2/scheduler";

// ==================== INICIALIZACIÓN (CORREGIDA) ====================

// ✅ Inicialización única al cargar el módulo para evitar errores de despliegue
// El Admin SDK debe estar listo antes de que Firebase analice las funciones.
if (admin.apps.length === 0) {
  try {
    admin.initializeApp();
    functions.logger.info("Firebase Admin SDK inicializado correctamente");
  } catch (error) {
    functions.logger.error("Error crítico inicializando Firebase Admin SDK:", error);
  }
}

// ==================== FUNCIÓN HELLO (SIMPLIFICADA) ====================

export const hello = functions.https.onRequest(async (req, res) => {
  // Configurar CORS básico para desarrollo
  if (process.env.FUNCTIONS_EMULATOR) {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, POST");
    res.set("Access-Control-Allow-Headers", "Content-Type");
  }

  // Manejar preflight requests
  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  try {
    functions.logger.info("Hello function called", {
      method: req.method,
      ip: req.ip,
    });

    res.json({
      success: true,
      message: "¡Hola desde Firebase Functions!",
      timestamp: new Date().toISOString(),
      environment: process.env.FUNCTIONS_EMULATOR
        ? "development"
        : "production",
    });
  } catch (error) {
    functions.logger.error("Error in hello function:", error);
    res.status(500).json({
      success: false,
      error: "Error interno del servidor",
    });
  }
});

// ==================== INTERFACES Y TIPOS ====================

interface AddTestDataRequestData {
  message?: string;
}

// ==================== FUNCIÓN ADD TEST DATA ====================

export const addTestData = functions.https.onCall(
  async (request: functions.https.CallableRequest<AddTestDataRequestData>) => {
    const startTime = Date.now();

    try {
      // ========== VALIDACIONES DE SEGURIDAD ==========

      // 1. Validar autenticación
      if (!request.auth) {
        functions.logger.warn("Intento de acceso no autenticado a addTestData");
        throw new functions.https.HttpsError(
          "unauthenticated",
          "Debes iniciar sesión para realizar esta acción"
        );
      }

      const uid = request.auth.uid;

      // 2. Validar datos de entrada
      if (request.data?.message && typeof request.data.message !== "string") {
        functions.logger.warn("Datos inválidos recibidos en addTestData", {
          uid,
        });
        throw new functions.https.HttpsError(
          "invalid-argument",
          "El mensaje debe ser una cadena de texto"
        );
      }

      // 3. Validar longitud del mensaje
      const messageToStore =
        request.data?.message?.trim() || "Mensaje por defecto";
      if (messageToStore.length > 500) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "El mensaje no puede exceder los 500 caracteres"
        );
      }

      // ========== LÓGICA DE FIRESTORE (MUNIDB) ==========

      // ✅ Usamos la función importada getFirestore("munidb")
      const db = getFirestore("munidb");

      functions.logger.info(
        "Cliente de Firestore inicializado para 'munidb' en addTestData."
      );

      functions.logger.info("Datos recibidos en addTestData:", {
        messageLength: messageToStore.length,
        uid: uid,
      });

      const docRef = await db.collection("test").add({
        message: messageToStore,
        created: admin.firestore.FieldValue.serverTimestamp(),
        uid: uid,
        ip: request.rawRequest.ip || "unknown",
        userAgent: request.rawRequest.get("User-Agent") || "unknown",
      });

      functions.logger.info("Documento agregado con ID:", docRef.id);

      const executionTime = Date.now() - startTime;
      functions.logger.info(`addTestData completado en ${executionTime}ms`, {
        documentId: docRef.id,
      });

      return {
        success: true,
        id: docRef.id,
        path: docRef.path,
        timestamp: new Date().toISOString(),
      };
    } catch (error: unknown) {
      const executionTime = Date.now() - startTime;

      if (error instanceof functions.https.HttpsError) {
        functions.logger.warn("Error de HttpsError en addTestData", {
          error: error.message,
          code: error.code,
          executionTime: `${executionTime}ms`,
        });
        throw error;
      }

      functions.logger.error("Error inesperado en addTestData", {
        error: error instanceof Error ? error.message : "Error desconocido",
        executionTime: `${executionTime}ms`,
      });

      const errorDetails =
        process.env.FUNCTIONS_EMULATOR && error instanceof Error
          ? { debugMessage: error.message }
          : undefined;

      throw new functions.https.HttpsError(
        "internal",
        "Error interno del servidor",
        errorDetails
      );
    }
  }
);

// ==================== FUNCIÓN GENERATE INVITATION ====================

export const generateInvitation = generateInvitationFunction;

// ==================== FUNCIONES ADICIONALES ====================

export const cleanupTestData = onSchedule(
  {
    schedule: "every 24 hours",
    timeZone: "America/Argentina/Buenos_Aires",
  },
  async () => {
    try {
      // ✅ Referencia correcta a la base de datos munidb usando getFirestore
      const db = getFirestore("munidb");
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 7);

      const snapshot = await db
        .collection("test")
        .where("created", "<", cutoffDate)
        .get();

      const batch = db.batch();
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      await batch.commit();

      functions.logger.info(
        `Datos de test limpiados: ${snapshot.size} documentos eliminados`
      );
    } catch (error) {
      functions.logger.error("Error en cleanupTestData:", error);
    }
  }
);

// ==================== FUNCIONES DE ASISTENCIA (ATTENDANCE) ====================

// Exportar funciones de attendance
export { validateAttendance } from "./attendance/validateAttendance";
export { generateAttendanceQr } from "./attendance/generateAttendanceQr";
export { attendanceToBigQuery } from "./attendance/attendanceToBigQuery";

// ==================== EXPORTACIONES PARA TESTING ====================

if (process.env.FUNCTIONS_EMULATOR) {
  exports._testExports = {
    // Utilidades para testing
  };
}