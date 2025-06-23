// functions/src/invitations.ts

import * as functions from "firebase-functions";
// *** CAMBIO CLAVE AQUÍ: Solo importamos CallableRequest ***
import { CallableRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

// 0. Inicializa Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp();
}

// 0.1. Definir la interfaz de la Invitación aquí para que la función la conozca.
interface InvitationData {
  id?: string;
  email: string;
  dni?: string;
  key?: string;
  role: string;
  createdAt: admin.firestore.FieldValue | admin.firestore.Timestamp;
  createdBy: string;
  used: boolean;
  usedAt?: admin.firestore.Timestamp;
  usedBy?: string;
}

// 0.2. Definir la interfaz para los datos de entrada que esperamos del cliente.
interface GenerateInvitationRequestData {
  email: string;
  role: string;
  dni?: string;
  key?: string;
  createdBy?: string;
}

// Nombre de la Cloud Function: 'generateInvitation'
export const generateInvitation = functions.https.onCall(
  async (
    // *** CAMBIO CLAVE AQUÍ: La función solo recibe 'request' ***
    request: CallableRequest<GenerateInvitationRequestData>
  ) => {
    // 1. Autenticación y Autorización
    // *** CAMBIO CLAVE AQUÍ: Accedemos a auth a través de request.auth ***
    if (!request.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "La función requiere autenticación."
      );
    }

    const callingUserId = request.auth.uid; // Acceso a UID
    try {
      const userDoc = await admin
        .firestore()
        .collection("users")
        .doc(callingUserId)
        .get();
      const userRole = userDoc.data()?.role;

      const authorizedRoles = ["admin", "RRHH-Admin"];
      if (!userRole || !authorizedRoles.includes(userRole)) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "No tienes permisos suficientes para generar invitaciones."
        );
      }
    } catch (error: unknown) {
      console.error("Error al verificar el rol del usuario:", error);
      throw new functions.https.HttpsError(
        "internal",
        "Error al verificar permisos de usuario."
      );
    }

    // 2. Validación de datos de entrada
    const { email, role, dni, key, createdBy } = request.data; // Acceso a los datos

    if (!email || typeof email !== "string" || !email.includes("@")) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "El email es requerido, debe ser una cadena de texto y un formato válido."
      );
    }
    if (!role || typeof role !== "string") {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "El rol es requerido y debe ser una cadena de texto."
      );
    }

    if (dni !== undefined && typeof dni !== "string") {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "El DNI debe ser una cadena de texto si se proporciona."
      );
    }
    if (key !== undefined && typeof key !== "string") {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "La clave debe ser una cadena de texto si se proporciona."
      );
    }

    const allowedInviteRoles = ["colaborador", "datos", "rrhh", "user"];
    if (!allowedInviteRoles.includes(role)) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        `El rol '${role}' no es un rol de invitación permitido.`
      );
    }

    // 3. Crear el objeto de invitación
    const newInvitationDoc: Omit<InvitationData, "id" | "createdAt"> & {
      createdAt: admin.firestore.FieldValue;
    } = {
      email,
      role,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: createdBy || request.auth.uid, // Acceso a UID
      used: false,
    };

    if (dni) {
      newInvitationDoc.dni = dni;
    }
    if (key) {
      newInvitationDoc.key = key;
    }

    try {
      // 4. Persistir la invitación en Firestore
      const docRef = await admin
        .firestore()
        .collection("candidateInvitations")
        .add(newInvitationDoc);

      // 5. Devolver los datos de la invitación creada al cliente, incluyendo el ID
      const createdDocSnapshot = await docRef.get();
      const dataToReturn = createdDocSnapshot.data() as
        | InvitationData
        | undefined;

      if (!dataToReturn) {
        throw new functions.https.HttpsError(
          "internal",
          "No se pudo recuperar la invitación recién creada."
        );
      }

      return {
        id: docRef.id,
        email: dataToReturn.email,
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
      console.error("Error al añadir invitación a Firestore:", error);
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
