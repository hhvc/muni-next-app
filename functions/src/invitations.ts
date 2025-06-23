// functions/src/invitations.ts

import * as functions from "firebase-functions";
import { CallableRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

// 0. Inicializa Firebase Admin SDK
// Esto es importante para las pruebas en emuladores y para el despliegue.
// Si ya tienes un archivo `index.ts` principal donde inicializas `admin.initializeApp()`,
// asegúrate de no inicializarlo dos veces si este archivo se importa allí.
if (!admin.apps.length) {
  admin.initializeApp();
}

// 0.1. Definir la interfaz de la Invitación aquí para que la función la conozca.
// *** CAMBIO CLAVE AQUÍ: email ahora es opcional. dni y key son obligatorios ***
interface InvitationData {
  id?: string;
  email?: string; // Ahora es opcional, se llenará cuando la invitación sea usada
  dni: string; // Ahora es obligatorio
  key: string; // Ahora es obligatorio
  role: string;
  createdAt: admin.firestore.FieldValue | admin.firestore.Timestamp;
  createdBy: string;
  used: boolean;
  usedAt?: admin.firestore.Timestamp;
  usedBy?: string;
}

// 0.2. Definir la interfaz para los datos de entrada que esperamos del cliente.
// *** CAMBIO CLAVE AQUÍ: No se espera 'email' al generar la invitación. dni y key son obligatorios. ***
interface GenerateInvitationRequestData {
  dni: string; // Ahora es obligatorio
  key: string; // Ahora es obligatorio
  role: string;
  createdBy?: string; // Opcional, si el cliente envía el UID del creador
}

// Nombre de la Cloud Function: 'generateInvitation'
export const generateInvitation = functions.https.onCall(
  async (request: CallableRequest<GenerateInvitationRequestData>) => {
    // 1. Autenticación y Autorización
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

      const authorizedRoles = ["root", "admin principal", "rrhh admin"];
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
    // *** CAMBIO CLAVE AQUÍ: Acceso a dni, key, role. Ya no se espera email. ***
    const { dni, key, role, createdBy } = request.data; // Acceso a los datos

    // *** CAMBIO CLAVE AQUÍ: Validaciones para DNI, Clave y Rol. Email ya no se valida aquí. ***
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
        `El rol '${role}' no es un rol de invitación permitido.`
      );
    }

    // 3. Crear el objeto de invitación
    // *** CAMBIO CLAVE AQUÍ: newInvitationDoc ahora incluye dni y key, y no email (porque es opcional) ***
    const newInvitationDoc: Omit<
      InvitationData,
      "id" | "createdAt" | "email"
    > & {
      // Excluir email si no se proporciona al crear
      createdAt: admin.firestore.FieldValue;
      email?: string; // Permitir email opcional si el frontend lo enviara, aunque no lo haga ahora
    } = {
      dni,
      key,
      role,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: createdBy || request.auth.uid, // Acceso a UID
      used: false,
    };

    // Si tu frontend decidiera enviar email (aunque opcional), podrías añadirlo así:
    // if (request.data.email) {
    //   newInvitationDoc.email = request.data.email;
    // }

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

      // *** CAMBIO CLAVE AQUÍ: Asegurar que se devuelve email como opcional ***
      return {
        id: docRef.id,
        email: dataToReturn.email || undefined, // Devolver como opcional
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
