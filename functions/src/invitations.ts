// functions/src/invitations.ts

import * as functions from "firebase-functions";
import { CallableRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

// NOTA IMPORTANTE: La inicialización de Firebase Admin SDK (admin.initializeApp())
// para la App por defecto se maneja centralmente en 'functions/src/index.ts'.
// Cada función que necesite acceder a una base de datos nombrada (como 'munidb')
// debe crear su propia instancia de Firestore apuntando a esa base de datos.

// Interfaz para la estructura de los datos de una invitación
interface InvitationData {
  dni: string;
  key: string;
  role: string;
  createdAt: admin.firestore.FieldValue | admin.firestore.Timestamp;
  createdBy: string;
  used: boolean;
  usedAt?: admin.firestore.Timestamp;
  usedBy?: string;
}

// Interfaz para la estructura de los datos de la solicitud para generar una invitación
interface GenerateInvitationRequestData {
  dni: string;
  key: string;
  role: string;
  createdBy?: string;
}

// Función Callable para generar una nueva invitación
export const generateInvitation = functions.https.onCall(
  async (request: CallableRequest<GenerateInvitationRequestData>) => {
    // **** LA SOLUCIÓN DEFINITIVA PARA ACCEDER A 'munidb' ****
    // Creamos una nueva instancia de Firestore que apunta directamente a la base de datos 'munidb'.
    const db = new admin.firestore.Firestore({
      databaseId: "munidb", // ¡Aquí es donde va el databaseId!
    });
    functions.logger.info(
      "Cliente de Firestore inicializado para 'munidb' en generateInvitation."
    );
    // **********************************************************

    // 1. Verificación de Autenticación
    if (!request.auth) {
      functions.logger.warn("Intento de generar invitación sin autenticación.");
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Autenticación requerida para generar invitaciones."
      );
    }

    const callingUserId = request.auth.uid; // ID del usuario que realiza la llamada

    try {
      // ¡ABRE EL BLOQUE TRY!
      // 2. Verificación de Roles del Usuario
      // Acceder al documento del usuario.
      // Ya NO necesitas el prefijo "munidb/" en la ruta, porque 'db' ya apunta a "munidb".
      const userDoc = await db.doc(`users/${callingUserId}`).get();

      if (!userDoc.exists) {
        functions.logger.error(
          `Usuario no encontrado en Firestore: ${callingUserId}`
        );
        throw new functions.https.HttpsError(
          "not-found",
          "Usuario no encontrado. Asegúrate de que tu perfil de usuario exista."
        );
      }

      const userData = userDoc.data();
      const userRole = userData?.role; // Obtener el rol del usuario

      // Roles autorizados para generar invitaciones
      const authorizedRoles = ["root", "admin principal", "rrhh admin"];
      if (!userRole || !authorizedRoles.includes(userRole)) {
        functions.logger.warn(
          `Usuario ${callingUserId} con rol "${userRole}" intentó generar invitación sin permisos.`
        );
        throw new functions.https.HttpsError(
          "permission-denied",
          "Permisos insuficientes. Solo roles autorizados pueden generar invitaciones."
        );
      }

      // 3. Validación de Datos de la Solicitud
      const { dni, key, role } = request.data;

      if (!dni || !key || !role) {
        functions.logger.warn(
          `Datos incompletos para generar invitación por ${callingUserId}. DNI: ${dni}, Key: ${key}, Role: ${role}`
        );
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Datos incompletos. DNI, Clave y Rol son campos requeridos."
        );
      }

      // 4. Creación de la Nueva Invitación
      const newInvitation: InvitationData = {
        dni,
        key,
        role,
        createdAt: admin.firestore.FieldValue.serverTimestamp(), // Marca de tiempo del servidor
        createdBy: callingUserId,
        used: false, // Por defecto, la invitación no ha sido usada
      };

      // 5. Guardar la Invitación en Firestore
      // Almacenar el nuevo documento en la colección 'candidateInvitations'.
      // Ya NO necesitas el prefijo "munidb/" aquí.
      const docRef = await db
        .collection("candidateInvitations")
        .add(newInvitation);
      const createdDocSnapshot = await docRef.get();
      if (!createdDocSnapshot.exists) {
        throw new functions.https.HttpsError(
          "internal",
          "Error al recuperar la invitación recién creada."
        );
      }
      const actualInvitationData = createdDocSnapshot.data(); // Obtiene los datos, con createdAt como Timestamp

      functions.logger.info(
        `Invitación generada exitosamente por ${callingUserId} con ID: ${docRef.id}`
      );

      // Devolver los datos reales de la invitación generada, con el Timestamp correcto
      return {
        id: docRef.id,
        ...actualInvitationData, // Incluimos todos los datos de la invitación creada
      };
    } catch (error) {
      // ¡CIERRA EL BLOQUE TRY Y ABRE EL BLOQUE CATCH!
      // Manejo de errores: Registrar y lanzar HttpsError
      functions.logger.error("Error en generateInvitation:", error);

      if (error instanceof functions.https.HttpsError) {
        throw error; // Re-lanzar los errores HttpsError originales
      }

      // Para cualquier otro tipo de error, lanzar un error interno genérico
      throw new functions.https.HttpsError(
        "internal",
        "Error al generar invitación. Por favor, inténtalo de nuevo más tarde."
      );
    }
  } // ¡CIERRA LA FUNCIÓN ASYNC!
); // ¡CIERRA functions.https.onCall!
