// src/services/userService.ts
import {
  doc,
  setDoc,
  serverTimestamp,
  getDoc,
  arrayUnion,
  Timestamp,
  FieldValue,
} from "firebase/firestore";
import { db } from "@/firebase/clientApp";
import { User } from "firebase/auth";
import { logger } from "@/utils/logger";

export interface PlatformUser {
  displayName: string;
  email: string;
  photoURL: string;
  dni: string;
  roles: string[];
  primaryRole?: string;
  invitationCode: string;
  invitationDocId: string;
  createdAt: Timestamp | null;
  lastLoginAt: Timestamp | null;
  updatedAt: Timestamp | null;
  loginHistory: Timestamp[];
  isActive: boolean;
  userType: "platform" | "candidate";
}

// Tipo para los datos crudos de Firestore
interface RawFirestoreUser {
  role?: string;
  roles?: string[];
  displayName?: string;
  email?: string;
  photoURL?: string;
  dni?: string;
  invitationCode?: string;
  invitationDocId?: string;
  createdAt?: Timestamp | null;
  lastLoginAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
  loginHistory?: Timestamp[];
  isActive?: boolean;
  userType?: "platform" | "candidate";
}

// Tipo para escritura en Firestore (permite FieldValue)
type PlatformUserWrite = Omit<
  PlatformUser,
  "createdAt" | "lastLoginAt" | "updatedAt" | "loginHistory"
> & {
  createdAt: FieldValue | Timestamp | null;
  lastLoginAt: FieldValue | Timestamp | null;
  updatedAt: FieldValue | Timestamp | null;
  loginHistory: Timestamp[] | FieldValue;
};

// Cache para evitar lecturas repetidas de Firestore
const userCache = new Map<string, { data: PlatformUser; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

// Helper para migración smooth de role -> roles (CORREGIDO: sin any)
const migrateRoleToRoles = (data: RawFirestoreUser): string[] => {
  if (data.roles && Array.isArray(data.roles)) {
    return data.roles;
  }
  if (data.role) {
    return [data.role];
  }
  return ["pending_verification"];
};

// Helper para mantener compatibilidad
const getPrimaryRole = (roles: string[]): string => {
  const priority = ["root", "admin", "hr", "data", "collaborator"];
  for (const role of priority) {
    if (roles.includes(role)) return role;
  }
  return roles[0] || "pending_verification";
};

export const createPlatformUser = async (
  user: User
): Promise<{ isNewUser: boolean }> => {
  if (!user?.uid) {
    throw new Error("Usuario no válido: UID requerido");
  }

  try {
    const userRef = doc(db, "users", user.uid);
    const existingUser = await getDoc(userRef);

    if (existingUser.exists()) {
      logger.info("Usuario ya existe, actualizando último login...");
      await updateUserLastLogin(user.uid);

      // Actualizar cache con tipo correcto
      const data = existingUser.data() as RawFirestoreUser;
      const roles = migrateRoleToRoles(data);
      const primaryRole = getPrimaryRole(roles);

      const userData: PlatformUser = {
        displayName: data.displayName || "",
        email: data.email || "",
        photoURL: data.photoURL || "",
        dni: data.dni || "",
        roles: roles,
        primaryRole: primaryRole,
        invitationCode: data.invitationCode || "direct_signup",
        invitationDocId: data.invitationDocId || "",
        createdAt: data.createdAt || null,
        lastLoginAt: data.lastLoginAt || null,
        updatedAt: data.updatedAt || null,
        loginHistory: data.loginHistory || [],
        isActive: data.isActive !== undefined ? data.isActive : true,
        userType: data.userType || "platform",
      };

      userCache.set(user.uid, { data: userData, timestamp: Date.now() });

      return { isNewUser: false };
    }

    logger.info("Creando NUEVO usuario en Firestore...");

    const userData: PlatformUserWrite = {
      displayName: user.displayName?.trim() || "",
      email: user.email?.toLowerCase().trim() || "",
      photoURL: user.photoURL || "/default-avatar.png",
      dni: "",
      roles: ["pending_verification"],
      primaryRole: "pending_verification",
      invitationCode: "direct_signup",
      invitationDocId: "",
      createdAt: serverTimestamp(),
      lastLoginAt: serverTimestamp(),
      loginHistory: [Timestamp.now()],
      updatedAt: serverTimestamp(),
      isActive: true,
      userType: "platform",
    };

    await setDoc(userRef, userData);

    invalidateUserCache(user.uid);

    logger.success(
      "NUEVO usuario creado con roles ['pending_verification']:",
      user.uid
    );
    return { isNewUser: true };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Error desconocido";
    logger.error("Error en createPlatformUser:", errorMessage);
    throw new Error(`Error al crear usuario: ${errorMessage}`);
  }
};

// Función con cache
export const getCachedUserData = async (
  userId: string
): Promise<PlatformUser | null> => {
  const cached = userCache.get(userId);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    logger.debug("Usuario encontrado en cache:", userId);
    return cached.data;
  }

  const userData = await getUserData(userId);
  if (userData) {
    userCache.set(userId, { data: userData, timestamp: Date.now() });
    logger.debug("Usuario guardado en cache:", userId);
  }

  return userData;
};

// Invalidar cache
export const invalidateUserCache = (userId: string): void => {
  userCache.delete(userId);
  logger.debug("Cache invalidado para usuario:", userId);
};

