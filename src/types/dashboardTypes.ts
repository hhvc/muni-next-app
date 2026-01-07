// src/types/dashboardTypes.ts

// Asegúrate de importar Timestamp desde 'firebase/firestore' para el tipado correcto
import { Timestamp } from "firebase/firestore";

// Interfaz para los datos de usuario en la colección 'users' (Firebase Auth)
export interface DashboardUser {
  id: string; // UID del usuario de Firebase Auth
  email: string;
  role?: string; // Rol principal (para compatibilidad)
  roles?: string[]; // Array de roles (nuevo)
  primaryRole?: string; // Rol principal para UI
  displayName?: string; // Nombre para mostrar del usuario
  photoURL?: string | null; // URL de la foto de perfil
  createdAt?: Date | null; // Fecha de creación del usuario
  lastLoginAt?: Date | null; // Fecha del último login
  dni?: string; // DNI del usuario
  invitationCode?: string; // Código de invitación usado
  invitationDocId?: string; // ID del documento de invitación
  loginHistory?: Date[]; // Historial de logins
  updatedAt?: Date | null; // Fecha de última actualización
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
  createdAt: Date | null; // Convertido de Timestamp a Date para mostrar (en el frontend)
  documentUrls?: { [key: string]: string }; // Asumo que guardas URLs de documentos aquí
  // Si hay otros campos a nivel raíz en tu documento de Firestore (fuera de personalData),
  // como 'invitationId' o 'submittedAt', agrégalos aquí también.
  invitationId?: string;
  submittedAt?: Date | null; // Si guardas la fecha de envío definitivo (en el frontend)
}

// Interfaz para los datos en la colección 'candidateInvitations'
// Esta interfaz es ahora la fuente de verdad para la estructura de las invitaciones.
// Es la misma estructura que tu Cloud Function devuelve.
export interface Invitation {
  id: string; // ID del documento de invitación
  email?: string; // Email es opcional (se llena al usar la invitación)
  dni: string; // DNI es obligatorio
  code: string; // Clave/Contraseña es obligatoria
  role: string; // Rol que se asignará al completar el formulario (mantenemos string para compatibilidad con invitaciones)
  roles?: string[]; // Array de roles (opcional para futura expansión)
  createdAt: Timestamp; // 🎯 ¡Esto es crucial! Debe ser un Firestore Timestamp.
  createdBy: string; // UID del admin que creó la invitación
  used: boolean; // Si la invitación ha sido usada
  usedAt?: Timestamp; // Fecha en que se usó
  usedBy?: string; // UID del usuario que usó la invitación
}

// Nuevos tipos para el sistema de roles múltiples
export interface RolePermissions {
  canViewDashboard: boolean;
  canManageUsers: boolean;
  canManageEmployees: boolean;
  canViewReports: boolean;
  canManageInvitations: boolean;
  // Agrega más permisos según necesites
}

export const ROLE_HIERARCHY = {
  root: 100,
  admin: 90,
  hr: 80,
  data: 70,
  collaborator: 60,
  pending_verification: 10,
  nuevo: 5,
  viewer: 40, // Nuevos roles
  editor: 50,
  manager: 85,
} as const;

export type UserRole = keyof typeof ROLE_HIERARCHY;

// Helper types para verificación de roles
export type HasRole<T extends string> = {
  roles: string[];
  hasRole: (role: T) => boolean;
  hasAnyRole: (roles: T[]) => boolean;
};

export type WithRoles = {
  roles: string[];
  primaryRole?: string;
};

// Tipo para guardar las preferencias de usuario
export interface UserPreferences {
  theme?: "light" | "dark" | "auto";
  language?: string;
  notifications?: {
    email: boolean;
    push: boolean;
    weeklyDigest: boolean;
  };
}

// Tipo extendido para incluir preferencias
export interface ExtendedDashboardUser extends DashboardUser {
  preferences?: UserPreferences;
}
