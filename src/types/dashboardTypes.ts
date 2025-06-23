// src/types/dashboardTypes.ts

import { Timestamp } from "firebase/firestore";

// Interfaz para los datos de usuario en la colección 'users' (Firebase Auth)
export interface DashboardUser {
  id: string; // UID del usuario de Firebase Auth
  email: string;
  role?: string; // El rol del usuario (ej: "user", "RRHH-Admin", "admin") - asegúrate de que este campo exista en tu colección 'users'
  // Puedes añadir otros campos que guardes en el documento del usuario si son relevantes para el dashboard
}

// --- Nueva interfaz para los datos personales ANIDADOS ---
// Esta interfaz representa la estructura del objeto 'personalData' dentro de tu documento de empleado en Firestore
export interface EmployeePersonalData {
  nombre: string;
  apellido: string;
  dni: string;
  cuil?: string; // Incluir CUIL si existe en tus datos personales
  fechaNacimiento?: string; // Tipo string para la fecha
  direccion?: string;
  telefono: string;
  telefonoAlternativo?: string;
  mail: string; // Correo electrónico de los datos personales
  genero?: string; // Añadir si existe en tus datos personales
  estadoCivil?: string; // Añadir si existe en tus datos personales
  // Agrega aquí cualquier otro campo que tengas en el objeto 'personalData' de Firestore
}

// Interfaz para los datos en la colección 'employee-data'
// Ahora refleja la estructura anidada del Firestore
export interface EmployeeDataRecord {
  id: string; // ID del documento (coincide con el userId de Auth)
  personalData: EmployeePersonalData; // ¡Este es el cambio clave!
  status: "draft" | "completed" | "unknown"; // Asumo que este campo existe y puede ser 'unknown'
  createdAt: Date | null; // Convertido de Timestamp a Date para mostrar
  documentUrls?: { [key: string]: string }; // Asumo que guardas URLs de documentos aquí
  // Si hay otros campos a nivel raíz en tu documento de Firestore (fuera de personalData),
  // como 'invitationId' o 'submittedAt', agrégalos aquí también.
  invitationId?: string;
  submittedAt?: Date | null; // Si guardas la fecha de envío definitivo
}

// Interfaz para los datos en la colección 'candidateInvitations'
export interface Invitation {
  id: string; // ID del documento de invitación
  email?: string; // CAMBIO CLAVE: Email ahora es opcional (se llena al usar la invitación)
  dni: string; // CAMBIO CLAVE: DNI ahora es obligatorio
  key: string; // CAMBIO CLAVE: Clave/Contraseña ahora es obligatoria
  role: string; // Rol que se asignará al completar el formulario
  createdAt: Timestamp;
  createdBy: string; // UID del admin que creó la invitación
  used: boolean; // Si la invitación ha sido usada
  usedAt?: Timestamp; // Fecha en que se usó
  usedBy?: string; // UID del usuario que usó la invitación
}
