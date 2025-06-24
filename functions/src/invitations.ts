// functions/src/invitations.ts

import * as functions from "firebase-functions";
import { CallableRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

// NOTA IMPORTANTE: La inicialización de Firebase Admin SDK (admin.initializeApp())
// se maneja centralmente en 'functions/src/index.ts'.
// No es necesario ni recomendable inicializarla aquí de nuevo,
// ya que 'index.ts' importará y ejecutará este módulo después de la inicialización global.

// Inicializamos el cliente de Firestore.
// Para acceder a tu base de datos nombrada 'munidb',
// continuaremos usando el prefijo 'munidb/' en las rutas de las colecciones y documentos.
const db = admin.firestore();

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
  createdBy?: string; // Este campo podría ser redundante si ya obtienes el UID del request.auth
}

// Función Callable para generar una nueva invitación
export const generateInvitation = functions.https.onCall(
  async (request: CallableRequest<GenerateInvitationRequestData>) => {
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
      // 2. Verificación de Roles del Usuario
      // Acceder al documento del usuario en la base de datos 'munidb'
      const userDoc = await db.doc(`munidb/users/${callingUserId}`).get();

      if (!userDoc.exists) {
        functions.logger.error(`Usuario no encontrado en Firestore: ${callingUserId}`);
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
        functions.logger.warn(`Usuario ${callingUserId} con rol "${userRole}" intentó generar invitación sin permisos.`);
        throw new functions.https.HttpsError(
          "permission-denied",
          "Permisos insuficientes. Solo roles autorizados pueden generar invitaciones."
        );
      }

      // 3. Validación de Datos de la Solicitud
      const { dni, key, role } = request.data;

      if (!dni || !key || !role) {
        functions.logger.warn(`Datos incompletos para generar invitación por ${callingUserId}. DNI: ${dni}, Key: ${key}, Role: ${role}`);
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
      // Almacenar el nuevo documento en la colección 'munidb/candidateInvitations'
      const docRef = await db
        .collection("munidb/candidateInvitations") // Usamos el prefijo 'munidb/' aquí
        .add(newInvitation);

      functions.logger.info(`Invitación generada exitosamente por ${callingUserId} con ID: ${docRef.id}`);

      // Devolver los datos de la invitación generada al cliente
      return {
        id: docRef.id,
        ...newInvitation, // Incluimos todos los datos de la invitación creada
      };
    } catch (error) {
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
  }
);
