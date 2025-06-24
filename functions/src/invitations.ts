// functions/src/invitations.ts

import * as functions from "firebase-functions";
import { CallableRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

// 0. Inicializa Firebase Admin SDK para la app por defecto
if (!admin.apps.length) {
  admin.initializeApp();
  functions.logger.info("Firebase Admin inicializado para app por defecto");
}

// 🔥 Obtener instancia de Firestore para 'munidb' usando el método correcto
const getFirestoreForMunidb = () => {
  try {
    // Intentar obtener la app existente para 'munidb'
    return admin.app("munidb").firestore();
  } catch (e) {
    // Si no existe, crear nueva app
    functions.logger.info("Creando nueva app para munidb");

    // IMPORTANTE: Reemplaza con la URL real de tu base de datos
    const databaseURL = "https://muni-22fa0-munidb.firebaseio.com";

    const munidbApp = admin.initializeApp(
      {
        databaseURL: databaseURL,
      },
      "munidb"
    );

    functions.logger.info(`App para munidb creada con URL: ${databaseURL}`);
    return munidbApp.firestore();
  }
};

const db = getFirestoreForMunidb();
functions.logger.info("Firestore para munidb inicializado");

// 0.1. Definir la interfaz de la Invitación
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

// 0.2. Definir la interfaz para los datos de entrada
interface GenerateInvitationRequestData {
  dni: string;
  key: string;
  role: string;
  createdBy?: string;
}

// Nombre de la Cloud Function: 'generateInvitation'
export const generateInvitation = functions.https.onCall(
  async (request: CallableRequest<GenerateInvitationRequestData>) => {
    // --- DEBUGGING INICIAL ---
    functions.logger.info("DEBUG CF: Invocación de generateInvitation");
    functions.logger.info(
      `DEBUG CF: Datos recibidos: ${JSON.stringify(request.data)}`
    );
    functions.logger.info(
      `DEBUG CF: Project ID: ${admin.app().options.projectId}`
    );
    functions.logger.info("DEBUG CF: Usando base de datos: munidb");
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
    functions.logger.info(`DEBUG CF: UID autenticado: ${callingUserId}`);

    // 🔥 Usar ruta normal SIN prefijo munidb/
    const userDocRefPath = `users/${callingUserId}`;
    functions.logger.info(
      `DEBUG CF: Ruta documento usuario: ${userDocRefPath}`
    );

    // --- DEPURACIÓN ADICIONAL DEL UID ---
    functions.logger.info(`DEBUG CF: UID: "${callingUserId}"`);
    functions.logger.info(`DEBUG CF: Longitud UID: ${callingUserId.length}`);
    // --- FIN DEPURACIÓN ---

    try {
      // 🔥 Obtener documento usando instancia específica de munidb
      const userDoc = await db.doc(userDocRefPath).get();

      functions.logger.info(`DEBUG CF: userDoc.exists: ${userDoc.exists}`);
      let userRole: string | undefined | null = null;

      if (userDoc.exists) {
        const userData = userDoc.data();
        userRole = userData?.role;
        functions.logger.info(
          `DEBUG CF: Datos usuario: ${JSON.stringify(userData)}`
        );
      } else {
        functions.logger.warn(
          `DEBUG CF: Usuario no encontrado: ${callingUserId}`
        );
      }

      functions.logger.info(`DEBUG CF: Rol obtenido: "${userRole}"`);

      const authorizedRoles = ["root", "admin principal", "rrhh admin"];
      functions.logger.info(
        `DEBUG CF: Roles autorizados: ${authorizedRoles.join(", ")}`
      );

      // Verificar autorización
      const isAuthorized = userRole && authorizedRoles.includes(userRole);
      functions.logger.info(`DEBUG CF: Autorizado: ${isAuthorized}`);

      if (!userDoc.exists || !isAuthorized) {
        functions.logger.warn("DEBUG CF: Acceso denegado");
        throw new functions.https.HttpsError(
          "permission-denied",
          "No tienes permisos suficientes para generar invitaciones."
        );
      }

      functions.logger.info(`DEBUG CF: Permisos verificados. Rol: ${userRole}`);
    } catch (error: unknown) {
      functions.logger.error(
        "DEBUG CF: Error en verificación de roles:",
        error
      );

      // Manejar error específico de Firestore
      if (error instanceof Error) {
        if (error.message.includes("NOT_FOUND") || (error as any).code === 5) {
          functions.logger.error(
            `DEBUG CF: Usuario no encontrado: ${callingUserId}`
          );
          throw new functions.https.HttpsError(
            "permission-denied",
            "No se pudo verificar su rol. Asegúrese de que su perfil exista en Firestore."
          );
        }

        throw new functions.https.HttpsError(
          "internal",
          "Error al verificar permisos.",
          error.message
        );
      }

      throw new functions.https.HttpsError(
        "internal",
        "Error desconocido al verificar permisos."
      );
    }

    // 2. Validación de datos de entrada
    const { dni, key, role, createdBy } = request.data;

    functions.logger.info(
      `DEBUG CF: Validando: DNI=${dni}, KEY=${key}, ROLE=${role}`
    );

    if (!dni || typeof dni !== "string") {
      functions.logger.error("Validación Fallida: DNI no válido.");
      throw new functions.https.HttpsError(
        "invalid-argument",
        "El DNI es requerido y debe ser texto."
      );
    }
    if (!key || typeof key !== "string") {
      functions.logger.error("Validación Fallida: Clave no válida.");
      throw new functions.https.HttpsError(
        "invalid-argument",
        "La clave es requerida y debe ser texto."
      );
    }
    if (!role || typeof role !== "string") {
      functions.logger.error("Validación Fallida: Rol no válido.");
      throw new functions.https.HttpsError(
        "invalid-argument",
        "El rol es requerido y debe ser texto."
      );
    }

    const allowedInviteRoles = ["colaborador", "datos", "rrhh"];
    functions.logger.info(
      `DEBUG CF: Roles permitidos: ${allowedInviteRoles.join(", ")}`
    );

    if (!allowedInviteRoles.includes(role)) {
      functions.logger.error(`Rol no permitido: ${role}`);
      throw new functions.https.HttpsError(
        "invalid-argument",
        `El rol '${role}' no está permitido.`
      );
    }

    functions.logger.info("DEBUG CF: Validación exitosa");

    // 3. Crear objeto de invitación usando la interfaz InvitationData
    const newInvitationDoc: Omit<InvitationData, "id"> = {
      dni,
      key,
      role,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: createdBy || request.auth.uid,
      used: false,
    };

    functions.logger.info(
      `DEBUG CF: Invitación a guardar: ${JSON.stringify(newInvitationDoc)}`
    );

    try {
      // Guardar en colección SIN prefijo munidb/
      const docRef = await db
        .collection("candidateInvitations")
        .add(newInvitationDoc);

      functions.logger.info(`DEBUG CF: Invitación guardada ID: ${docRef.id}`);

      // Obtener documento recién creado
      const createdDoc = await docRef.get();
      const invitationData = createdDoc.data() as InvitationData | undefined;

      if (!invitationData) {
        functions.logger.error("Error: No se pudo recuperar invitación creada");
        throw new functions.https.HttpsError(
          "internal",
          "Error al recuperar invitación creada"
        );
      }

      functions.logger.info(
        `DEBUG CF: Invitación creada: ${JSON.stringify(invitationData)}`
      );

      // Devolver respuesta usando la interfaz InvitationData
      return {
        id: docRef.id,
        ...invitationData,
        createdAt: invitationData.createdAt,
      } as InvitationData;
    } catch (error: unknown) {
      functions.logger.error("Error al guardar invitación:", error);

      if (error instanceof Error) {
        throw new functions.https.HttpsError(
          "internal",
          "Error al generar invitación",
          process.env.FUNCTIONS_EMULATOR ? error.message : undefined
        );
      }

      throw new functions.https.HttpsError(
        "internal",
        "Error desconocido al generar invitación"
      );
    }
  }
);
