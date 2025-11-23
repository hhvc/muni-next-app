// functions/src/index.ts

import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import { generateInvitation as generateInvitationFunction } from "./invitations";

// ==================== INICIALIZACIÓN (MANTENIENDO TU CÓDIGO ORIGINAL) ====================

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

// ==================== FUNCIÓN HELLO (MEJORADA CON MANEJO DE ERRORES) ====================

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

// ==================== FUNCIÓN ADD TEST DATA (MEJORADA CON VALIDACIONES) ====================

export const addTestData = functions.https.onCall(
  async (request: functions.https.CallableRequest<AddTestDataRequestData>) => {
    const startTime = Date.now();

    try {
      // ========== VALIDACIONES DE SEGURIDAD (MEJORAS NUEVAS) ==========

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

      // ========== LÓGICA ORIGINAL (SIN CAMBIOS) ==========

      const db = new admin.firestore.Firestore({
        databaseId: "munidb",
      });

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
        // Agregamos metadata adicional para debugging
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
        timestamp: new Date().toISOString(), // Mejora: agregar timestamp
      };
    } catch (error: unknown) {
      const executionTime = Date.now() - startTime;

      // Si ya es un HttpsError, lo relanzamos
      if (error instanceof functions.https.HttpsError) {
        functions.logger.warn("Error de HttpsError en addTestData", {
          error: error.message,
          code: error.code,
          executionTime: `${executionTime}ms`,
        });
        throw error;
      }

      // Para otros errores, loguear y lanzar error genérico
      functions.logger.error("Error inesperado en addTestData", {
        error: error instanceof Error ? error.message : "Error desconocido",
        executionTime: `${executionTime}ms`,
      });

      // En desarrollo, dar más detalles del error
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

// ==================== FUNCIÓN GENERATE INVITATION (SIN CAMBIOS) ====================

export const generateInvitation = generateInvitationFunction;

// ==================== FUNCIONES ADICIONALES ====================

// FUNCIÓN DE LIMPIEZA AUTOMÁTICA

import { onSchedule } from "firebase-functions/v2/scheduler";

export const cleanupTestData = onSchedule(
  {
    schedule: "every 24 hours",
    timeZone: "America/Argentina/Buenos_Aires",
  },
  async () => {
    try {
      const db = new admin.firestore.Firestore({ databaseId: "munidb" });
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 7); // Hace 7 días

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

// ==================== EXPORTACIONES PARA TESTING (SOLO DESARROLLO) ====================

if (process.env.FUNCTIONS_EMULATOR) {
  // Estas exportaciones solo estarán disponibles en el emulador
  exports._testExports = {
    // Utilidades para testing
  };
}
