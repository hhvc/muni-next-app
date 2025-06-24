// functions/src/invitations.ts

import * as functions from "firebase-functions";
import { CallableRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

// 0. Inicializa Firebase Admin SDK una sola vez
if (!admin.apps.length) {
  admin.initializeApp();
}

const firestore = admin.firestore();

// Log para verificar la base de datos conectada
functions.logger.info(
  `DEBUG CF: Conectado a Firestore databaseId = ${
    (firestore as any)._databaseId?.database
  }`
);

// Interfaces
interface InvitationData {
  id?: string;
  email?: string;
  dni: string;
  key: string;
  role: string;
  createdAt: admin.firestore.FieldValue | admin.firestore.Timestamp;
  createdBy: string;
  used: boolean;
  usedAt?: admin.firestore.Timestamp;
  usedBy?: string;
}

interface GenerateInvitationRequestData {
  dni: string;
  key: string;
  role: string;
  createdBy?: string;
}

export const generateInvitation = functions.https.onCall(
  async (request: CallableRequest<GenerateInvitationRequestData>) => {
    functions.logger.info(`DEBUG CF: Invocación de generateInvitation`);
    functions.logger.info(
      `DEBUG CF: Datos recibidos del frontend: ${JSON.stringify(request.data)}`
    );

    if (!request.auth) {
      functions.logger.error("DEBUG CF: No autenticado.");
      throw new functions.https.HttpsError(
        "unauthenticated",
        "La función requiere autenticación."
      );
    }

    const callingUserId = request.auth.uid;
    functions.logger.info(`DEBUG CF: UID del usuario: ${callingUserId}`);
    functions.logger.info(
      `DEBUG CF: Intentando obtener documento en users/${callingUserId}`
    );

    try {
      const userDoc = await firestore
        .collection("users")
        .doc(callingUserId)
        .get();

      functions.logger.info(`DEBUG CF: userDoc.exists = ${userDoc.exists}`);
      let userRole: string | null | undefined = null;

      if (userDoc.exists) {
        const userData = userDoc.data();
        userRole = userData?.role;
        functions.logger.info(
          `DEBUG CF: Datos del user: ${JSON.stringify(userData)}`
        );
      } else {
        functions.logger.warn(
          `DEBUG CF: No se encontró el documento del usuario.`
        );
      }

      const authorizedRoles = ["root", "admin principal", "rrhh admin"];
      if (!userDoc.exists || !userRole || !authorizedRoles.includes(userRole)) {
        functions.logger.warn(
          `DEBUG CF: Acceso denegado. Rol=${userRole} autorizado=${authorizedRoles.includes(
            userRole || ""
          )}`
        );
        throw new functions.https.HttpsError(
          "permission-denied",
          "No tienes permisos suficientes para generar invitaciones."
        );
      }

      functions.logger.info(`DEBUG CF: Permisos OK. Rol = ${userRole}`);
    } catch (error: unknown) {
      console.error("DEBUG CF: Error verificando roles:", error);
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        (error as any).code === 5 &&
        (error as any).details?.includes("NOT_FOUND")
      ) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "No se pudo verificar su rol. Asegúrese de que su perfil de usuario exista en Firestore."
        );
      } else if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      throw new functions.https.HttpsError(
        "internal",
        "Error al verificar permisos de usuario.",
        error instanceof Error ? error.message : String(error)
      );
    }

    // Validación de entrada
    const { dni, key, role, createdBy } = request.data;

    if (!dni || typeof dni !== "string") {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "El DNI es requerido y debe ser una cadena de texto."
      );
    }
    if (!key || typeof key !== "string") {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "La clave es requerida y debe ser una cadena de texto."
      );
    }
    if (!role || typeof role !== "string") {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "El rol es requerido y debe ser una cadena de texto."
      );
    }

    const allowedInviteRoles = ["colaborador", "datos", "rrhh"];
    if (!allowedInviteRoles.includes(role)) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        `El rol '${role}' no es válido para invitaciones.`
      );
    }

    // Crear el objeto de invitación
    const newInvitationDoc: Omit<
      InvitationData,
      "id" | "createdAt" | "email"
    > & {
      createdAt: admin.firestore.FieldValue;
      email?: string;
    } = {
      dni,
      key,
      role,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: createdBy || request.auth.uid,
      used: false,
    };

    try {
      const docRef = await firestore
        .collection("candidateInvitations")
        .add(newInvitationDoc);
      const createdDocSnapshot = await docRef.get();
      const dataToReturn = createdDocSnapshot.data() as
        | InvitationData
        | undefined;

      if (!dataToReturn) {
        throw new functions.https.HttpsError(
          "internal",
          "No se pudo recuperar la invitación creada."
        );
      }

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
      console.error("DEBUG CF: Error al guardar invitación:", error);
      throw new functions.https.HttpsError(
        "internal",
        "No se pudo generar la invitación.",
        error instanceof Error ? error.message : String(error)
      );
    }
  }
);