export const updateUserLastLogin = async (userId: string): Promise<void> => {
  if (!userId) return;

  try {
    const userRef = doc(db, "users", userId);

    await setDoc(
      userRef,
      {
        lastLoginAt: serverTimestamp(),
        loginHistory: arrayUnion(Timestamp.now()),
        updatedAt: serverTimestamp(),
      } as {
        lastLoginAt: FieldValue;
        loginHistory: FieldValue;
        updatedAt: FieldValue;
      },
      { merge: true }
    );

    logger.success("Último login actualizado para usuario:", userId);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Error desconocido";
    logger.error("Error actualizando último login:", errorMessage);
    throw error;
  }
};

export const getUserData = async (
  userId: string
): Promise<PlatformUser | null> => {
  try {
    const userRef = doc(db, "users", userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      logger.debug("Usuario no encontrado en Firestore:", userId);
      return null;
    }

    const data = userDoc.data() as RawFirestoreUser;

    // Migración smooth de role -> roles
    const roles = migrateRoleToRoles(data);
    const primaryRole = getPrimaryRole(roles);

    const user: PlatformUser = {
      displayName: data.displayName || "",
      email: data.email || "",
      photoURL: data.photoURL || "",
      dni: data.dni || "",
      roles: roles,
      primaryRole: primaryRole,
      invitationCode: data.invitationCode || "direct_signup",
      invitationDocId: data.invitationDocId || "",
      createdAt: data.createdAt || null,
      lastLoginAt: data.lastLoginAt || null,
      updatedAt: data.updatedAt || null,
      loginHistory: data.loginHistory || [],
      isActive: data.isActive !== undefined ? data.isActive : true,
      userType: data.userType || "platform",
    };

    logger.debug("Datos de usuario obtenidos:", userId);
    return user;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Error desconocido";
    logger.error("Error obteniendo datos de usuario:", errorMessage);
    throw error;
  }
};

// Función auxiliar para verificar si un usuario existe
export const checkUserExists = async (userId: string): Promise<boolean> => {
  try {
    const userRef = doc(db, "users", userId);
    const userDoc = await getDoc(userRef);
    const exists = userDoc.exists();

    logger.debug("Verificación de existencia de usuario:", { userId, exists });
    return exists;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Error desconocido";
    logger.error("Error verificando existencia de usuario:", errorMessage);
    return false;
  }
};

// Tipo para actualizaciones de usuario
type UserUpdateData = Partial<
  Omit<PlatformUser, "createdAt" | "lastLoginAt" | "updatedAt" | "loginHistory">
> & {
  updatedAt: FieldValue;
};

// Función para actualizar datos del usuario
export const updateUserData = async (
  userId: string,
  updates: Partial<
    Omit<
      PlatformUser,
      "createdAt" | "lastLoginAt" | "updatedAt" | "loginHistory"
    >
  >
): Promise<void> => {
  if (!userId) {
    throw new Error("ID de usuario requerido");
  }

  try {
    const userRef = doc(db, "users", userId);

    // Si se actualizan roles, también actualizar primaryRole
    if (updates.roles && updates.roles.length > 0) {
      updates.primaryRole = getPrimaryRole(updates.roles);
    }

    const updateData: UserUpdateData = {
      ...updates,
      updatedAt: serverTimestamp(),
    };

    await setDoc(userRef, updateData, { merge: true });

    invalidateUserCache(userId);

    logger.success("Datos de usuario actualizados:", userId);
    logger.object("Campos actualizados", updates);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Error desconocido";
    logger.error("Error actualizando datos de usuario:", errorMessage);
    throw error;
  }
};

// Función para obtener múltiples usuarios por sus IDs
export const getUsersByIds = async (
  userIds: string[]
): Promise<PlatformUser[]> => {
  try {
    logger.info("Obteniendo múltiples usuarios:", userIds.length);

    const users: PlatformUser[] = [];

    for (const userId of userIds) {
      const cachedUser = await getCachedUserData(userId);
      if (cachedUser) {
        users.push(cachedUser);
      } else {
        const user = await getUserData(userId);
        if (user) {
          users.push(user);
        }
      }
    }

    logger.success(`Obtenidos ${users.length} de ${userIds.length} usuarios`);
    return users;
  } catch (error) {
    logger.error("Error obteniendo múltiples usuarios:", error);
    throw error;
  }
};

// Nuevas funciones específicas para roles
export const hasRole = (user: PlatformUser, role: string): boolean => {
  return user.roles.includes(role);
};

export const hasAnyRole = (user: PlatformUser, roles: string[]): boolean => {
  return roles.some((role) => user.roles.includes(role));
};

export const addRoleToUser = async (
  userId: string,
  newRole: string
): Promise<void> => {
  const user = await getCachedUserData(userId);
  if (!user) {
    throw new Error("Usuario no encontrado");
  }

  if (!user.roles.includes(newRole)) {
    const updatedRoles = [...user.roles, newRole];
    await updateUserData(userId, { roles: updatedRoles });
  }
};

export const removeRoleFromUser = async (
  userId: string,
  roleToRemove: string
): Promise<void> => {
  const user = await getCachedUserData(userId);
  if (!user) {
    throw new Error("Usuario no encontrado");
  }

  const updatedRoles = user.roles.filter((role) => role !== roleToRemove);

  if (updatedRoles.length === 0) {
    throw new Error("El usuario debe tener al menos un rol");
  }

  await updateUserData(userId, { roles: updatedRoles });
};

// Helper para UI/components legacy que esperan un solo rol
export const getDisplayRole = (user: PlatformUser): string => {
  return user.primaryRole || getPrimaryRole(user.roles);
};
