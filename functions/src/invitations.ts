// functions/src/invitations.ts

import * as functions from "firebase-functions";
import { CallableRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

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

interface GenerateInvitationRequestData {
  dni: string;
  key: string;
  role: string;
  createdBy?: string;
}

export const generateInvitation = functions.https.onCall(
  async (request: CallableRequest<GenerateInvitationRequestData>) => {
    if (!request.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Autenticación requerida"
      );
    }

    const callingUserId = request.auth.uid;

    try {
      // 🔥 Usar prefijo "munidb/" en la colección de usuarios
      const userDoc = await db.doc(`munidb/users/${callingUserId}`).get();

      if (!userDoc.exists) {
        functions.logger.error(`Usuario no encontrado: ${callingUserId}`);
        throw new functions.https.HttpsError(
          "not-found",
          "Usuario no encontrado"
        );
      }

      const userData = userDoc.data();
      const userRole = userData?.role;

      const authorizedRoles = ["root", "admin principal", "rrhh admin"];
      if (!userRole || !authorizedRoles.includes(userRole)) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "Permisos insuficientes"
        );
      }

      const { dni, key, role } = request.data;

      // Validación básica
      if (!dni || !key || !role) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Datos incompletos"
        );
      }

      const newInvitation: InvitationData = {
        dni,
        key,
        role,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        createdBy: callingUserId,
        used: false,
      };

      // 🔥 Usar prefijo "munidb/" en la colección de invitaciones
      const docRef = await db
        .collection("munidb/candidateInvitations")
        .add(newInvitation);

      return {
        id: docRef.id,
        ...newInvitation,
      };
    } catch (error) {
      functions.logger.error("Error en generateInvitation:", error);

      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      throw new functions.https.HttpsError(
        "internal",
        "Error al generar invitación"
      );
    }
  }
);
