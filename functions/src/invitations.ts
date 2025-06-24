// functions/src/invitations.ts

import * as functions from "firebase-functions";
import { CallableRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

// 0. Inicializa Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp();
}

// 0.1. Definir la interfaz de la Invitación aquí para que la función la conozca.
interface InvitationData {
  id?: string;
  email?: string; // Es opcional, se llenará cuando la invitación sea usada
  dni: string;
  key: string;
  role: string;
  createdAt: admin.firestore.FieldValue | admin.firestore.Timestamp;
  createdBy: string;
  used: boolean;
  usedAt?: admin.firestore.Timestamp;
  usedBy?: string;
}

// 0.2. Definir la interfaz para los datos de entrada que esperamos del cliente.
interface GenerateInvitationRequestData {
  dni: string;
  key: string;
  role: string;
  createdBy?: string; // Opcional, si el cliente envía el UID del creador
}

// Nombre de la Cloud Function: 'generateInvitation'
export const generateInvitation = functions.https.onCall(
  async (request: CallableRequest<GenerateInvitationRequestData>) => {
    // --- DEBUGGING INICIAL ---
    functions.logger.info(`DEBUG CF: Invocación de generateInvitation`);
    functions.logger.info(
      `DEBUG CF: Datos recibidos del frontend: ${JSON.stringify(request.data)}`
    );
    // --- FIN DEBUGGING INICIAL ---

    // 1. Autenticación y Autorización
    if (!request.auth) {
      functions.logger.error(
        "DEBUG CF: Autenticación Fallida: No hay usuario autenticado."
      );
      throw new functions.https.HttpsError(
        "unauthenticated",
        "La función requiere autenticación."
      );
    }

    const callingUserId = request.auth.uid;
    functions.logger.info(
      `DEBUG CF: UID del usuario autenticado: ${callingUserId}`
    );
    const userDocRefPath = `users/${callingUserId}`;
    functions.logger.info(
      `DEBUG CF: Intentando obtener documento en ruta: ${userDocRefPath}`
    );

    try {
      // <-- ESTE ES EL 'TRY' DEL BLOQUE DE AUTORIZACIÓN
      const userDoc = await admin
        .firestore()
        .collection("users")
        .doc(callingUserId)
        .get();

      functions.logger.info(`DEBUG CF: userDoc.exists: ${userDoc.exists}`);
      let userRole: string | undefined | null = null; // Inicializar a null

      if (userDoc.exists) {
        const userData = userDoc.data();
        userRole = userData?.role; // Obtener el rol del documento
        functions.logger.info(
          `DEBUG CF: Datos de userDoc: ${JSON.stringify(userData)}`
        );
      } else {
        functions.logger.warn(
          `DEBUG CF: Documento de usuario NO encontrado para UID: ${callingUserId}`
        );
      }

      functions.logger.info(
        `DEBUG CF: Rol obtenido de Firestore: "${userRole}"`
      );
      functions.logger.info(
        `DEBUG CF: Tipo de rol obtenido: ${typeof userRole}`
      );

      const authorizedRoles = ["root", "admin principal", "rrhh admin"]; // Roles autorizados para generar invitaciones
      functions.logger.info(
        `DEBUG CF: Roles autorizados: ${authorizedRoles.join(", ")}`
      );
      functions.logger.info(
        `DEBUG CF: userRole incluido en authorizedRoles: ${authorizedRoles.includes(
          userRole || ""
        )}`
      ); // Usar || "" para manejo de null/undefined

      // *** IMPORTANTE: La condición de denegación de acceso ***
      // Si el documento del usuario no existe, O el rol es nulo/indefinido, O el rol no está en los autorizados.
      if (!userDoc.exists || !userRole || !authorizedRoles.includes(userRole)) {
        functions.logger.warn(
          `DEBUG CF: Acceso denegado. Condición: userDoc.exists=${
            userDoc.exists
          }, userRole="${userRole}", autorizado=${authorizedRoles.includes(
            userRole || ""
          )}`
        );
        throw new functions.https.HttpsError(
          "permission-denied",
          "No tienes permisos suficientes para generar invitaciones."
        );
      }

      functions.logger.info(
        `DEBUG CF: Permisos de usuario VERIFICADOS. Rol: ${userRole}`
      );
    } catch (error: unknown) {
      // <-- ESTE ES SU 'CATCH' CORRESPONDIENTE
      console.error(
        "DEBUG CF: Error en el bloque de verificación de roles:",
        error
      );
      if (error instanceof functions.https.HttpsError) {
        throw error; // Re-lanzar el error HttpsError original
      }
      throw new functions.https.HttpsError(
        "internal",
        "Error al verificar permisos de usuario.",
        error instanceof Error ? error.message : String(error)
      );
    }

    // 2. Validación de datos de entrada
    const { dni, key, role, createdBy } = request.data; // Acceso a los datos

    functions.logger.info(
      `DEBUG CF: Validando datos de entrada: DNI=${dni}, KEY=${key}, ROLE=${role}`
    );

    if (!dni || typeof dni !== "string") {
      functions.logger.error("DEBUG CF: Validación Fallida: DNI no válido.");
      throw new functions.https.HttpsError(
        "invalid-argument",
        "El DNI es requerido y debe ser una cadena de texto."
      );
    }
    if (!key || typeof key !== "string") {
      functions.logger.error("DEBUG CF: Validación Fallida: Clave no válida.");
      throw new functions.https.HttpsError(
        "invalid-argument",
        "La clave es requerida y debe ser una cadena de texto."
      );
    }
    if (!role || typeof role !== "string") {
      functions.logger.error("DEBUG CF: Validación Fallida: Rol no válido.");
      throw new functions.https.HttpsError(
        "invalid-argument",
        "El rol es requerido y debe ser una cadena de texto."
      );
    }

    const allowedInviteRoles = ["colaborador", "datos", "rrhh"]; // Roles que se pueden asignar a una invitación
    functions.logger.info(
      `DEBUG CF: Roles permitidos para invitación: ${allowedInviteRoles.join(
        ", "
      )}`
    );
    if (!allowedInviteRoles.includes(role)) {
      functions.logger.error(
        `DEBUG CF: Validación Fallida: Rol de invitación no permitido: ${role}`
      );
      throw new functions.https.HttpsError(
        "invalid-argument",
        `El rol '${role}' no es un rol de invitación permitido.`
      );
    }
    functions.logger.info("DEBUG CF: Validación de datos de entrada Exitosa.");

    // 3. Crear el objeto de invitación
    const newInvitationDoc: Omit<
      InvitationData,
      "id" | "createdAt" | "email"
    > & {
      createdAt: admin.firestore.FieldValue;
      email?: string; // Permitir email opcional en el objeto si la interfaz lo permite
    } = {
      dni,
      key,
      role,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: createdBy || request.auth.uid, // `request.auth.uid` es el UID del usuario que llama
      used: false,
    };

    functions.logger.info(
      `DEBUG CF: Objeto de invitación a guardar: ${JSON.stringify(
        newInvitationDoc
      )}`
    );

    try {
      // <-- ESTE ES EL 'TRY' DEL BLOQUE DE PERSISTENCIA EN FIRESTORE
      // 4. Persistir la invitación en Firestore
      const docRef = await admin
        .firestore()
        .collection("candidateInvitations")
        .add(newInvitationDoc);

      functions.logger.info(
        `DEBUG CF: Invitación guardada en Firestore con ID: ${docRef.id}`
      );

      // 5. Devolver los datos de la invitación creada al cliente, incluyendo el ID
      const createdDocSnapshot = await docRef.get();
      const dataToReturn = createdDocSnapshot.data() as
        | InvitationData
        | undefined;

      if (!dataToReturn) {
        functions.logger.error(
          "DEBUG CF: Error interno: No se pudo recuperar la invitación recién creada después de guardarla."
        );
        throw new functions.https.HttpsError(
          "internal",
          "No se pudo recuperar la invitación recién creada."
        );
      }

      functions.logger.info(
        `DEBUG CF: Invitación creada y devuelta: ${JSON.stringify({
          id: docRef.id,
          ...dataToReturn,
        })}`
      );

      return {
        id: docRef.id,
        email: dataToReturn.email || undefined,
        role: dataToReturn.role,
        dni: dataToReturn.dni,
        key: dataToReturn.key,
        createdAt: dataToReturn.createdAt,
        createdBy: dataToReturn.createdBy,
        used: dataToReturn.used,
        usedAt: dataToReturn.usedAt,
        usedBy: dataToReturn.usedBy,
      } as InvitationData;
    } catch (error: unknown) {
      // <-- Y ESTE ES SU 'CATCH' CORRESPONDIENTE
      console.error("DEBUG CF: Error al añadir invitación a Firestore:", error); // Usamos console.error para que aparezca en los logs
      if (error instanceof Error) {
        throw new functions.https.HttpsError(
          "internal",
          "No se pudo generar la invitación debido a un error interno.",
          error.message
        );
      } else {
        throw new functions.https.HttpsError(
          "internal",
          "No se pudo generar la invitación debido a un error desconocido."
        );
      }
    }
  }
);
