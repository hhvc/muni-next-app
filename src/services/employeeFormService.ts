// src/services/employeeFormService.ts
import {
  doc,
  setDoc,
  updateDoc,
  Timestamp,
  getDoc,
  Firestore, // Assuming Firestore is imported from firebase/firestore Client SDK
} from "firebase/firestore";
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  FirebaseStorage, // Assuming FirebaseStorage is imported from firebase/storage Client SDK
} from "firebase/storage";

import {
  EmployeeData,
  DocumentUrls,
  PersonalData,
  FileType, // Ensure FileType is imported here for type safety with attachedFiles
  DocumentUrlKey, // Ensure DocumentUrlKey is imported here
} from "@/types/employeeFormTypes";

// --- Helper function to upload a single file ---
// This function EXPECTS a non-null FirebaseStorage instance
export const uploadFile = async (
  storage: FirebaseStorage, // Requires a valid Storage instance
  file: File,
  userId: string,
  fileType: FileType // Use FileType for type safety
): Promise<string> => {
  try {
    // Genera un nombre de archivo único para evitar colisiones
    const fileExtension = file.name.split(".").pop();
    // Usamos fileType, userId y timestamp para un nombre descriptivo y único
    const fileName = `${fileType}-${userId}-${Date.now()}.${fileExtension}`;
    const storageRef = ref(
      storage,
      `employee-documents/${userId}/${fileType}/${fileName}` // Ruta en Storage: employee-documents/[userId]/[fileType]/[fileName]
    );

    console.log(`Starting upload for ${fileType} to ${storageRef.fullPath}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    // Espera a que la subida se complete
    await uploadTask;

    // Obtiene la URL de descarga
    const downloadURL = await getDownloadURL(storageRef);
    console.log(`Upload of ${fileType} completed. URL: ${downloadURL}`);
    return downloadURL;
  } catch (error) {
    console.error(`Error uploading ${fileType}:`, error);
    // Relanzamos el error para que el llamador pueda manejarlo (ej: mostrar mensaje al usuario)
    throw new Error(
      `Failed to upload file: ${fileType}. Details: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
};

// --- Function to load employee data from Firestore ---
export const loadEmployeeData = async (
  db: Firestore, // Assumes Firestore Client SDK instance
  userId: string
): Promise<EmployeeData | null> => {
  try {
    // Assuming your Firestore instance 'db' is correctly connected to 'munidb'
    const docRef = doc(db, "employee-data", userId);
    const docSnap = await getDoc(docRef);
    // Consider adding type validation for the data loaded from Firestore
    return docSnap.exists() ? (docSnap.data() as EmployeeData) : null;
  } catch (error) {
    console.error("Error loading employee data:", error);
    // Rethrowing the error so the component can catch and display it
    throw new Error(
      `Failed to load employee data. Details: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
};

// --- Function to save the employee record (personal data + file URLs) ---
export const saveEmployeeRecord = async (
  db: Firestore, // Assumes Firestore Client SDK instance
  // --- ¡Aceptar FirebaseStorage | null aquí para el error de TypeScript! ---
  storage: FirebaseStorage | null,
  // --- Fin del cambio ---
  data: {
    personalData: PersonalData;
    attachedFiles: Record<FileType, File | null>; // Use FileType for the files object
    status: "draft" | "completed";
    userId: string;
    existingData: EmployeeData | null;
    invitationId: string;
  }
): Promise<{ success: boolean; documentUrls?: DocumentUrls }> => {
  const {
    personalData,
    attachedFiles,
    status,
    userId,
    existingData,
    invitationId,
  } = data;
  // Assuming your Firestore instance 'db' is correctly connected to 'munidb'
  const docRef = doc(db, "employee-data", userId);
  const now = Timestamp.now();

  // Prepara los datos a guardar/actualizar
  const recordData: Partial<EmployeeData> = {
    personalData,
    status,
    userId,
    updatedAt: now,
    // Inicializa documentUrls con los existentes.
    // Las nuevas URLs de archivo se añadirán/sobrescribirán aquí DESPUÉS de la subida.
    documentUrls: { ...existingData?.documentUrls } as DocumentUrls, // Casteo para asegurar tipo
  };

  // Añadir createdAt si es un nuevo registro
  if (!existingData) {
    recordData.createdAt = now;
  }

  // --- Lógica de subida de archivos (se ejecuta para cualquier guardado si hay archivos nuevos) ---
  const uploadPromises: Promise<void>[] = [];
  // Recorre todos los archivos adjuntos en el estado `attachedFiles`
  for (const fileType of Object.keys(attachedFiles) as FileType[]) {
    // Iterar con claves de FileType
    const file = attachedFiles[fileType];
    // Si hay un nuevo archivo adjunto para este tipo...
    if (file) {
      // ... Y si la instancia de Storage está disponible...
      if (storage) {
        // <-- ¡Verificación añadida aquí para el error de TypeScript!
        // Inicia la subida. La función uploadFile lanza un error si falla.
        const uploadPromise = uploadFile(storage, file, userId, fileType)
          .then((url) => {
            // Una vez que la subida termina, actualiza la URL en el objeto recordData.documentUrls
            // Asegúrate de que recordData.documentUrls esté inicializado.
            if (!recordData.documentUrls) {
              recordData.documentUrls = {} as DocumentUrls; // Inicializa si es null/undefined
            }
            // Asigna la URL usando la clave correcta (Filetype que debe coincidir con DocumentUrlKey)
            recordData.documentUrls[fileType as DocumentUrlKey] = url;
          })
          .catch((uploadError) => {
            // Registramos el error de subida de un archivo específico.
            console.error(`Failed to upload file ${fileType}:`, uploadError);
            // Re-lanzamos el error para que el Promise.all lo capture
            // y el catch principal en el componente maneje la falla total.
            throw uploadError;
          });
        uploadPromises.push(uploadPromise); // Añade la promesa al array
      } else {
        // Este caso idealmente no debería ocurrir si el componente verifica `storage`
        // antes de llamar a `saveEmployeeRecord` cuando hay `hasFilesToUpload`.
        // Pero lo manejamos por seguridad.
        console.error(
          `Attempted to upload file ${fileType} but Storage instance is null.`
        );
        // Podrías añadir una promesa rechazada aquí si esto debe considerarse una falla del guardado:
        // uploadPromises.push(Promise.reject(new Error("Storage service is not available for file upload.")));
      }
    }
  }

  // Espera a que todas las subidas de archivos pendientes terminen
  // Esto garantiza que recordData.documentUrls esté actualizado con las nuevas URLs antes de guardar el documento en Firestore
  if (uploadPromises.length > 0) {
    console.log(
      `Waiting for ${uploadPromises.length} file upload(s) to complete...`
    );
    try {
      await Promise.all(uploadPromises);
      console.log("All pending file uploads completed successfully.");
    } catch (uploadError) {
      // Si alguna subida falló, Promise.all se rechaza. Capturamos aquí
      // y relanzamos para que el componente maneje el error general de guardado.
      console.error("One or more file uploads failed.");
      throw uploadError; // Relanza el error original de subida
    }
  } else {
    console.log("No new files to upload in this save operation.");
  }
  // --- Fin de la lógica de subida de archivos ---

  // --- Lógica específica para el estado "completed" ---
  if (status === "completed") {
    // Ya se validó que todos los documentos requeridos tienen URL (existente o nueva)
    // antes de llamar a esta función con status 'completed'.
    // Las URLs de los documentos (existentes + nuevos subidos arriba) ya están en recordData.documentUrls
    recordData.submittedAt = now; // Marca la fecha de envío definitivo

    // Lógica para actualizar el estado de la invitación a 'used'
    // Asumo que invitationId es válido y la invitación existe en Firestore.
    try {
      console.log(`Attempting to mark invitation ${invitationId} as used.`);
      const invitationRef = doc(db, "candidateInvitations", invitationId);
      await updateDoc(invitationRef, {
        used: true,
        usedAt: now,
        usedBy: userId,
      });
      console.log(`Invitation ${invitationId} marked as used successfully.`);
    } catch (invitationError) {
      console.error(
        `Error updating invitation ${invitationId}:`,
        invitationError
      );
      // Decidir si fallar todo el guardado si la invitación no se puede marcar como usada.
      // Por ahora, lo registramos pero el guardado principal continuará.
      // Podrías lanzar un error aquí si es CRÍTICO que la invitación se actualice
      // (por ejemplo, para prevenir que el mismo enlace de invitación se use dos veces).
      // throw new Error(`Failed to mark invitation ${invitationId} as used.`);
    }
  }
  // --- Fin de la lógica específica para "completed" ---

  // Guarda/actualiza el documento principal en Firestore
  // setDoc con merge: true es CRUCIAL para no sobrescribir datos existentes, solo actualizar/añadir campos.
  // Esto preservará campos que no manejas en este formulario si existen (ej: rol, estado admin, etc.)
  try {
    console.log(
      `Saving employee record for user ${userId} with status: ${status}`
    );
    await setDoc(docRef, recordData as EmployeeData, { merge: true }); // Casteo final a EmployeeData si recordData es Partial
    console.log("Employee record saved successfully.");
    // Retornamos true y las URLs finales de los documentos guardados.
    return { success: true, documentUrls: recordData.documentUrls };
  } catch (firestoreError) {
    console.error("Error saving employee record to Firestore:", firestoreError);
    // Relanzamos el error para que el componente pueda manejar y mostrar el mensaje.
    throw new Error(
      `Failed to save employee record to Firestore: ${
        firestoreError instanceof Error
          ? firestoreError.message
          : String(firestoreError)
      }`
    );
  }
};
